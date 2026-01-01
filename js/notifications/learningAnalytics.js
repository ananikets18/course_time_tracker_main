/**
 * Learning Analytics
 * Analyzes user's learning patterns to predict optimal study times
 */

import { db } from '../db.js';

const DEFAULT_USER_ID = 'default';

class LearningAnalytics {
    /**
     * Analyze user's learning patterns
     */
    async analyzeLearningPatterns(userId = DEFAULT_USER_ID) {
        const patterns = new Map();

        // Initialize 7 days × 24 hours grid
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                patterns.set(`${day}-${hour}`, {
                    dayOfWeek: day,
                    hour,
                    sessions: 0,
                    totalMinutes: 0,
                    videosCompleted: 0,
                    activityScore: 0
                });
            }
        }

        // Analyze historical data from all courses
        try {
            const allCourses = await db.courses.toArray();

            for (const course of allCourses) {
                if (!course.sections) continue;

                for (const section of course.sections) {
                    for (const video of section.videos || []) {
                        // Analyze completion dates
                        if (video.completedDate) {
                            this.recordActivity(patterns, video.completedDate, video.watched / 60, true);
                        }

                        // Analyze last watched dates
                        if (video.lastWatchedDate && video.lastWatchedDate !== video.completedDate) {
                            this.recordActivity(patterns, video.lastWatchedDate, video.watched / 60, false);
                        }
                    }
                }
            }

            // Calculate activity scores
            this.calculateActivityScores(patterns);

            // Save to database
            await this.saveLearningPatterns(userId, patterns);

            console.log('✅ Learning patterns analyzed');
            return patterns;
        } catch (error) {
            console.error('Error analyzing learning patterns:', error);
            return patterns;
        }
    }

    /**
     * Record activity in a time slot
     */
    recordActivity(patterns, dateString, minutes, completed) {
        try {
            // Parse date (handle both date-only and datetime strings)
            const date = new Date(dateString.includes('T') ? dateString : dateString + 'T12:00:00');

            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return;
            }

            const day = date.getDay();
            const hour = date.getHours();
            const key = `${day}-${hour}`;

            const pattern = patterns.get(key);
            if (pattern) {
                pattern.sessions++;
                pattern.totalMinutes += minutes;
                if (completed) {
                    pattern.videosCompleted++;
                }
            }
        } catch (error) {
            console.error('Error recording activity:', error);
        }
    }

    /**
     * Calculate activity scores for each time slot
     */
    calculateActivityScores(patterns) {
        patterns.forEach((pattern) => {
            // Score based on: sessions (40%), minutes (30%), completions (30%)
            const sessionScore = Math.min(pattern.sessions * 10, 40);
            const minuteScore = Math.min(pattern.totalMinutes / 2, 30);
            const completionScore = Math.min(pattern.videosCompleted * 10, 30);

            pattern.activityScore = sessionScore + minuteScore + completionScore;
        });
    }

    /**
     * Save learning patterns to database
     */
    async saveLearningPatterns(userId, patterns) {
        try {
            const records = Array.from(patterns.values()).map(p => ({
                ...p,
                userId,
                lastUpdated: new Date().toISOString(),
                sampleSize: p.sessions
            }));

            // Clear old patterns for this user
            await db.learningPatterns.where('userId').equals(userId).delete();

            // Insert new patterns
            await db.learningPatterns.bulkAdd(records);

            console.log(`💾 Saved ${records.length} learning patterns`);
        } catch (error) {
            console.error('Error saving learning patterns:', error);
        }
    }

    /**
     * Get recommended study times based on patterns
     */
    async getRecommendedTimes(userId = DEFAULT_USER_ID, count = 3) {
        try {
            let patterns = await db.learningPatterns
                .where('userId').equals(userId)
                .toArray();

            // If no patterns, analyze first
            if (patterns.length === 0) {
                const analyzed = await this.analyzeLearningPatterns(userId);
                patterns = Array.from(analyzed.values());
            }

            // Filter out low-activity slots (score < 10)
            patterns = patterns.filter(p => p.activityScore >= 10);

            // Sort by activity score
            patterns.sort((a, b) => b.activityScore - a.activityScore);

            // Return top N times
            return patterns.slice(0, count).map(p => ({
                dayOfWeek: p.dayOfWeek,
                hour: p.hour,
                score: Math.round(p.activityScore),
                time: `${String(p.hour).padStart(2, '0')}:00`,
                dayName: this.getDayName(p.dayOfWeek)
            }));
        } catch (error) {
            console.error('Error getting recommended times:', error);
            return [];
        }
    }

    /**
     * Predict best time for today
     */
    async predictBestTimeToday(userId = DEFAULT_USER_ID) {
        try {
            const today = new Date().getDay();
            const currentHour = new Date().getHours();

            const patterns = await db.learningPatterns
                .where('userId').equals(userId)
                .and(p => p.dayOfWeek === today && p.hour > currentHour)
                .toArray();

            if (patterns.length === 0) {
                // Default to evening if no data
                return '18:00';
            }

            // Find highest scoring hour remaining today
            patterns.sort((a, b) => b.activityScore - a.activityScore);
            return `${String(patterns[0].hour).padStart(2, '0')}:00`;
        } catch (error) {
            console.error('Error predicting best time:', error);
            return '18:00';
        }
    }

    /**
     * Get activity heatmap data (for visualization)
     */
    async getActivityHeatmap(userId = DEFAULT_USER_ID) {
        try {
            const patterns = await db.learningPatterns
                .where('userId').equals(userId)
                .toArray();

            // Create 7x24 grid
            const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));

            patterns.forEach(p => {
                heatmap[p.dayOfWeek][p.hour] = p.activityScore;
            });

            return heatmap;
        } catch (error) {
            console.error('Error getting activity heatmap:', error);
            return Array(7).fill(null).map(() => Array(24).fill(0));
        }
    }

    /**
     * Get learning insights
     */
    async getLearningInsights(userId = DEFAULT_USER_ID) {
        try {
            const patterns = await db.learningPatterns
                .where('userId').equals(userId)
                .toArray();

            if (patterns.length === 0) {
                return {
                    mostProductiveDay: null,
                    mostProductiveHour: null,
                    leastProductiveDay: null,
                    averageSessionsPerWeek: 0,
                    totalMinutesTracked: 0
                };
            }

            // Group by day
            const byDay = {};
            const byHour = {};

            patterns.forEach(p => {
                byDay[p.dayOfWeek] = (byDay[p.dayOfWeek] || 0) + p.activityScore;
                byHour[p.hour] = (byHour[p.hour] || 0) + p.activityScore;
            });

            // Find most/least productive
            const mostProductiveDay = Object.entries(byDay)
                .sort((a, b) => b[1] - a[1])[0];

            const leastProductiveDay = Object.entries(byDay)
                .sort((a, b) => a[1] - b[1])[0];

            const mostProductiveHour = Object.entries(byHour)
                .sort((a, b) => b[1] - a[1])[0];

            // Calculate totals
            const totalSessions = patterns.reduce((sum, p) => sum + p.sessions, 0);
            const totalMinutes = patterns.reduce((sum, p) => sum + p.totalMinutes, 0);

            return {
                mostProductiveDay: {
                    day: parseInt(mostProductiveDay[0]),
                    dayName: this.getDayName(parseInt(mostProductiveDay[0])),
                    score: Math.round(mostProductiveDay[1])
                },
                mostProductiveHour: {
                    hour: parseInt(mostProductiveHour[0]),
                    time: `${String(mostProductiveHour[0]).padStart(2, '0')}:00`,
                    score: Math.round(mostProductiveHour[1])
                },
                leastProductiveDay: {
                    day: parseInt(leastProductiveDay[0]),
                    dayName: this.getDayName(parseInt(leastProductiveDay[0])),
                    score: Math.round(leastProductiveDay[1])
                },
                averageSessionsPerWeek: Math.round(totalSessions / 4), // Assuming ~4 weeks of data
                totalMinutesTracked: Math.round(totalMinutes)
            };
        } catch (error) {
            console.error('Error getting learning insights:', error);
            return null;
        }
    }

    /**
     * Get day name from number
     */
    getDayName(day) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day] || 'Unknown';
    }

    /**
     * Check if patterns need updating
     */
    async shouldUpdatePatterns(userId = DEFAULT_USER_ID) {
        try {
            const patterns = await db.learningPatterns
                .where('userId').equals(userId)
                .limit(1)
                .toArray();

            if (patterns.length === 0) return true;

            // Update if last update was more than 7 days ago
            const lastUpdate = new Date(patterns[0].lastUpdated);
            const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

            return daysSinceUpdate >= 7;
        } catch (error) {
            console.error('Error checking pattern update status:', error);
            return true;
        }
    }
}

// Create singleton instance
export const learningAnalytics = new LearningAnalytics();

// Auto-analyze patterns on load (after delay)
if (typeof window !== 'undefined') {
    setTimeout(async () => {
        const shouldUpdate = await learningAnalytics.shouldUpdatePatterns();
        if (shouldUpdate) {
            console.log('📊 Analyzing learning patterns...');
            await learningAnalytics.analyzeLearningPatterns();
        }
    }, 5000);

    // Expose for debugging
    window.learningAnalytics = learningAnalytics;
}
