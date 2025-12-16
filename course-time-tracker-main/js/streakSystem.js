// Streak tracking system
import { dailyWatchLog } from "./storage.js";

const STREAK_KEY = "userStreak";

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const d = new Date();
    return d.toISOString().split("T")[0];
}

// Get yesterday's date
function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
}

// Calculate streak from dailyWatchLog
export function calculateStreak() {
    const dates = Object.keys(dailyWatchLog)
        .filter(date => dailyWatchLog[date] > 0)
        .sort()
        .reverse(); // Most recent first

    if (dates.length === 0) {
        return { current: 0, longest: 0, lastStudyDate: null };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastStudyDate = dates[0];

    // Check if studied today or yesterday (streak is alive)
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    if (dates[0] === today || dates[0] === yesterday) {
        currentStreak = 1;
        tempStreak = 1;

        // Count consecutive days backwards
        for (let i = 1; i < dates.length; i++) {
            const currentDate = new Date(dates[i - 1]);
            const prevDate = new Date(dates[i]);
            const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak++;
                tempStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i - 1]);
        const prevDate = new Date(dates[i]);
        const diffDays = Math.round((currentDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
        current: currentStreak,
        longest: longestStreak,
        lastStudyDate: lastStudyDate
    };
}

// Check if user studied today
export function studiedToday() {
    const today = getTodayDate();
    return dailyWatchLog[today] && dailyWatchLog[today] > 0;
}

// Check if streak is at risk (haven't studied today)
export function isStreakAtRisk() {
    const streak = calculateStreak();
    return streak.current > 0 && !studiedToday();
}

// Get streak status message
export function getStreakMessage() {
    const streak = calculateStreak();

    if (streak.current === 0) {
        return {
            icon: "📚",
            message: "Start your learning streak today!",
            type: "start"
        };
    }

    if (streak.current === 1) {
        return {
            icon: "🌱",
            message: "Great start! Keep it going tomorrow!",
            type: "new"
        };
    }

    if (streak.current >= 2 && streak.current <= 6) {
        return {
            icon: "🔥",
            message: `${streak.current} day streak! Building momentum!`,
            type: "building"
        };
    }

    if (streak.current >= 7 && streak.current <= 13) {
        return {
            icon: "🔥🔥",
            message: `${streak.current} days strong! You're on fire!`,
            type: "strong"
        };
    }

    if (streak.current >= 14) {
        return {
            icon: "🏆",
            message: `${streak.current} day streak! Incredible dedication!`,
            type: "champion"
        };
    }
}

// Get motivational message if streak at risk
export function getStreakRiskMessage() {
    const streak = calculateStreak();

    if (!isStreakAtRisk()) return null;

    if (streak.current >= 14) {
        return `⚠️ Don't break your ${streak.current}-day streak! Study today!`;
    }

    if (streak.current >= 7) {
        return `🔥 Keep your ${streak.current}-day streak alive! Quick session?`;
    }

    if (streak.current >= 3) {
        return `📚 ${streak.current} days in a row! Don't stop now!`;
    }

    return `🌱 Continue your streak! Study today!`;
}

// Save streak data (for future features)
export function saveStreakData() {
    const streak = calculateStreak();
    localStorage.setItem(STREAK_KEY, JSON.stringify({
        ...streak,
        lastCalculated: new Date().toISOString()
    }));
    return streak;
}
