/**
 * Trend Analysis Module
 * Calculates and provides insights about learning trends and patterns
 */

import { dailyWatchLog } from "./storage.js";
import { lastNDates, todayDate, secondsToMinutesLabel } from "./utils.js";

/**
 * Calculate trend analysis for the last 7 days
 */
export function calculateTrendAnalysis() {
    const dates = lastNDates(7);
    const today = todayDate();

    // Get watch times for each day
    const dailyTimes = dates.map(date => ({
        date,
        seconds: dailyWatchLog[date] || 0,
        minutes: Math.floor((dailyWatchLog[date] || 0) / 60)
    }));

    // Calculate total and average
    const totalSeconds = dailyTimes.reduce((sum, day) => sum + day.seconds, 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const averageMinutes = Math.floor(totalMinutes / 7);

    // Find best and worst days
    const activeDays = dailyTimes.filter(day => day.seconds > 0);
    const bestDay = activeDays.length > 0
        ? activeDays.reduce((max, day) => day.seconds > max.seconds ? day : max, activeDays[0])
        : null;
    const worstDay = activeDays.length > 0
        ? activeDays.reduce((min, day) => day.seconds < min.seconds ? day : min, activeDays[0])
        : null;

    // Calculate trend (compare first half vs second half of week)
    const firstHalf = dailyTimes.slice(0, 3); // First 3 days
    const secondHalf = dailyTimes.slice(4, 7); // Last 3 days (excluding middle day)

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.seconds, 0) / 3;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.seconds, 0) / 3;

    const trendPercentage = firstHalfAvg > 0
        ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        : 0;

    // Determine trend direction
    let trendDirection = "steady";
    let trendIcon = "→";
    let trendColor = "#ffffff"; // white for contrast

    if (trendPercentage > 15) {
        trendDirection = "up";
        trendIcon = "📈";
        trendColor = "#ffffff"; // white for contrast
    } else if (trendPercentage < -15) {
        trendDirection = "down";
        trendIcon = "📉";
        trendColor = "#ffffff"; // white for contrast
    } else {
        trendIcon = "📊";
        trendColor = "#ffffff"; // white for contrast
    }

    // Calculate consistency (days with activity)
    const daysWithActivity = activeDays.length;
    const consistencyPercentage = Math.round((daysWithActivity / 7) * 100);

    return {
        totalMinutes,
        averageMinutes,
        bestDay: bestDay ? {
            date: bestDay.date,
            minutes: bestDay.minutes,
            label: bestDay.date === today ? "Today" : formatDayLabel(bestDay.date)
        } : null,
        worstDay: worstDay ? {
            date: worstDay.date,
            minutes: worstDay.minutes,
            label: worstDay.date === today ? "Today" : formatDayLabel(worstDay.date)
        } : null,
        trend: {
            direction: trendDirection,
            percentage: trendPercentage,
            icon: trendIcon,
            color: trendColor,
            text: getTrendText(trendDirection, trendPercentage)
        },
        consistency: {
            daysActive: daysWithActivity,
            percentage: consistencyPercentage
        }
    };
}

/**
 * Format date label for display
 */
function formatDayLabel(dateString) {
    const date = new Date(dateString + "T00:00:00");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
}

/**
 * Get trend text description
 */
function getTrendText(direction, percentage) {
    const absPercentage = Math.abs(percentage);

    if (direction === "up") {
        if (absPercentage > 50) return `↑ ${absPercentage}% (Great!)`;
        if (absPercentage > 25) return `↑ ${absPercentage}% (Good)`;
        return `↑ ${absPercentage}%`;
    } else if (direction === "down") {
        if (absPercentage > 50) return `↓ ${absPercentage}%`;
        if (absPercentage > 25) return `↓ ${absPercentage}%`;
        return `↓ ${absPercentage}%`;
    } else {
        return "Steady";
    }
}

/**
 * Get motivational insight based on trend
 */
export function getTrendInsight(trendAnalysis) {
    const { trend, consistency, averageMinutes } = trendAnalysis;

    // No activity
    if (averageMinutes === 0) {
        return {
            icon: "💡",
            message: "Start building your learning streak!",
            type: "info"
        };
    }

    // Trending up
    if (trend.direction === "up") {
        return {
            icon: "🚀",
            message: "You're on fire! Keep up the momentum!",
            type: "success"
        };
    }

    // Trending down
    if (trend.direction === "down") {
        return {
            icon: "💪",
            message: "Let's get back on track!",
            type: "warning"
        };
    }

    // Steady and consistent
    if (consistency.percentage >= 80) {
        return {
            icon: "⭐",
            message: "Excellent consistency!",
            type: "success"
        };
    }

    // Steady but could improve
    return {
        icon: "📚",
        message: "Steady progress, keep going!",
        type: "info"
    };
}

/**
 * Update trend analysis display in the widget
 */
export function updateTrendDisplay() {
    const analysis = calculateTrendAnalysis();

    // Update trend indicator
    const trendIcon = document.getElementById("trend-icon");
    const trendText = document.getElementById("trend-text");
    const trendIndicator = document.getElementById("trend-indicator");

    if (trendIcon && trendText && trendIndicator) {
        trendIcon.textContent = analysis.trend.icon;
        trendText.textContent = analysis.trend.text;
        trendText.style.color = analysis.trend.color;
    }

    // Update best day
    const bestDayEl = document.getElementById("best-day");
    if (bestDayEl && analysis.bestDay) {
        bestDayEl.textContent = `${analysis.bestDay.label} (${analysis.bestDay.minutes}m)`;
    } else if (bestDayEl) {
        bestDayEl.textContent = "--";
    }

    // Update slowest day
    const slowestDayEl = document.getElementById("slowest-day");
    if (slowestDayEl && analysis.worstDay) {
        slowestDayEl.textContent = `${analysis.worstDay.label} (${analysis.worstDay.minutes}m)`;
    } else if (slowestDayEl) {
        slowestDayEl.textContent = "--";
    }

    // Update weekly average
    const weeklyAvgEl = document.getElementById("weekly-average");
    if (weeklyAvgEl) {
        weeklyAvgEl.textContent = `${analysis.averageMinutes}m/day`;
    }
}
