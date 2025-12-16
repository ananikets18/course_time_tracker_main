// Achievements/Badges system
import { dailyWatchLog, course } from "./storage.js";
import { calculateStreak } from "./streakSystem.js";
import { toast } from "./toast.js";

const ACHIEVEMENTS_KEY = "userAchievements";

// Define all available achievements
const ACHIEVEMENT_DEFINITIONS = {
    first_video: {
        id: "first_video",
        name: "First Steps",
        description: "Complete your first video",
        icon: "🎬",
        condition: () => {
            let completedCount = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    if (v.watched >= v.length) completedCount++;
                });
            });
            return completedCount >= 1;
        }
    },

    five_videos: {
        id: "five_videos",
        name: "Getting Started",
        description: "Complete 5 videos",
        icon: "📚",
        condition: () => {
            let completedCount = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    if (v.watched >= v.length) completedCount++;
                });
            });
            return completedCount >= 5;
        }
    },

    ten_videos: {
        id: "ten_videos",
        name: "Dedicated Learner",
        description: "Complete 10 videos",
        icon: "📖",
        condition: () => {
            let completedCount = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    if (v.watched >= v.length) completedCount++;
                });
            });
            return completedCount >= 10;
        }
    },

    week_streak: {
        id: "week_streak",
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "🔥",
        condition: () => {
            const streak = calculateStreak();
            return streak.current >= 7 || streak.longest >= 7;
        }
    },

    two_week_streak: {
        id: "two_week_streak",
        name: "Consistency King",
        description: "Maintain a 14-day streak",
        icon: "👑",
        condition: () => {
            const streak = calculateStreak();
            return streak.current >= 14 || streak.longest >= 14;
        }
    },

    month_streak: {
        id: "month_streak",
        name: "Unstoppable",
        description: "Maintain a 30-day streak",
        icon: "💎",
        condition: () => {
            const streak = calculateStreak();
            return streak.current >= 30 || streak.longest >= 30;
        }
    },

    early_bird: {
        id: "early_bird",
        name: "Early Bird",
        description: "Study before 8 AM",
        icon: "🌅",
        condition: () => {
            const now = new Date();
            const hour = now.getHours();
            // Check if current time is between 4 AM and 8 AM
            return hour >= 4 && hour < 8;
        }
    },

    night_owl: {
        id: "night_owl",
        name: "Night Owl",
        description: "Study after 10 PM",
        icon: "🦉",
        condition: () => {
            const now = new Date();
            const hour = now.getHours();
            // Check if current time is after 10 PM (22:00) or before 4 AM
            return hour >= 22 || hour < 4;
        }
    },

    weekend_warrior: {
        id: "weekend_warrior",
        name: "Weekend Warrior",
        description: "Study on Saturday AND Sunday",
        icon: "⚔️",
        condition: () => {
            const today = new Date();
            const day = today.getDay(); // 0 = Sunday, 6 = Saturday

            // If it's not the weekend, we can't unlock it right now
            if (day !== 0 && day !== 6) return false;

            const todayStr = today.toISOString().split("T")[0];

            // Calculate the "other" weekend day date
            const otherDay = new Date(today);
            otherDay.setDate(today.getDate() + (day === 0 ? -1 : 1)); // If Sun, check Sat; If Sat, check Sun
            const otherDayStr = otherDay.toISOString().split("T")[0];

            // Check if we have activity for both days
            const hasActivityToday = dailyWatchLog[todayStr] && dailyWatchLog[todayStr] > 0;
            const hasActivityOther = dailyWatchLog[otherDayStr] && dailyWatchLog[otherDayStr] > 0;

            return hasActivityToday && hasActivityOther;
        }
    },

    speed_demon: {
        id: "speed_demon",
        name: "Speed Demon",
        description: "Complete 5 videos in one day",
        icon: "⚡",
        condition: () => {
            // Check today's completed videos
            let todayCompleted = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    if (v.addedToday && v.watched >= v.length) {
                        todayCompleted++;
                    }
                });
            });
            return todayCompleted >= 5;
        }
    },

    marathon: {
        id: "marathon",
        name: "Marathon Runner",
        description: "Watch 2+ hours in one day",
        icon: "🏃",
        condition: () => {
            const today = new Date().toISOString().split("T")[0];
            const todaySeconds = dailyWatchLog[today] || 0;
            return todaySeconds >= 7200; // 2 hours = 7200 seconds
        }
    },

    first_section: {
        id: "first_section",
        name: "Section Complete",
        description: "Complete an entire section",
        icon: "✅",
        condition: () => {
            return course.sections.some(section => {
                if (section.videos.length === 0) return false;
                return section.videos.every(v => v.watched >= v.length);
            });
        }
    },

    halfway: {
        id: "halfway",
        name: "Halfway There",
        description: "Reach 50% course completion",
        icon: "🎯",
        condition: () => {
            let total = 0, watched = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    total += v.length || 0;
                    watched += Math.min(v.watched || 0, v.length || 0);
                });
            });
            return total > 0 && (watched / total) >= 0.5;
        }
    },

    almost_there: {
        id: "almost_there",
        name: "Almost There",
        description: "Reach 75% course completion",
        icon: "🚀",
        condition: () => {
            let total = 0, watched = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    total += v.length || 0;
                    watched += Math.min(v.watched || 0, v.length || 0);
                });
            });
            return total > 0 && (watched / total) >= 0.75;
        }
    },

    course_complete: {
        id: "course_complete",
        name: "Course Master",
        description: "Complete 100% of the course",
        icon: "🏆",
        condition: () => {
            if (course.sections.length === 0) return false;
            let total = 0, watched = 0;
            course.sections.forEach(s => {
                s.videos.forEach(v => {
                    total += v.length || 0;
                    watched += Math.min(v.watched || 0, v.length || 0);
                });
            });
            return total > 0 && watched >= total;
        }
    }
};

// Load unlocked achievements from localStorage
function loadAchievements() {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
}

// Save unlocked achievements
function saveAchievements(achievements) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

// Get all achievements with unlock status
export function getAllAchievements() {
    const unlocked = loadAchievements();

    return Object.values(ACHIEVEMENT_DEFINITIONS).map(achievement => ({
        ...achievement,
        unlocked: unlocked.includes(achievement.id),
        unlockedAt: unlocked.includes(achievement.id)
            ? (JSON.parse(localStorage.getItem(`achievement_${achievement.id}_time`)) || null)
            : null
    }));
}

// Check and unlock new achievements
export function checkAchievements() {
    const unlocked = loadAchievements();
    const newlyUnlocked = [];

    Object.values(ACHIEVEMENT_DEFINITIONS).forEach(achievement => {
        // Skip if already unlocked
        if (unlocked.includes(achievement.id)) return;

        // Check if condition is met
        try {
            if (achievement.condition()) {
                unlocked.push(achievement.id);
                newlyUnlocked.push(achievement);

                // Save unlock time
                localStorage.setItem(
                    `achievement_${achievement.id}_time`,
                    JSON.stringify(new Date().toISOString())
                );
            }
        } catch (error) {
            console.error(`Error checking achievement ${achievement.id}:`, error);
        }
    });

    // Save updated unlocked list
    if (newlyUnlocked.length > 0) {
        saveAchievements(unlocked);
    }

    return newlyUnlocked;
}

// Show achievement unlock notification
export function showAchievementUnlock(achievement) {
    toast(
        `🏆 Achievement Unlocked: ${achievement.icon} ${achievement.name}!`,
        "success",
        5000
    );
}

// Get achievement stats
export function getAchievementStats() {
    const all = getAllAchievements();
    const unlocked = all.filter(a => a.unlocked);

    return {
        total: all.length,
        unlocked: unlocked.length,
        percentage: Math.round((unlocked.length / all.length) * 100),
        recent: unlocked
            .filter(a => a.unlockedAt)
            .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
            .slice(0, 3)
    };
}

// Get next achievable achievement
export function getNextAchievement() {
    const all = getAllAchievements();
    const locked = all.filter(a => !a.unlocked);

    // Prioritize by likely completion order
    const priority = [
        'first_video',
        'five_videos',
        'week_streak',
        'first_section',
        'ten_videos',
        'halfway',
        'two_week_streak',
        'almost_there',
        'month_streak',
        'course_complete'
    ];

    for (const id of priority) {
        const achievement = locked.find(a => a.id === id);
        if (achievement) return achievement;
    }

    return locked[0] || null;
}
