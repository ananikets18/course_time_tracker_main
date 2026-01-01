/**
 * Notification Scheduler
 * Background worker that checks and sends scheduled notifications
 */

import { db } from '../db.js';
import {
    getNotificationSettings,
    getPendingNotifications,
    markAsSent,
    markAsClicked,
    canSendNotifications
} from './notificationManager.js';
import { switchCourse } from '../storage.js';

class NotificationScheduler {
    constructor() {
        this.checkInterval = 60000; // Check every minute
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * Start the scheduler
     */
    start() {
        if (this.isRunning) {
            console.warn('⚠️ Scheduler already running');
            return;
        }

        console.log('📅 Notification scheduler started');
        this.isRunning = true;

        // Check immediately
        this.checkScheduledNotifications();

        // Then check every minute
        this.intervalId = setInterval(() => {
            this.checkScheduledNotifications();
        }, this.checkInterval);
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('📅 Notification scheduler stopped');
        }
    }

    /**
     * Check and send scheduled notifications
     */
    async checkScheduledNotifications() {
        try {
            const pending = await getPendingNotifications();

            if (pending.length === 0) return;

            console.log(`📬 Found ${pending.length} pending notifications`);

            for (const notification of pending) {
                await this.sendNotification(notification);
            }
        } catch (error) {
            console.error('Error checking scheduled notifications:', error);
        }
    }

    /**
     * Send a notification
     */
    async sendNotification(notification) {
        const settings = await getNotificationSettings();

        // Check if notifications are globally disabled
        if (!settings.enabled) {
            console.log('ℹ️ Notifications disabled - skipping');
            return;
        }

        // Check quiet hours
        if (this.isQuietHours(settings) && notification.priority !== 'urgent') {
            console.log('🌙 Quiet hours - rescheduling notification');
            await this.rescheduleAfterQuietHours(notification);
            return;
        }

        try {
            // Send via enabled channels
            if (settings.channels.browser && canSendNotifications()) {
                await this.sendBrowserNotification(notification);
            }

            if (settings.channels.inApp) {
                await this.addToNotificationCenter(notification);
            }

            // Mark as sent
            await markAsSent(notification.id);

            console.log(`✅ Notification sent: ${notification.title}`);
        } catch (error) {
            console.error('Failed to send notification:', error);

            await db.notifications.update(notification.id, {
                status: 'failed'
            });
        }
    }

    /**
     * Send browser push notification
     */
    async sendBrowserNotification(notification) {
        if (!canSendNotifications()) {
            console.warn('Browser notifications not permitted');
            return;
        }

        const options = {
            body: notification.body,
            icon: notification.icon || '/assets/icon-192.png',
            badge: '/assets/icon-192.png',
            tag: `notification-${notification.id}`,
            requireInteraction: notification.priority === 'urgent',
            data: {
                notificationId: notification.id,
                type: notification.type,
                ...notification.data
            }
        };

        const browserNotification = new Notification(notification.title, options);

        browserNotification.onclick = () => {
            this.handleNotificationClick(notification);
            browserNotification.close();
        };

        // Auto-close after 10 seconds (except urgent)
        if (notification.priority !== 'urgent') {
            setTimeout(() => {
                browserNotification.close();
            }, 10000);
        }
    }

    /**
     * Add to in-app notification center
     */
    async addToNotificationCenter(notification) {
        // The notification is already in the database
        // Just trigger UI update
        this.updateNotificationUI();
    }

    /**
     * Handle notification click
     */
    async handleNotificationClick(notification) {
        // Mark as clicked
        await markAsClicked(notification.id);

        // Focus window
        window.focus();

        // Handle type-specific actions
        switch (notification.type) {
            case 'study_reminder':
                // Just focus on app
                break;

            case 'review_due':
                // Navigate to reviews
                if (notification.data.courseId) {
                    await switchCourse(notification.data.courseId);
                    window.location.reload();
                }
                break;

            case 'streak_protection':
                // Open app
                break;

            case 'achievement':
                // Show achievement modal
                if (window.showAchievementModal && notification.data.achievement) {
                    window.showAchievementModal(notification.data.achievement);
                }
                break;

            case 'daily_goal':
                // Focus on app
                break;

            case 'weekly_summary':
                // Could open a summary modal
                break;
        }

        // Update UI
        this.updateNotificationUI();
    }

    /**
     * Check if currently in quiet hours
     */
    isQuietHours(settings) {
        if (!settings.quietHours.enabled) return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

        const quietStart = startHour * 60 + startMin;
        const quietEnd = endHour * 60 + endMin;

        if (quietStart < quietEnd) {
            // Normal case: 22:00 to 07:00 next day
            return currentTime >= quietStart && currentTime < quietEnd;
        } else {
            // Quiet hours span midnight
            return currentTime >= quietStart || currentTime < quietEnd;
        }
    }

    /**
     * Reschedule notification after quiet hours
     */
    async rescheduleAfterQuietHours(notification) {
        const settings = await getNotificationSettings();
        const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

        const tomorrow = new Date();
        tomorrow.setHours(endHour, endMin, 0, 0);

        // If end time is earlier than now, it means tomorrow
        if (tomorrow <= new Date()) {
            tomorrow.setDate(tomorrow.getDate() + 1);
        }

        await db.notifications.update(notification.id, {
            scheduledFor: tomorrow.toISOString()
        });

        console.log(`🌙 Rescheduled notification to ${tomorrow.toLocaleTimeString()}`);
    }

    /**
     * Update notification UI (badge count, etc.)
     */
    updateNotificationUI() {
        // Dispatch custom event for UI to listen to
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    }
}

// Create singleton instance
export const notificationScheduler = new NotificationScheduler();

// Auto-start scheduler when module loads
if (typeof window !== 'undefined') {
    // Start after a short delay to ensure everything is initialized
    setTimeout(() => {
        notificationScheduler.start();
    }, 2000);

    // Expose for debugging
    window.notificationScheduler = notificationScheduler;
}
