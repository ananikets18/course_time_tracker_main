// Daily goals system
import { dailyWatchLog, course } from "./storage.js";

const GOALS_KEY = "dailyGoals";

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const d = new Date();
    return d.toISOString().split("T")[0];
}

// Default goal settings
function getDefaultGoals() {
    return {
        videosPerDay: 2,        // Target: 2 videos per day
        minutesPerDay: 30,      // Target: 30 minutes per day
        customGoals: {},        // Date-specific custom goals
        lastUpdated: new Date().toISOString()
    };
}

// Load goals from localStorage
function loadGoals() {
    const saved = localStorage.getItem(GOALS_KEY);
    return saved ? JSON.parse(saved) : getDefaultGoals();
}

// Save goals to localStorage
function saveGoals(goals) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

// Get today's goal
export function getTodayGoal() {
    const goals = loadGoals();
    const today = getTodayDate();

    // Check if there's a custom goal for today
    if (goals.customGoals[today]) {
        return goals.customGoals[today];
    }

    // Return default goals
    return {
        videos: goals.videosPerDay,
        minutes: goals.minutesPerDay
    };
}

// Calculate today's progress
export function calculateTodayProgress() {
    const today = getTodayDate();
    const goal = getTodayGoal();

    // Get today's watched time in seconds
    const todaySeconds = dailyWatchLog[today] || 0;
    const todayMinutes = Math.floor(todaySeconds / 60);

    // Count videos completed today
    let videosToday = 0;
    course.sections.forEach(section => {
        section.videos.forEach(video => {
            // Check if video was completed today
            if (video.watched >= video.length && video.addedToday > 0) {
                videosToday++;
            }
        });
    });

    return {
        videos: {
            current: videosToday,
            target: goal.videos,
            percentage: Math.min(Math.round((videosToday / goal.videos) * 100), 100)
        },
        minutes: {
            current: todayMinutes,
            target: goal.minutes,
            percentage: Math.min(Math.round((todayMinutes / goal.minutes) * 100), 100)
        }
    };
}

// Check if today's goals are met
export function areGoalsMet() {
    const progress = calculateTodayProgress();
    return progress.videos.percentage >= 100 && progress.minutes.percentage >= 100;
}

// Check if at least one goal is met
export function isAnyGoalMet() {
    const progress = calculateTodayProgress();
    return progress.videos.percentage >= 100 || progress.minutes.percentage >= 100;
}

// Get motivational message based on progress
export function getGoalMessage() {
    const progress = calculateTodayProgress();
    const videosPercent = progress.videos.percentage;
    const minutesPercent = progress.minutes.percentage;

    // Both goals completed
    if (videosPercent >= 100 && minutesPercent >= 100) {
        return {
            icon: "🎉",
            message: "Goals crushed! You're amazing!",
            type: "complete"
        };
    }

    // Videos goal met
    if (videosPercent >= 100) {
        return {
            icon: "🎯",
            message: `${progress.videos.current}/${progress.videos.target} videos done! Keep going!`,
            type: "videos-complete"
        };
    }

    // Minutes goal met
    if (minutesPercent >= 100) {
        return {
            icon: "⏱️",
            message: `${progress.minutes.current}m done! Great work!`,
            type: "minutes-complete"
        };
    }

    // Close to completion (75%+)
    if (videosPercent >= 75 || minutesPercent >= 75) {
        return {
            icon: "💪",
            message: "Almost there! Finish strong!",
            type: "almost"
        };
    }

    // Halfway there (50%+)
    if (videosPercent >= 50 || minutesPercent >= 50) {
        return {
            icon: "🔥",
            message: "Halfway there! Keep it up!",
            type: "halfway"
        };
    }

    // Just started (1-49%)
    if (videosPercent > 0 || minutesPercent > 0) {
        return {
            icon: "🌱",
            message: "Great start! Keep going!",
            type: "started"
        };
    }

    // Not started
    return {
        icon: "📚",
        message: "Ready to start your daily goals?",
        type: "not-started"
    };
}

// Get time remaining today
export function getTimeRemaining() {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const diff = endOfDay - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
}

// Update goal settings
export function updateGoalSettings(videosPerDay, minutesPerDay) {
    const goals = loadGoals();
    goals.videosPerDay = videosPerDay;
    goals.minutesPerDay = minutesPerDay;
    goals.lastUpdated = new Date().toISOString();
    saveGoals(goals);
}

// Set custom goal for specific date
export function setCustomGoal(date, videos, minutes) {
    const goals = loadGoals();
    goals.customGoals[date] = { videos, minutes };
    saveGoals(goals);
}

// Get goal completion status for display
export function getGoalStatus() {
    const progress = calculateTodayProgress();
    const timeLeft = getTimeRemaining();
    const message = getGoalMessage();

    return {
        progress,
        timeLeft,
        message,
        isComplete: areGoalsMet(),
        isPartialComplete: isAnyGoalMet()
    };
}
