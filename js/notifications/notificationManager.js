/**
 * Smart Notifications Manager
 * Core module for managing all notification operations
 */

import { db } from './db.js';
import { todayDate } from './utils.js';

// Default user ID (for single-user app)
const DEFAULT_USER_ID = 'default';

/**
 * Get default notification settings
 */
function getDefaultSettings() {
    return {
        id: 'default',
        userId: DEFAULT_USER_ID,
        enabled: true,

        // Study Reminders
        studyReminders: {
            enabled: true,
            frequency: 'daily',
            customDays: [],
            preferredTimes: ['09:00', '14:00', '20:00'],
            smartTiming: true,
            minGapHours: 4
        },

        // Review Reminders
        reviewReminders: {
            enabled: true,
            advanceNotice: 2, // hours
            batchReviews: true,
            maxPerDay: 5
        },

        // Streak Protection
        streakProtection: {
            enabled: true,
            minStreakDays: 3,
            reminderTimes: ['18:00', '21:00'],
            urgentReminder: true,
            motivationalMessages: true
        },

        // Weekly Summary
        weeklySummary: {
            enabled: true,
            dayOfWeek: 1, // Monday
            time: '09:00',
            includeAnalytics: true,
            includeRecommendations: true
        },

        // Achievement Notifications
        achievements: {
            enabled: true,
            showImmediately: true,
            playSound: true,
            showConfetti: true
        },

        // Daily Goals
        dailyGoals: {
            enabled: true,
            morningMotivation: true,
            eveningCheckIn: true,
            times: {
                morning: '08:00',
                evening: '20:00'
            }
        },

        // Quiet Hours
        quietHours: {
            enabled: false,
            start: '22:00',
            end: '07:00',
            allowUrgent: true
        },

        // Delivery Channels
        channels: {
            browser: true,
            email: false,
            inApp: true
        }
    };
}

/**
 * Initialize notification settings
 */
export async function initNotificationSettings() {
    try {
        const existing = await db.notificationSettings.get('default');

        if (!existing) {
            const defaults = getDefaultSettings();
            await db.notificationSettings.put(defaults);
            console.log('✅ Notification settings initialized');
            return defaults;
        }

        return existing;
    } catch (error) {
        console.error('Error initializing notification settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
    try {
        const settings = await db.notificationSettings.get('default');
        return settings || getDefaultSettings();
    } catch (error) {
        console.error('Error getting notification settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(updates) {
    try {
        const current = await getNotificationSettings();
        const updated = {
            ...current,
            ...updates,
            id: 'default',
            userId: DEFAULT_USER_ID
        };

        await db.notificationSettings.put(updated);
        console.log('✅ Notification settings updated');
        return updated;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return null;
    }
}

/**
 * Create a new notification
 */
export async function createNotification({
    type,
    title,
    body,
    icon = '🔔',
    priority = 'medium',
    scheduledFor = null,
    data = {},
    expiresAt = null
}) {
    try {
        const now = new Date().toISOString();

        const notification = {
            type,
            title,
            body,
            icon,
            priority,
            status: 'pending',
            scheduledFor: scheduledFor || now,
            sentAt: null,
            clickedAt: null,
            data,
            createdAt: now,
            expiresAt,
            userId: DEFAULT_USER_ID
        };

        const id = await db.notifications.add(notification);
        console.log(`📬 Notification created: ${type} (ID: ${id})`);

        return { ...notification, id };
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * Get pending notifications
 */
export async function getPendingNotifications() {
    try {
        const now = new Date().toISOString();

        return await db.notifications
            .where('status').equals('pending')
            .and(n => n.scheduledFor <= now)
            .toArray();
    } catch (error) {
        console.error('Error getting pending notifications:', error);
        return [];
    }
}

/**
 * Get all notifications (for notification center)
 */
export async function getAllNotifications(limit = 50) {
    try {
        return await db.notifications
            .orderBy('createdAt')
            .reverse()
            .limit(limit)
            .toArray();
    } catch (error) {
        console.error('Error getting all notifications:', error);
        return [];
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
    try {
        return await db.notifications
            .where('status').equals('sent')
            .and(n => !n.clickedAt)
            .count();
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
}

/**
 * Mark notification as sent
 */
export async function markAsSent(notificationId) {
    try {
        await db.notifications.update(notificationId, {
            status: 'sent',
            sentAt: new Date().toISOString()
        });

        // Log to history
        await db.notificationHistory.add({
            notificationId,
            sentAt: new Date().toISOString(),
            action: 'sent'
        });

        return true;
    } catch (error) {
        console.error('Error marking notification as sent:', error);
        return false;
    }
}

/**
 * Mark notification as clicked
 */
export async function markAsClicked(notificationId) {
    try {
        await db.notifications.update(notificationId, {
            clickedAt: new Date().toISOString()
        });

        // Log to history
        await db.notificationHistory.add({
            notificationId,
            sentAt: new Date().toISOString(),
            action: 'clicked'
        });

        return true;
    } catch (error) {
        console.error('Error marking notification as clicked:', error);
        return false;
    }
}

/**
 * Mark notification as dismissed
 */
export async function markAsDismissed(notificationId) {
    try {
        await db.notifications.update(notificationId, {
            status: 'dismissed'
        });

        // Log to history
        await db.notificationHistory.add({
            notificationId,
            sentAt: new Date().toISOString(),
            action: 'dismissed'
        });

        return true;
    } catch (error) {
        console.error('Error marking notification as dismissed:', error);
        return false;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead() {
    try {
        const unread = await db.notifications
            .where('status').equals('sent')
            .and(n => !n.clickedAt)
            .toArray();

        for (const notification of unread) {
            await markAsClicked(notification.id);
        }

        console.log(`✅ Marked ${unread.length} notifications as read`);
        return true;
    } catch (error) {
        console.error('Error marking all as read:', error);
        return false;
    }
}

/**
 * Delete old notifications (cleanup)
 */
export async function cleanupOldNotifications(daysToKeep = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoff = cutoffDate.toISOString();

        const deleted = await db.notifications
            .where('createdAt').below(cutoff)
            .delete();

        console.log(`🗑️ Deleted ${deleted} old notifications`);
        return deleted;
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        return 0;
    }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('Notification permission denied');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

/**
 * Check if notifications are supported and permitted
 */
export function canSendNotifications() {
    return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get notification statistics
 */
export async function getNotificationStats() {
    try {
        const all = await db.notifications.toArray();
        const history = await db.notificationHistory.toArray();

        const stats = {
            total: all.length,
            sent: all.filter(n => n.status === 'sent').length,
            clicked: all.filter(n => n.clickedAt).length,
            dismissed: all.filter(n => n.status === 'dismissed').length,
            pending: all.filter(n => n.status === 'pending').length,
            clickRate: 0,
            byType: {},
            byPriority: {}
        };

        // Calculate click rate
        if (stats.sent > 0) {
            stats.clickRate = Math.round((stats.clicked / stats.sent) * 100);
        }

        // Group by type
        all.forEach(n => {
            stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
        });

        // Group by priority
        all.forEach(n => {
            stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
        });

        return stats;
    } catch (error) {
        console.error('Error getting notification stats:', error);
        return null;
    }
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.notificationManager = {
        getSettings: getNotificationSettings,
        updateSettings: updateNotificationSettings,
        createNotification,
        getAllNotifications,
        getUnreadCount,
        markAllAsRead,
        getStats: getNotificationStats,
        requestPermission: requestNotificationPermission
    };
}
