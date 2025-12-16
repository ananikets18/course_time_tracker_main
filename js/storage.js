/**
 * Storage Layer - Compatibility wrapper for Dexie.js
 * 
 * This file maintains backward compatibility with the existing codebase
 * while using the new Dexie.js + Supabase backend
 */

import {
  db,
  initializeDB,
  loadCourses,
  getCourse,
  addCourse as dbAddCourse,
  updateCourse,
  deleteCourse as dbDeleteCourse,
  getAppState,
  setAppState,
  getDailyLog,
  updateDailyLog,
  getAllDailyLogs,
  exportData as dbExportData,
  importData as dbImportData,
  initSupabase,
  isSyncEnabled,
  pullFromSupabase,
  pushToSupabase
} from './db.js';

// ============================================
// GLOBAL STATE (for backward compatibility)
// ============================================

export let course = { title: 'Course', sections: [] };
export let dailyWatchLog = {};

let appState = {
  courses: [],
  activeCourseId: null,
  dailyWatchLog: {}
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load data from IndexedDB
 */
export async function load() {
  try {
    // Initialize DB if needed
    await initializeDB();

    // Load courses
    const courses = await loadCourses();
    appState.courses = courses;

    // Load app state
    const state = await getAppState();
    if (state) {
      appState.activeCourseId = state.activeCourseId;
      appState.dailyWatchLog = state.dailyWatchLog || {};
    } else if (courses.length > 0) {
      // Set first course as active if no state exists
      appState.activeCourseId = courses[0].id;
      await setAppState(appState);
    }

    // Load daily logs from dailyLog table (primary source)
    const logs = await getAllDailyLogs();

    // Merge with appState logs (for backward compatibility during migration)
    // dailyLog table takes precedence, but we keep appState data if not in dailyLog
    const mergedLogs = { ...appState.dailyWatchLog, ...logs };

    dailyWatchLog = mergedLogs;
    appState.dailyWatchLog = mergedLogs;

    // Sync bindings
    syncBindings();

    console.log('✅ Data loaded from IndexedDB');

    // Try to migrate from localStorage if exists
    await migrateFromLocalStorage();

  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to fresh state
    initFreshState();
  }
}

/**
 * Save data to IndexedDB
 */
export async function save() {
  try {
    // Update app state
    await setAppState({
      activeCourseId: appState.activeCourseId,
      dailyWatchLog: dailyWatchLog
    });

    // Update active course if modified
    if (course && course.id) {
      await updateCourse(course.id, course);
    }

    // CRITICAL FIX: Save each daily log entry to the dailyLog table
    // This ensures data persists across page refreshes
    for (const [date, seconds] of Object.entries(dailyWatchLog)) {
      if (seconds !== undefined && seconds !== null) {
        await updateDailyLog(date, seconds);
      }
    }

  } catch (error) {
    console.error('Error saving data:', error);
  }
}

/**
 * Initialize fresh state
 */
function initFreshState() {
  const newId = generateId();
  appState = {
    courses: [{ id: newId, title: 'My First Course', sections: [] }],
    activeCourseId: newId,
    dailyWatchLog: {}
  };
  syncBindings();
}

/**
 * Sync bindings for backward compatibility
 */
function syncBindings() {
  dailyWatchLog = appState.dailyWatchLog || {};

  // Find active course
  let active = appState.courses.find(c => c.id === appState.activeCourseId);

  // Fallback if ID not found
  if (!active && appState.courses.length > 0) {
    active = appState.courses[0];
    appState.activeCourseId = active.id;
  } else if (!active) {
    // No courses at all? Create one.
    initFreshState();
    active = appState.courses[0];
  }

  course = active;
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// COURSE MANAGEMENT
// ============================================

/**
 * Get list of all courses
 */
export function getCoursesList() {
  return appState.courses.map(c => ({ id: c.id, title: c.title }));
}

/**
 * Get active course ID
 */
export function getActiveCourseId() {
  return appState.activeCourseId;
}

/**
 * Switch to a different course
 */
export async function switchCourse(courseId) {
  const target = appState.courses.find(c => c.id === courseId);
  if (target) {
    appState.activeCourseId = courseId;
    syncBindings();
    await save();
    return true;
  }
  return false;
}

/**
 * Add a new course
 */
export async function addNewCourse(title) {
  try {
    const newCourse = await dbAddCourse(title);
    if (newCourse) {
      appState.courses.push(newCourse);
      appState.activeCourseId = newCourse.id;
      syncBindings();
      await save();
      return newCourse;
    }
    return null;
  } catch (error) {
    console.error('Error adding course:', error);
    return null;
  }
}

/**
 * Delete a course
 */
export async function deleteCourse(courseId) {
  if (appState.courses.length <= 1) {
    return false; // Cannot delete the last course
  }

  try {
    await dbDeleteCourse(courseId);
    appState.courses = appState.courses.filter(c => c.id !== courseId);

    // If we deleted the active course, switch to the first available
    if (appState.activeCourseId === courseId) {
      appState.activeCourseId = appState.courses[0].id;
    }

    syncBindings();
    await save();
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    return false;
  }
}

/**
 * Rename a course
 */
export async function renameCourse(courseId, newTitle) {
  try {
    const success = await updateCourse(courseId, { title: newTitle });
    if (success) {
      const c = appState.courses.find(c => c.id === courseId);
      if (c) {
        c.title = newTitle;
        syncBindings();
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error renaming course:', error);
    return false;
  }
}

// ============================================
// LEGACY SETTERS (for backward compatibility)
// ============================================

/**
 * Set course data (legacy)
 */
export async function setCourse(newCourse) {
  const idx = appState.courses.findIndex(c => c.id === appState.activeCourseId);
  if (idx !== -1) {
    appState.courses[idx] = newCourse;
    course = newCourse;
    await save();
  }
}

/**
 * Set daily watch log (legacy)
 */
export async function setDailyWatchLog(newLog) {
  dailyWatchLog = newLog;
  appState.dailyWatchLog = newLog;
  await save();
}

// ============================================
// IMPORT/EXPORT
// ============================================

/**
 * Export all data as JSON
 */
export async function exportData() {
  return await dbExportData();
}

/**
 * Import data from JSON
 */
export async function importData(jsonString) {
  try {
    const success = await dbImportData(jsonString);
    if (success) {
      // Reload data
      await load();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}

// ============================================
// SUPABASE SYNC
// ============================================

/**
 * Initialize Supabase sync
 */
export async function enableSync(supabaseUrl, supabaseKey) {
  return await initSupabase(supabaseUrl, supabaseKey);
}

/**
 * Check if sync is enabled
 */
export function getSyncStatus() {
  return isSyncEnabled();
}

/**
 * Pull data from cloud
 */
export async function syncFromCloud() {
  const success = await pullFromSupabase();
  if (success) {
    await load(); // Reload local data
  }
  return success;
}

/**
 * Push data to cloud
 */
export async function syncToCloud() {
  return await pushToSupabase();
}

// ============================================
// MIGRATION FROM LOCALSTORAGE
// ============================================

/**
 * Migrate data from old localStorage format
 */
async function migrateFromLocalStorage() {
  const LS_KEY = 'ctt:v1';
  const raw = localStorage.getItem(LS_KEY);

  if (!raw) return; // No old data to migrate

  try {
    const parsed = JSON.parse(raw);

    // Check if we already have data in IndexedDB
    const existingCourses = await loadCourses();
    if (existingCourses.length > 0) {
      console.log('ℹ️ IndexedDB already has data, skipping migration');
      return;
    }

    console.log('🔄 Migrating data from localStorage to IndexedDB...');

    let coursesToMigrate = [];
    let dailyLogToMigrate = {};
    let activeId = null;

    // Check if it's the new format (has 'courses' array)
    if (parsed.courses && Array.isArray(parsed.courses)) {
      coursesToMigrate = parsed.courses;
      dailyLogToMigrate = parsed.dailyWatchLog || {};
      activeId = parsed.activeCourseId;
    } else {
      // Old format - single course
      const oldCourse = parsed.course || { title: 'My First Course', sections: [] };
      const newId = generateId();
      coursesToMigrate = [{
        ...oldCourse,
        id: newId,
        title: oldCourse.title || 'My First Course',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
      dailyLogToMigrate = parsed.dailyWatchLog || {};
      activeId = newId;
    }

    // Migrate courses
    for (const courseData of coursesToMigrate) {
      await dbAddCourse(courseData.title);
    }

    // Migrate daily logs
    for (const [date, logData] of Object.entries(dailyLogToMigrate)) {
      await updateDailyLog(date, logData);
    }

    // Set active course
    await setAppState({
      activeCourseId: activeId,
      dailyWatchLog: dailyLogToMigrate
    });

    console.log('✅ Migration complete!');

    // Backup old data and clear localStorage
    localStorage.setItem(LS_KEY + ':backup', raw);
    localStorage.removeItem(LS_KEY);
    console.log('💾 Old data backed up to localStorage (ctt:v1:backup)');

    // Reload data
    await load();

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// ============================================
// EXPOSE TO WINDOW FOR DEBUGGING
// ============================================

if (typeof window !== 'undefined') {
  window.courseTrackerDB = {
    db,
    exportData,
    importData,
    enableSync,
    getSyncStatus,
    syncFromCloud,
    syncToCloud
  };
  console.log('🔧 Debug tools available: window.courseTrackerDB');
}
