/**
 * Smart Notifications - Demo & Testing
 * Use this file to test the notification system
 */

import {
    initNotificationSettings,
    createNotification,
    getAllNotifications,
    getUnreadCount,
    markAllAsRead,
    requestNotificationPermission,
    getNotificationStats
} from './notifications/notificationManager.js';
import { notificationScheduler } from './notifications/notificationScheduler.js';
import { learningAnalytics } from './notifications/learningAnalytics.js';

/**
 * Initialize and test the notification system
 */
export async function testNotificationSystem() {
    console.log('🧪 Testing Smart Notifications System...\n');

    // 1. Initialize settings
    console.log('1️⃣ Initializing settings...');
    const settings = await initNotificationSettings();
    console.log('✅ Settings initialized:', settings.enabled ? 'Enabled' : 'Disabled');

    // 2. Request permission
    console.log('\n2️⃣ Requesting browser permission...');
    const hasPermission = await requestNotificationPermission();
    console.log(hasPermission ? '✅ Permission granted' : '❌ Permission denied');

    // 3. Create test notifications
    console.log('\n3️⃣ Creating test notifications...');

    // Study reminder
    await createNotification({
        type: 'study_reminder',
        title: '📚 Time to Learn!',
        body: 'Ready to continue your course? You\'ve got this!',
        priority: 'medium',
        data: { todayProgress: 15, goal: 30 }
    });
    console.log('✅ Study reminder created');

    // Streak protection
    await createNotification({
        type: 'streak_protection',
        title: '🔥 Streak Alert!',
        body: 'Don\'t break your 7-day streak! Study for just 30 minutes today.',
        priority: 'high',
        data: { streakDays: 7, urgent: false }
    });
    console.log('✅ Streak protection created');

    // Achievement
    await createNotification({
        type: 'achievement',
        title: '🏆 Achievement Unlocked!',
        body: '🔥 Week Warrior: Maintain a 7-day streak',
        priority: 'high',
        data: {
            achievement: {
                id: 'week_warrior',
                name: 'Week Warrior',
                icon: '🔥'
            }
        }
    });
    console.log('✅ Achievement notification created');

    // 4. Check notifications
    console.log('\n4️⃣ Checking notifications...');
    const all = await getAllNotifications();
    console.log(`✅ Total notifications: ${all.length}`);

    const unread = await getUnreadCount();
    console.log(`📬 Unread: ${unread}`);

    // 5. Get statistics
    console.log('\n5️⃣ Getting statistics...');
    const stats = await getNotificationStats();
    console.log('📊 Stats:', stats);

    // 6. Test learning analytics
    console.log('\n6️⃣ Testing learning analytics...');

    // Analyze patterns
    await learningAnalytics.analyzeLearningPatterns();
    console.log('✅ Patterns analyzed');

    // Get recommended times
    const recommendedTimes = await learningAnalytics.getRecommendedTimes(3);
    console.log('🎯 Recommended study times:', recommendedTimes);

    // Get insights
    const insights = await learningAnalytics.getLearningInsights();
    console.log('💡 Learning insights:', insights);

    // 7. Test scheduler
    console.log('\n7️⃣ Testing scheduler...');
    console.log('📅 Scheduler status:', notificationScheduler.isRunning ? 'Running' : 'Stopped');

    console.log('\n✅ All tests completed!\n');
    console.log('💡 Tips:');
    console.log('- Check browser notifications (should appear in a few seconds)');
    console.log('- Open DevTools Console to see detailed logs');
    console.log('- Use window.notificationManager for debugging');
    console.log('- Use window.learningAnalytics for pattern analysis');
}

/**
 * Create sample notifications for demo
 */
export async function createSampleNotifications() {
    const samples = [
        {
            type: 'study_reminder',
            title: '☀️ Good Morning!',
            body: 'Today\'s goal: 2 videos, 30 minutes. You got this!',
            priority: 'low',
            data: { type: 'morning' }
        },
        {
            type: 'review_due',
            title: '🧠 Reviews Ready!',
            body: '3 videos ready for review: React Basics, JavaScript ES6, CSS Grid',
            priority: 'high',
            data: { count: 3 }
        },
        {
            type: 'daily_goal',
            title: '🌙 Evening Check-In',
            body: '75% complete! Just a bit more to reach your goal.',
            priority: 'low',
            data: { progress: 75 }
        },
        {
            type: 'weekly_summary',
            title: '📊 Your Weekly Learning Report',
            body: '180 minutes studied, 12 videos completed. Great work!',
            priority: 'medium',
            data: { totalMinutes: 180, videosCompleted: 12 }
        }
    ];

    console.log('📝 Creating sample notifications...');

    for (const sample of samples) {
        await createNotification(sample);
    }

    console.log(`✅ Created ${samples.length} sample notifications`);
}

/**
 * Clear all notifications (for testing)
 */
export async function clearAllNotifications() {
    const { db } = await import('./db.js');

    const count = await db.notifications.count();
    await db.notifications.clear();

    console.log(`🗑️ Cleared ${count} notifications`);
}

/**
 * Show notification system status
 */
export async function showNotificationStatus() {
    console.log('📊 Notification System Status\n');
    console.log('================================\n');

    // Settings
    const settings = await initNotificationSettings();
    console.log('⚙️ Settings:');
    console.log(`  - Enabled: ${settings.enabled}`);
    console.log(`  - Study Reminders: ${settings.studyReminders.enabled}`);
    console.log(`  - Streak Protection: ${settings.streakProtection.enabled}`);
    console.log(`  - Quiet Hours: ${settings.quietHours.enabled}`);

    // Permission
    console.log('\n🔔 Browser Permission:', Notification.permission);

    // Stats
    const stats = await getNotificationStats();
    console.log('\n📈 Statistics:');
    console.log(`  - Total: ${stats.total}`);
    console.log(`  - Sent: ${stats.sent}`);
    console.log(`  - Clicked: ${stats.clicked}`);
    console.log(`  - Click Rate: ${stats.clickRate}%`);

    // Scheduler
    console.log('\n📅 Scheduler:', notificationScheduler.isRunning ? 'Running ✅' : 'Stopped ❌');

    // Learning Analytics
    const insights = await learningAnalytics.getLearningInsights();
    if (insights && insights.mostProductiveDay) {
        console.log('\n💡 Learning Insights:');
        console.log(`  - Most Productive Day: ${insights.mostProductiveDay.dayName}`);
        console.log(`  - Most Productive Hour: ${insights.mostProductiveHour.time}`);
        console.log(`  - Total Minutes Tracked: ${insights.totalMinutesTracked}`);
    }

    console.log('\n================================\n');
}

// Expose functions to window for easy testing
if (typeof window !== 'undefined') {
    window.notificationTests = {
        test: testNotificationSystem,
        createSamples: createSampleNotifications,
        clearAll: clearAllNotifications,
        showStatus: showNotificationStatus
    };

    console.log('🧪 Notification tests available:');
    console.log('  - window.notificationTests.test()');
    console.log('  - window.notificationTests.createSamples()');
    console.log('  - window.notificationTests.clearAll()');
    console.log('  - window.notificationTests.showStatus()');
}
