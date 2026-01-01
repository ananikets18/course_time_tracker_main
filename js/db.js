/**
 * Database Layer - Dexie.js + Supabase Hybrid
 * 
 * Architecture:
 * - Dexie.js (IndexedDB): Primary local storage for offline-first
 * - Supabase: Optional cloud sync for multi-device support
 * 
 * Features:
 * - Instant offline performance
 * - Automatic background sync when online
 * - Conflict resolution (last-write-wins)
 * - Multi-tab synchronization
 */

import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

// ============================================
// DATABASE SCHEMA
// ============================================

class CourseTrackerDB extends Dexie {
    constructor() {
        super('CourseTrackerDB');

        this.version(1).stores({
            courses: '++id, title, createdAt, updatedAt',
            appState: 'key', // For storing global state like activeCourseId
            dailyLog: 'date', // For daily watch logs
            syncQueue: '++id, timestamp' // For pending sync operations
        });
    }
}

// Initialize database
export const db = new CourseTrackerDB();

// ============================================
// SUPABASE CONFIGURATION
// ============================================

let supabaseClient = null;
let syncEnabled = false;

/**
 * Initialize Supabase connection
 * @param {string} supabaseUrl - Your Supabase project URL
 * @param {string} supabaseKey - Your Supabase anon key
 */
export async function initSupabase(supabaseUrl, supabaseKey) {
    try {
        // Import Supabase client from CDN
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

        supabaseClient = createClient(supabaseUrl, supabaseKey);
        syncEnabled = true;

        console.log('✅ Supabase initialized - Cloud sync enabled');

        // Start background sync
        startBackgroundSync();

        return true;
    } catch (error) {
        console.warn('⚠️ Supabase initialization failed - Running in offline-only mode', error);
        syncEnabled = false;
        return false;
    }
}

/**
 * Check if Supabase sync is enabled
 */
export function isSyncEnabled() {
    return syncEnabled && supabaseClient !== null;
}

// ============================================
// CORE DATA OPERATIONS
// ============================================

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get current timestamp
 */
function timestamp() {
    return new Date().toISOString();
}

/**
 * Load all courses
 */
export async function loadCourses() {
    try {
        const courses = await db.courses.toArray();
        return courses;
    } catch (error) {
        console.error('Error loading courses:', error);
        return [];
    }
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId) {
    try {
        return await db.courses.get(courseId);
    } catch (error) {
        console.error('Error getting course:', error);
        return null;
    }
}

/**
 * Add a new course
 */
export async function addCourse(title) {
    try {
        const course = {
            id: generateId(),
            title: title || 'New Course',
            sections: [],
            createdAt: timestamp(),
            updatedAt: timestamp()
        };

        await db.courses.add(course);

        // Queue for sync
        if (isSyncEnabled()) {
            await queueSync('create', 'courses', course);
        }

        return course;
    } catch (error) {
        console.error('Error adding course:', error);
        return null;
    }
}

/**
 * Update a course
 */
export async function updateCourse(courseId, updates) {
    try {
        const course = await db.courses.get(courseId);
        if (!course) return false;

        const updatedCourse = {
            ...course,
            ...updates,
            updatedAt: timestamp()
        };

        await db.courses.put(updatedCourse);

        // Queue for sync
        if (isSyncEnabled()) {
            await queueSync('update', 'courses', updatedCourse);
        }

        return true;
    } catch (error) {
        console.error('Error updating course:', error);
        return false;
    }
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId) {
    try {
        await db.courses.delete(courseId);

        // Queue for sync
        if (isSyncEnabled()) {
            await queueSync('delete', 'courses', { id: courseId });
        }

        return true;
    } catch (error) {
        console.error('Error deleting course:', error);
        return false;
    }
}

/**
 * Get app state (activeCourseId, etc.)
 */
export async function getAppState() {
    try {
        const state = await db.appState.get('main');
        return state?.value || null;
    } catch (error) {
        console.error('Error getting app state:', error);
        return null;
    }
}

/**
 * Set app state
 */
export async function setAppState(state) {
    try {
        const appStateObj = { key: 'main', value: state, updatedAt: timestamp() };
        await db.appState.put(appStateObj);

        // Queue for sync
        if (isSyncEnabled()) {
            await queueSync('update', 'appState', appStateObj);
        }

        return true;
    } catch (error) {
        console.error('Error setting app state:', error);
        return false;
    }
}

/**
 * Get daily watch log
 */
export async function getDailyLog(date = null) {
    try {
        const dateKey = date || new Date().toISOString().split('T')[0];
        const log = await db.dailyLog.get(dateKey);
        return log?.data || {};
    } catch (error) {
        console.error('Error getting daily log:', error);
        return {};
    }
}

/**
 * Update daily watch log
 */
export async function updateDailyLog(date, data) {
    try {
        const dateKey = date || new Date().toISOString().split('T')[0];
        const logObj = { date: dateKey, data, updatedAt: timestamp() };
        await db.dailyLog.put(logObj);

        // Queue for sync
        if (isSyncEnabled()) {
            await queueSync('update', 'dailyLog', logObj);
        }

        return true;
    } catch (error) {
        console.error('Error updating daily log:', error);
        return false;
    }
}

/**
 * Get all daily logs (for history)
 */
export async function getAllDailyLogs() {
    try {
        const logs = await db.dailyLog.toArray();
        return logs.reduce((acc, log) => {
            acc[log.date] = log.data;
            return acc;
        }, {});
    } catch (error) {
        console.error('Error getting all daily logs:', error);
        return {};
    }
}

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Queue an operation for sync
 */
async function queueSync(operation, table, data) {
    try {
        await db.syncQueue.add({
            operation,
            table,
            data,
            timestamp: timestamp(),
            synced: 0
        });
    } catch (error) {
        console.error('Error queuing sync:', error);
    }
}

/**
 * Process sync queue
 */
async function processSyncQueue() {
    if (!isSyncEnabled()) return;

    try {
        const pending = await db.syncQueue.filter(item => !item.synced).toArray();

        if (pending.length === 0) return;

        console.log(`🔄 Syncing ${pending.length} operations...`);

        for (const item of pending) {
            try {
                await syncToSupabase(item);

                // Mark as synced
                await db.syncQueue.update(item.id, { synced: 1 });
            } catch (error) {
                console.error('Sync failed for item:', item, error);
                // Keep in queue for retry
            }
        }

        // Clean up old synced items (keep last 100)
        const synced = await db.syncQueue.filter(item => item.synced).toArray();
        if (synced.length > 100) {
            const toDelete = synced.slice(0, synced.length - 100);
            await db.syncQueue.bulkDelete(toDelete.map(item => item.id));
        }

    } catch (error) {
        console.error('Error processing sync queue:', error);
    }
}

/**
 * Sync item to Supabase
 */
async function syncToSupabase(item) {
    if (!supabaseClient) return;

    const { operation, table, data } = item;

    switch (operation) {
        case 'create':
            await supabaseClient.from(table).insert(data);
            break;
        case 'update':
            await supabaseClient.from(table).upsert(data);
            break;
        case 'delete':
            await supabaseClient.from(table).delete().eq('id', data.id);
            break;
    }
}

/**
 * Pull data from Supabase (initial sync)
 */
export async function pullFromSupabase() {
    if (!isSyncEnabled()) {
        console.log('ℹ️ Sync disabled - skipping pull');
        return false;
    }

    try {
        console.log('⬇️ Pulling data from Supabase...');

        // Pull courses
        const { data: courses, error: coursesError } = await supabaseClient
            .from('courses')
            .select('*');

        if (coursesError) throw coursesError;

        if (courses && courses.length > 0) {
            await db.courses.bulkPut(courses);
            console.log(`✅ Synced ${courses.length} courses from cloud`);
        }

        // Pull app state
        const { data: appState, error: stateError } = await supabaseClient
            .from('appState')
            .select('*')
            .eq('key', 'main')
            .single();

        if (!stateError && appState) {
            await db.appState.put(appState);
            console.log('✅ Synced app state from cloud');
        }

        // Pull daily logs
        const { data: dailyLogs, error: logsError } = await supabaseClient
            .from('dailyLog')
            .select('*');

        if (!logsError && dailyLogs && dailyLogs.length > 0) {
            await db.dailyLog.bulkPut(dailyLogs);
            console.log(`✅ Synced ${dailyLogs.length} daily logs from cloud`);
        }

        return true;
    } catch (error) {
        console.error('Error pulling from Supabase:', error);
        return false;
    }
}

/**
 * Push all local data to Supabase (initial sync)
 */
export async function pushToSupabase() {
    if (!isSyncEnabled()) {
        console.log('ℹ️ Sync disabled - skipping push');
        return false;
    }

    try {
        console.log('⬆️ Pushing data to Supabase...');

        // Push courses
        const courses = await db.courses.toArray();
        if (courses.length > 0) {
            await supabaseClient.from('courses').upsert(courses);
            console.log(`✅ Pushed ${courses.length} courses to cloud`);
        }

        // Push app state
        const appState = await db.appState.get('main');
        if (appState) {
            await supabaseClient.from('appState').upsert(appState);
            console.log('✅ Pushed app state to cloud');
        }

        // Push daily logs
        const dailyLogs = await db.dailyLog.toArray();
        if (dailyLogs.length > 0) {
            await supabaseClient.from('dailyLog').upsert(dailyLogs);
            console.log(`✅ Pushed ${dailyLogs.length} daily logs to cloud`);
        }

        return true;
    } catch (error) {
        console.error('Error pushing to Supabase:', error);
        return false;
    }
}

/**
 * Start background sync (runs every 30 seconds when online)
 */
function startBackgroundSync() {
    // Process sync queue every 30 seconds
    setInterval(() => {
        if (navigator.onLine && isSyncEnabled()) {
            processSyncQueue();
        }
    }, 30000);

    // Sync when coming back online
    window.addEventListener('online', () => {
        console.log('🌐 Back online - syncing...');
        processSyncQueue();
    });

    // Initial sync
    if (navigator.onLine) {
        processSyncQueue();
    }
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Export all data as JSON
 */
export async function exportData() {
    try {
        const courses = await db.courses.toArray();
        const appState = await db.appState.get('main');
        const dailyLogs = await db.dailyLog.toArray();

        return JSON.stringify({
            courses,
            appState: appState?.value || null,
            dailyLog: dailyLogs.reduce((acc, log) => {
                acc[log.date] = log.data;
                return acc;
            }, {}),
            exportedAt: timestamp()
        }, null, 2);
    } catch (error) {
        console.error('Error exporting data:', error);
        return null;
    }
}

/**
 * Import data from JSON
 */
export async function importData(jsonString) {
    try {
        const data = JSON.parse(jsonString);

        // Import courses
        if (data.courses && Array.isArray(data.courses)) {
            await db.courses.bulkPut(data.courses);
        }

        // Import app state
        if (data.appState) {
            await db.appState.put({ key: 'main', value: data.appState });
        }

        // Import daily logs
        if (data.dailyLog) {
            const logs = Object.entries(data.dailyLog).map(([date, logData]) => ({
                date,
                data: logData
            }));
            await db.dailyLog.bulkPut(logs);
        }

        console.log('✅ Data imported successfully');
        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        return false;
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize database with default data if empty
 */
export async function initializeDB() {
    try {
        const courses = await db.courses.toArray();

        // If no courses exist, create a default one
        if (courses.length === 0) {
            const defaultCourse = await addCourse('My First Course');
            await setAppState({
                activeCourseId: defaultCourse.id,
                dailyWatchLog: {}
            });
            console.log('✅ Initialized with default course');
        }

        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        return false;
    }
}

/**
 * Save push subscription to Supabase
 */
export async function savePushSubscription(subscription) {
    if (!isSyncEnabled()) {
        console.log('ℹ️ Sync disabled - cannot save push subscription');
        return false;
    }

    try {
        // We assume a 'push_subscriptions' table exists
        // If not, this will fail, but that's expected if the backend isn't set up
        const { error } = await supabaseClient
            .from('push_subscriptions')
            .upsert({
                subscription: subscription,
                user_agent: navigator.userAgent,
                updated_at: timestamp()
            });

        if (error) throw error;

        console.log('✅ Push subscription saved to cloud');
        return true;
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return false;
    }
}
