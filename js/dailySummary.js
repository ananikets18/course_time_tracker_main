/**
 * Daily Summary & Smart Recommendations System
 * Analyzes learning patterns and provides intelligent suggestions
 */

import { course, dailyWatchLog } from "./storage.js";
import { todayDate, secondsToMinutesLabel } from "./utils.js";
import { calculateStreak } from "./streakSystem.js";
import { getDueReviews } from "./spacedRepetition.js";

/**
 * Get today's learning summary
 */
export function getTodaySummary() {
    const today = todayDate();
    const todaySeconds = dailyWatchLog[today] || 0;

    // Count videos completed today
    let videosCompletedToday = 0;
    let videosStartedToday = 0;

    course.sections.forEach(section => {
        section.videos.forEach(video => {
            if (video.completedDate === today) {
                videosCompletedToday++;
            }
            // Check if video has progress but not completed
            if (video.watched > 0 && video.watched < video.length && !video.completedDate) {
                videosStartedToday++;
            }
        });
    });

    const streak = calculateStreak();

    return {
        timeSpent: todaySeconds,
        timeSpentLabel: secondsToMinutesLabel(todaySeconds),
        videosCompleted: videosCompletedToday,
        videosInProgress: videosStartedToday,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        isNewRecord: streak.current === streak.longest && streak.current > 1
    };
}

/**
 * Analyze course progress and generate insights
 */
export function analyzeCourseProgress() {
    let totalVideos = 0;
    let completedVideos = 0;
    let inProgressVideos = 0;
    let notStartedVideos = 0;
    let totalDuration = 0;
    let watchedDuration = 0;

    course.sections.forEach(section => {
        section.videos.forEach(video => {
            totalVideos++;
            totalDuration += video.length || 0;
            watchedDuration += Math.min(video.watched || 0, video.length || 0);

            if (video.watched >= video.length) {
                completedVideos++;
            } else if (video.watched > 0) {
                inProgressVideos++;
            } else {
                notStartedVideos++;
            }
        });
    });

    const completionRate = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    const timeCompletionRate = totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0;

    return {
        totalVideos,
        completedVideos,
        inProgressVideos,
        notStartedVideos,
        completionRate,
        timeCompletionRate,
        totalDuration,
        watchedDuration,
        remainingDuration: totalDuration - watchedDuration
    };
}

/**
 * Generate smart recommendations based on learning patterns
 */
export function generateRecommendations() {
    const recommendations = [];
    const progress = analyzeCourseProgress();
    const dueReviews = getDueReviews();
    const today = todayDate();
    const todaySeconds = dailyWatchLog[today] || 0;

    // Priority 1: Reviews due (spaced repetition)
    if (dueReviews.length > 0) {
        recommendations.push({
            priority: 'high',
            type: 'review',
            icon: '💡',
            title: 'Review Due Videos',
            description: `You have ${dueReviews.length} video${dueReviews.length > 1 ? 's' : ''} ready for review. Reviewing helps retention!`,
            action: 'Review Now',
            videos: dueReviews.slice(0, 3) // Top 3 due reviews
        });
    }

    // Priority 2: Continue in-progress videos
    const inProgressVideos = [];
    course.sections.forEach((section, si) => {
        section.videos.forEach((video, vi) => {
            if (video.watched > 0 && video.watched < video.length) {
                const progressPercent = Math.round((video.watched / video.length) * 100);
                inProgressVideos.push({
                    sectionIndex: si,
                    videoIndex: vi,
                    sectionTitle: section.title,
                    title: video.title,
                    progress: progressPercent,
                    remaining: video.length - video.watched,
                    lastWatched: video.lastWatchedDate || null
                });
            }
        });
    });

    // Sort by progress (highest first - almost done videos)
    inProgressVideos.sort((a, b) => b.progress - a.progress);

    if (inProgressVideos.length > 0) {
        const topVideo = inProgressVideos[0];
        recommendations.push({
            priority: 'high',
            type: 'continue',
            icon: '▶️',
            title: 'Continue Where You Left Off',
            description: `"${topVideo.title}" is ${topVideo.progress}% complete. Just ${secondsToMinutesLabel(topVideo.remaining)} to finish!`,
            action: 'Continue',
            videos: inProgressVideos.slice(0, 3)
        });
    }

    // Priority 3: Start next video in sequence
    const nextUnstartedVideo = findNextUnstartedVideo();
    if (nextUnstartedVideo) {
        recommendations.push({
            priority: 'medium',
            type: 'start',
            icon: '🎯',
            title: 'Start Next Video',
            description: `Begin "${nextUnstartedVideo.title}" in ${nextUnstartedVideo.sectionTitle}`,
            action: 'Start Now',
            videos: [nextUnstartedVideo]
        });
    }

    // Priority 4: Daily goal reminder
    if (todaySeconds < 1800) { // Less than 30 minutes
        recommendations.push({
            priority: 'medium',
            type: 'goal',
            icon: '⏰',
            title: 'Reach Your Daily Goal',
            description: `You've studied for ${secondsToMinutesLabel(todaySeconds)} today. Keep the momentum going!`,
            action: 'Set Goal'
        });
    }

    // Priority 5: Streak maintenance
    const streak = calculateStreak();
    if (streak.current >= 3 && todaySeconds === 0) {
        recommendations.push({
            priority: 'high',
            type: 'streak',
            icon: '🔥',
            title: 'Maintain Your Streak!',
            description: `You're on a ${streak.current}-day streak! Don't break it today.`,
            action: 'Start Learning'
        });
    }

    // Priority 6: Course completion milestone
    if (progress.completionRate >= 75 && progress.completionRate < 100) {
        recommendations.push({
            priority: 'medium',
            type: 'milestone',
            icon: '🏆',
            title: 'Almost There!',
            description: `You're ${progress.completionRate}% done! Only ${progress.notStartedVideos + progress.inProgressVideos} videos left.`,
            action: 'Finish Strong'
        });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations.slice(0, 4); // Return top 4 recommendations
}

/**
 * Find the next logical video to start
 */
function findNextUnstartedVideo() {
    for (let si = 0; si < course.sections.length; si++) {
        const section = course.sections[si];
        for (let vi = 0; vi < section.videos.length; vi++) {
            const video = section.videos[vi];
            if (video.watched === 0 || !video.watched) {
                return {
                    sectionIndex: si,
                    videoIndex: vi,
                    sectionTitle: section.title,
                    title: video.title,
                    duration: video.length
                };
            }
        }
    }
    return null;
}

/**
 * Get motivational message based on progress
 */
export function getMotivationalMessage() {
    const progress = analyzeCourseProgress();
    const summary = getTodaySummary();
    const streak = calculateStreak();

    // Completion-based messages
    if (progress.completionRate === 100) {
        return {
            icon: '🎉',
            message: 'Congratulations! You\'ve completed the entire course!',
            type: 'success'
        };
    }

    if (progress.completionRate >= 90) {
        return {
            icon: '🌟',
            message: 'You\'re in the final stretch! Keep pushing!',
            type: 'success'
        };
    }

    if (progress.completionRate >= 75) {
        return {
            icon: '💪',
            message: 'Great progress! You\'re three-quarters done!',
            type: 'success'
        };
    }

    if (progress.completionRate >= 50) {
        return {
            icon: '🚀',
            message: 'Halfway there! You\'re doing amazing!',
            type: 'info'
        };
    }

    if (progress.completionRate >= 25) {
        return {
            icon: '📈',
            message: 'Solid start! Keep the momentum going!',
            type: 'info'
        };
    }

    // Streak-based messages
    if (streak.current >= 7) {
        return {
            icon: '🔥',
            message: `${streak.current}-day streak! You\'re on fire!`,
            type: 'success'
        };
    }

    if (streak.current >= 3) {
        return {
            icon: '⚡',
            message: 'Consistency is key! Keep it up!',
            type: 'info'
        };
    }

    // Today's activity
    if (summary.videosCompleted >= 3) {
        return {
            icon: '🎯',
            message: `${summary.videosCompleted} videos today! Excellent work!`,
            type: 'success'
        };
    }

    if (summary.timeSpent >= 3600) { // 1 hour
        return {
            icon: '⏰',
            message: 'Over an hour of learning today! Impressive!',
            type: 'success'
        };
    }

    // Default encouraging message
    return {
        icon: '💡',
        message: 'Every step forward is progress. Keep learning!',
        type: 'info'
    };
}

/**
 * Calculate estimated completion date
 */
export function getEstimatedCompletion() {
    const progress = analyzeCourseProgress();
    const last7Days = [];
    const today = new Date();

    // Get average daily progress over last 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dailyWatchLog[dateStr] || 0);
    }

    const avgDailySeconds = last7Days.reduce((a, b) => a + b, 0) / 7;

    if (avgDailySeconds === 0 || progress.remainingDuration === 0) {
        return null;
    }

    const daysRemaining = Math.ceil(progress.remainingDuration / avgDailySeconds);
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + daysRemaining);

    return {
        daysRemaining,
        completionDate: completionDate.toISOString().split('T')[0],
        avgDailyTime: secondsToMinutesLabel(avgDailySeconds)
    };
}
