/**
 * Completion Estimate Module
 * Calculates estimated completion date based on current pace
 */

import { course, dailyWatchLog } from "./storage.js";
import { todayDate, lastNDates } from "./utils.js";

/**
 * Calculate estimated completion date
 */
export function calculateCompletionEstimate() {
    // Get total course length and watched time
    const totals = calculateCourseTotals();

    if (totals.totalLength === 0) {
        return {
            estimatedDate: null,
            daysRemaining: 0,
            message: "No course data available",
            insight: "Add videos to get started",
            pace: 0,
            icon: "📚"
        };
    }

    // If already completed
    if (totals.percentComplete >= 100) {
        return {
            estimatedDate: new Date(),
            daysRemaining: 0,
            message: "Course Completed! 🎉",
            insight: "Congratulations on finishing!",
            pace: 0,
            icon: "🎉"
        };
    }

    // Calculate average daily pace (last 14 days)
    const dailyPace = calculateDailyPace(14);

    if (dailyPace === 0) {
        return {
            estimatedDate: null,
            daysRemaining: Infinity,
            message: "Start watching to estimate",
            insight: "Begin your learning journey!",
            pace: 0,
            icon: "🚀"
        };
    }

    // Calculate remaining time
    const remainingSeconds = totals.totalLength - totals.totalWatched;
    const daysToComplete = Math.ceil(remainingSeconds / dailyPace);

    // Calculate estimated completion date
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);

    // Generate message and insight
    const { message, insight, icon } = generateCompletionMessage(
        daysToComplete,
        dailyPace,
        remainingSeconds
    );

    return {
        estimatedDate,
        daysRemaining: daysToComplete,
        message,
        insight,
        pace: dailyPace,
        icon
    };
}

/**
 * Calculate course totals
 */
function calculateCourseTotals() {
    let totalLength = 0;
    let totalWatched = 0;

    if (!course.sections) {
        return { totalLength: 0, totalWatched: 0, percentComplete: 0 };
    }

    course.sections.forEach(section => {
        section.videos.forEach(video => {
            totalLength += video.length || 0;
            totalWatched += Math.min(video.watched || 0, video.length || 0);
        });
    });

    const percentComplete = totalLength > 0
        ? Math.round((totalWatched / totalLength) * 100)
        : 0;

    return { totalLength, totalWatched, percentComplete };
}

/**
 * Calculate average daily pace (seconds per day)
 */
function calculateDailyPace(days = 14) {
    const dates = lastNDates(days);
    let totalSeconds = 0;
    let daysWithActivity = 0;

    dates.forEach(date => {
        const seconds = dailyWatchLog[date] || 0;
        if (seconds > 0) {
            totalSeconds += seconds;
            daysWithActivity++;
        }
    });

    // Use days with activity for more accurate pace
    // If less than 3 days of activity, use total days to be conservative
    const divisor = daysWithActivity >= 3 ? daysWithActivity : days;

    return divisor > 0 ? totalSeconds / divisor : 0;
}

/**
 * Generate completion message and insight
 */
function generateCompletionMessage(daysRemaining, dailyPace, remainingSeconds) {
    const dailyMinutes = Math.floor(dailyPace / 60);
    const remainingHours = Math.floor(remainingSeconds / 3600);

    let message = "";
    let insight = "";
    let icon = "🎯";

    // Format estimated date message
    if (daysRemaining <= 0) {
        message = "Today! 🎉";
        insight = "You're almost there!";
        icon = "🎉";
    } else if (daysRemaining === 1) {
        message = "Tomorrow";
        insight = `Just ${remainingHours}h left at your pace!`;
        icon = "⚡";
    } else if (daysRemaining <= 7) {
        const date = new Date();
        date.setDate(date.getDate() + daysRemaining);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        message = `${dayName} (${daysRemaining}d)`;
        insight = `${dailyMinutes}m/day keeps you on track`;
        icon = "🔥";
    } else if (daysRemaining <= 30) {
        const weeks = Math.ceil(daysRemaining / 7);
        message = `${weeks} week${weeks > 1 ? 's' : ''}`;
        insight = `${dailyMinutes}m daily = done in ${daysRemaining} days`;
        icon = "📈";
    } else if (daysRemaining <= 90) {
        const months = Math.ceil(daysRemaining / 30);
        message = `~${months} month${months > 1 ? 's' : ''}`;
        insight = `Steady ${dailyMinutes}m/day gets you there`;
        icon = "🎯";
    } else {
        const months = Math.ceil(daysRemaining / 30);
        message = `~${months} months`;
        insight = `Speed up to ${dailyMinutes * 2}m/day to finish sooner`;
        icon = "🚀";
    }

    return { message, insight, icon };
}

/**
 * Format date for display
 */
export function formatCompletionDate(date) {
    if (!date) return "Unknown";

    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Update completion estimate display
 */
export function updateCompletionEstimate() {
    const estimate = calculateCompletionEstimate();

    const dateEl = document.getElementById("completion-date");
    const insightEl = document.getElementById("completion-insight");
    const iconEl = document.getElementById("completion-icon");

    if (dateEl) {
        dateEl.textContent = estimate.message;
    }

    if (insightEl) {
        insightEl.textContent = estimate.insight;
    }

    if (iconEl) {
        iconEl.textContent = estimate.icon;
    }
}

/**
 * Get speed-up suggestion
 */
export function getSpeedUpSuggestion(targetDays) {
    const totals = calculateCourseTotals();
    const remainingSeconds = totals.totalLength - totals.totalWatched;

    if (remainingSeconds <= 0) return null;

    const requiredDailySeconds = remainingSeconds / targetDays;
    const requiredDailyMinutes = Math.ceil(requiredDailySeconds / 60);

    return {
        targetDays,
        requiredMinutes: requiredDailyMinutes,
        message: `Watch ${requiredDailyMinutes}m/day to finish in ${targetDays} days`
    };
}
