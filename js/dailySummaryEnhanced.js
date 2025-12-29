/**
 * Enhanced Multi-Course Daily Summary & Smart Recommendations System
 * Analyzes learning patterns across ALL courses and provides intelligent suggestions
 */

import { dailyWatchLog, getCoursesList, course } from "./storage.js";
import { todayDate, secondsToMinutesLabel } from "./utils.js";
import { calculateStreak } from "./streakSystem.js";
import { db } from "./db.js";

/**
 * Get yesterday's date
 */
function yesterdayDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

/**
 * Get aggregate summary across ALL courses for yesterday
 */
export async function getYesterdayAggregateSummary() {
    const yesterday = yesterdayDate();
    const yesterdaySeconds = dailyWatchLog[yesterday] || 0;

    // Get all courses
    const allCourses = await db.courses.toArray();

    let totalVideosCompleted = 0;
    let totalVideosReviewed = 0;
    let totalSectionsCompleted = 0;

    // Analyze each course
    for (const courseData of allCourses) {
        if (!courseData.sections) continue;

        courseData.sections.forEach(section => {
            let sectionCompletedYesterday = false;

            section.videos.forEach(video => {
                // Videos completed yesterday
                if (video.completedDate === yesterday) {
                    totalVideosCompleted++;
                    sectionCompletedYesterday = true;
                }

                // Videos reviewed yesterday (watched but already completed)
                if (video.lastWatchedDate === yesterday && video.completedDate && video.completedDate !== yesterday) {
                    totalVideosReviewed++;
                }
            });

            if (sectionCompletedYesterday) {
                totalSectionsCompleted++;
            }
        });
    }

    const streak = calculateStreak();

    return {
        timeSpent: yesterdaySeconds,
        timeSpentLabel: secondsToMinutesLabel(yesterdaySeconds),
        videosCompleted: totalVideosCompleted,
        videosReviewed: totalVideosReviewed,
        sectionsCompleted: totalSectionsCompleted,
        coursesWorkedOn: allCourses.filter(c => hasYesterdayActivity(c, yesterday)).length,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        isNewRecord: streak.current === streak.longest && streak.current > 1
    };
}

/**
 * Check if a course had activity yesterday
 */
function hasYesterdayActivity(courseData, yesterday) {
    if (!courseData.sections) return false;

    for (const section of courseData.sections) {
        for (const video of section.videos) {
            if (video.completedDate === yesterday || video.lastWatchedDate === yesterday) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Get per-course breakdown for yesterday
 */
export async function getYesterdayPerCourseBreakdown() {
    const yesterday = yesterdayDate();
    const allCourses = await db.courses.toArray();
    const breakdown = [];

    for (const courseData of allCourses) {
        const analysis = analyzeSingleCourse(courseData, yesterday);

        // Only include courses with activity or significant progress
        if (analysis.hadYesterdayActivity || analysis.completionRate > 0) {
            breakdown.push({
                id: courseData.id,
                title: courseData.title,
                isActive: courseData.id === course.id,
                ...analysis
            });
        }
    }

    // Sort: Active course first, then by yesterday activity, then by completion rate
    breakdown.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.hadYesterdayActivity && !b.hadYesterdayActivity) return -1;
        if (!a.hadYesterdayActivity && b.hadYesterdayActivity) return 1;
        return b.completionRate - a.completionRate;
    });

    return breakdown;
}

/**
 * Analyze a single course
 */
function analyzeSingleCourse(courseData, yesterday) {
    let totalVideos = 0;
    let completedVideos = 0;
    let inProgressVideos = 0;
    let notStartedVideos = 0;
    let yesterdayCompleted = 0;
    let yesterdayReviewed = 0;
    let dueReviews = 0;
    const today = todayDate();

    if (courseData.sections) {
        courseData.sections.forEach(section => {
            section.videos.forEach(video => {
                totalVideos++;

                if (video.watched >= video.length) {
                    completedVideos++;
                } else if (video.watched > 0) {
                    inProgressVideos++;
                } else {
                    notStartedVideos++;
                }

                // Yesterday's activity
                if (video.completedDate === yesterday) {
                    yesterdayCompleted++;
                }
                if (video.lastWatchedDate === yesterday && video.completedDate && video.completedDate !== yesterday) {
                    yesterdayReviewed++;
                }

                // Reviews due
                if (video.watched >= video.length && video.nextReviewDate && video.nextReviewDate <= today) {
                    dueReviews++;
                }
            });
        });
    }

    const completionRate = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
    const hadYesterdayActivity = yesterdayCompleted > 0 || yesterdayReviewed > 0;

    return {
        totalVideos,
        completedVideos,
        inProgressVideos,
        notStartedVideos,
        completionRate,
        yesterdayCompleted,
        yesterdayReviewed,
        hadYesterdayActivity,
        dueReviews
    };
}

/**
 * Generate smart cross-course recommendations
 */
export async function generateCrossCourseRecommendations() {
    const recommendations = [];
    const allCourses = await db.courses.toArray();
    const today = todayDate();
    const todaySeconds = dailyWatchLog[today] || 0;
    const streak = calculateStreak();

    // Analyze all courses
    const courseAnalyses = allCourses.map(c => ({
        id: c.id,
        title: c.title,
        isActive: c.id === course.id,
        ...analyzeSingleCourse(c, yesterdayDate())
    }));

    // Priority 1: Finish almost-complete courses (90%+)
    const almostDone = courseAnalyses.filter(c => c.completionRate >= 90 && c.completionRate < 100);
    if (almostDone.length > 0) {
        const topCourse = almostDone[0];
        recommendations.push({
            priority: 'high',
            type: 'finish',
            icon: '🏆',
            title: `Finish "${topCourse.title}"`,
            description: `You're ${topCourse.completionRate}% done! Only ${topCourse.notStartedVideos + topCourse.inProgressVideos} videos left to complete this course.`,
            courseId: topCourse.id,
            courseName: topCourse.title
        });
    }

    // Priority 2: Reviews due across all courses
    const coursesWithReviews = courseAnalyses.filter(c => c.dueReviews > 0);
    if (coursesWithReviews.length > 0) {
        const totalReviews = coursesWithReviews.reduce((sum, c) => sum + c.dueReviews, 0);
        recommendations.push({
            priority: 'high',
            type: 'review',
            icon: '💡',
            title: 'Review Due Videos',
            description: `You have ${totalReviews} video${totalReviews > 1 ? 's' : ''} ready for review across ${coursesWithReviews.length} course${coursesWithReviews.length > 1 ? 's' : ''}. Reviewing helps retention!`,
            courses: coursesWithReviews.map(c => ({ id: c.id, title: c.title, reviews: c.dueReviews }))
        });
    }

    // Priority 3: Continue yesterday's momentum
    const yesterdayActive = courseAnalyses.filter(c => c.hadYesterdayActivity);
    if (yesterdayActive.length > 0) {
        const topCourse = yesterdayActive[0];
        recommendations.push({
            priority: 'high',
            type: 'continue',
            icon: '▶️',
            title: `Continue "${topCourse.title}"`,
            description: `You made progress yesterday (${topCourse.yesterdayCompleted} videos completed). Keep the momentum going!`,
            courseId: topCourse.id,
            courseName: topCourse.title
        });
    }

    // Priority 4: Streak maintenance
    if (streak.current >= 3 && todaySeconds === 0) {
        recommendations.push({
            priority: 'high',
            type: 'streak',
            icon: '🔥',
            title: 'Maintain Your Streak!',
            description: `You're on a ${streak.current}-day streak! Study at least 30 minutes today to keep it alive.`,
        });
    }

    // Priority 5: Focus on one course (if too scattered)
    const activeCourses = courseAnalyses.filter(c => c.inProgressVideos > 0);
    if (activeCourses.length > 3) {
        recommendations.push({
            priority: 'medium',
            type: 'focus',
            icon: '🎯',
            title: 'Focus Your Learning',
            description: `You have ${activeCourses.length} courses in progress. Consider focusing on 1-2 courses to maintain momentum and complete them faster.`,
        });
    }

    // Priority 6: Daily goal reminder
    if (todaySeconds < 1800) {
        recommendations.push({
            priority: 'medium',
            type: 'goal',
            icon: '⏰',
            title: 'Reach Your Daily Goal',
            description: `You've studied for ${secondsToMinutesLabel(todaySeconds)} today. Aim for at least 30 minutes!`,
        });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations.slice(0, 5); // Top 5 recommendations
}

/**
 * Get motivational message based on overall progress
 */
export async function getMotivationalMessage() {
    const yesterday = yesterdayDate();
    const aggregate = await getYesterdayAggregateSummary();
    const streak = calculateStreak();

    // Yesterday activity-based messages
    if (aggregate.videosCompleted >= 5) {
        return {
            icon: '🎯',
            message: `Amazing! You completed ${aggregate.videosCompleted} videos yesterday across ${aggregate.coursesWorkedOn} course${aggregate.coursesWorkedOn > 1 ? 's' : ''}!`,
            type: 'success'
        };
    }

    if (aggregate.timeSpent >= 7200) { // 2 hours
        return {
            icon: '⏰',
            message: `Incredible dedication! ${aggregate.timeSpentLabel} of learning yesterday!`,
            type: 'success'
        };
    }

    if (aggregate.videosCompleted >= 3) {
        return {
            icon: '📚',
            message: `Great work yesterday! ${aggregate.videosCompleted} videos completed. Keep it up!`,
            type: 'success'
        };
    }

    // Streak-based messages
    if (streak.current >= 7) {
        return {
            icon: '🔥',
            message: `${streak.current}-day streak! You're on fire!`,
            type: 'success'
        };
    }

    if (streak.current >= 3) {
        return {
            icon: '⚡',
            message: 'Consistency is key! Keep your streak alive!',
            type: 'info'
        };
    }

    // Default encouraging message
    return {
        icon: '💡',
        message: 'Every step forward is progress. Keep learning!',
        type: 'info'
    };
}
