/**
 * Goal Adjustment Controls
 * Provides inline controls for adjusting daily goals from the Today widget
 */

import { updateGoalSettings, getTodayGoal } from "./dailyGoals.js";
import { updateDashboard } from "./dashboard.js";
import { toast } from "./toast.js";

// Minimum and maximum goal values
const MIN_VIDEOS = 1;
const MAX_VIDEOS = 20;
const MIN_MINUTES = 5;
const MAX_MINUTES = 300; // 5 hours max

/**
 * Initialize goal adjustment controls
 */
export function initGoalAdjustmentControls() {
    // Get button elements
    const videosDecreaseBtn = document.getElementById("goal-videos-decrease");
    const videosIncreaseBtn = document.getElementById("goal-videos-increase");
    const minutesDecreaseBtn = document.getElementById("goal-minutes-decrease");
    const minutesIncreaseBtn = document.getElementById("goal-minutes-increase");

    // Add event listeners
    videosDecreaseBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent widget collapse
        adjustVideosGoal(-1);
    });

    videosIncreaseBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent widget collapse
        adjustVideosGoal(1);
    });

    minutesDecreaseBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent widget collapse
        adjustMinutesGoal(-5); // Adjust by 5 minutes
    });

    minutesIncreaseBtn?.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent widget collapse
        adjustMinutesGoal(5); // Adjust by 5 minutes
    });

    // Update button states on load
    updateButtonStates();
}

/**
 * Adjust videos goal
 */
function adjustVideosGoal(delta) {
    const currentGoal = getTodayGoal();
    const newVideosGoal = Math.max(MIN_VIDEOS, Math.min(MAX_VIDEOS, currentGoal.videos + delta));

    // Only update if value changed
    if (newVideosGoal !== currentGoal.videos) {
        updateGoalSettings(newVideosGoal, currentGoal.minutes);
        updateDashboard();
        updateButtonStates();
        showGoalUpdateFeedback("videos", newVideosGoal);

        // Show toast notification
        toast(`📹 Video goal updated to ${newVideosGoal} per day`, "success");
    }
}

/**
 * Adjust minutes goal
 */
function adjustMinutesGoal(delta) {
    const currentGoal = getTodayGoal();
    const newMinutesGoal = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, currentGoal.minutes + delta));

    // Only update if value changed
    if (newMinutesGoal !== currentGoal.minutes) {
        updateGoalSettings(currentGoal.videos, newMinutesGoal);
        updateDashboard();
        updateButtonStates();
        showGoalUpdateFeedback("minutes", newMinutesGoal);

        // Show toast notification
        toast(`⏱️ Minutes goal updated to ${newMinutesGoal} per day`, "success");
    }
}

/**
 * Update button states (enable/disable based on limits)
 */
function updateButtonStates() {
    const currentGoal = getTodayGoal();

    // Videos buttons
    const videosDecreaseBtn = document.getElementById("goal-videos-decrease");
    const videosIncreaseBtn = document.getElementById("goal-videos-increase");

    if (videosDecreaseBtn) {
        videosDecreaseBtn.disabled = currentGoal.videos <= MIN_VIDEOS;
    }
    if (videosIncreaseBtn) {
        videosIncreaseBtn.disabled = currentGoal.videos >= MAX_VIDEOS;
    }

    // Minutes buttons
    const minutesDecreaseBtn = document.getElementById("goal-minutes-decrease");
    const minutesIncreaseBtn = document.getElementById("goal-minutes-increase");

    if (minutesDecreaseBtn) {
        minutesDecreaseBtn.disabled = currentGoal.minutes <= MIN_MINUTES;
    }
    if (minutesIncreaseBtn) {
        minutesIncreaseBtn.disabled = currentGoal.minutes >= MAX_MINUTES;
    }
}

/**
 * Show visual feedback when goal is updated
 */
function showGoalUpdateFeedback(type, newValue) {
    const textElement = type === "videos"
        ? document.getElementById("goal-videos-text")
        : document.getElementById("goal-minutes-text");

    if (textElement) {
        // Add pulse animation
        textElement.classList.add("goal-updated");

        // Remove animation class after it completes
        setTimeout(() => {
            textElement.classList.remove("goal-updated");
        }, 300);
    }
}

/**
 * Get current goal values (for external use)
 */
export function getCurrentGoalValues() {
    return getTodayGoal();
}
