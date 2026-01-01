/**
 * Time Breakdown Module
 * Handles the display of detailed time breakdown in Today widget
 */

import { course, dailyWatchLog } from "./storage.js";
import { todayDate, secondsToMinutesLabel } from "./utils.js";

let isBreakdownVisible = false;

/**
 * Initialize time breakdown functionality
 */
export function initTimeBreakdown() {
    const timeBtn = document.getElementById("time-today-btn");
    const closeBtn = document.getElementById("close-breakdown");

    if (timeBtn) {
        timeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent widget collapse
            toggleBreakdown();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            hideBreakdown();
        });
    }
}

/**
 * Toggle breakdown visibility
 */
function toggleBreakdown() {
    if (isBreakdownVisible) {
        hideBreakdown();
    } else {
        showBreakdown();
    }
}

/**
 * Show breakdown
 */
function showBreakdown() {
    const breakdownSection = document.getElementById("time-breakdown-section");
    if (!breakdownSection) return;

    updateBreakdownDisplay();
    breakdownSection.classList.remove("hidden");
    isBreakdownVisible = true;
}

/**
 * Hide breakdown
 */
function hideBreakdown() {
    const breakdownSection = document.getElementById("time-breakdown-section");
    if (!breakdownSection) return;

    breakdownSection.classList.add("hidden");
    isBreakdownVisible = false;
}

/**
 * Calculate today's time breakdown by section
 */
function calculateTodayBreakdown() {
    const today = todayDate();
    const breakdown = [];

    if (!course.sections) return breakdown;

    // Calculate time per section
    course.sections.forEach((section, si) => {
        let sectionTime = 0;
        const videos = [];

        section.videos.forEach((video, vi) => {
            const addedToday = video.addedToday || 0;
            if (addedToday > 0) {
                sectionTime += addedToday;
                videos.push({
                    title: video.title,
                    time: addedToday,
                    index: vi
                });
            }
        });

        if (sectionTime > 0) {
            breakdown.push({
                sectionTitle: section.title,
                totalTime: sectionTime,
                videos: videos.sort((a, b) => b.time - a.time), // Sort by time desc
                index: si
            });
        }
    });

    // Sort sections by total time (descending)
    return breakdown.sort((a, b) => b.totalTime - a.totalTime);
}

/**
 * Update breakdown display
 */
function updateBreakdownDisplay() {
    const breakdownList = document.getElementById("time-breakdown-list");
    if (!breakdownList) return;

    const breakdown = calculateTodayBreakdown();

    if (breakdown.length === 0) {
        breakdownList.innerHTML = `
      <div class="text-white/60 text-center py-2">
        No activity recorded today yet
      </div>
    `;
        return;
    }

    // Calculate total
    const totalSeconds = breakdown.reduce((sum, section) => sum + section.totalTime, 0);

    // Show top 5 sections max to prevent overflow
    const displayBreakdown = breakdown.slice(0, 5);
    const hasMore = breakdown.length > 5;

    breakdownList.innerHTML = displayBreakdown.map(section => {
        const sectionMinutes = Math.floor(section.totalTime / 60);
        const percentage = Math.round((section.totalTime / totalSeconds) * 100);

        return `
      <div class="space-y-1">
        <!-- Section Header -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-2 h-2 rounded-full bg-white/60 flex-shrink-0"></div>
            <span class="text-white font-medium truncate" title="${section.sectionTitle}">${section.sectionTitle}</span>
          </div>
          <span class="text-white/80 font-semibold ml-2 flex-shrink-0">${sectionMinutes}m</span>
        </div>
        
        <!-- Progress Bar -->
        <div class="ml-4">
          <div class="w-full bg-white/20 rounded-full h-1 overflow-hidden">
            <div class="bg-white h-1 rounded-full transition-all" style="width: ${percentage}%"></div>
          </div>
        </div>
        
        <!-- Top Videos (show max 2 to save space) -->
        ${section.videos.length > 1 ? `
          <div class="ml-4 space-y-0.5 mt-1">
            ${section.videos.slice(0, 2).map(video => `
              <div class="flex items-center justify-between gap-2 text-white/60">
                <span class="truncate text-xs flex-1" title="${video.title}">• ${video.title}</span>
                <span class="text-xs flex-shrink-0">${Math.floor(video.time / 60)}m</span>
              </div>
            `).join('')}
            ${section.videos.length > 2 ? `
              <div class="text-white/50 text-xs">
                +${section.videos.length - 2} more
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
    }).join('');

    // Show "more sections" indicator if needed
    if (hasMore) {
        breakdownList.innerHTML += `
      <div class="text-white/50 text-xs text-center py-1">
        +${breakdown.length - 5} more sections
      </div>
    `;
    }

    // Add total summary at the bottom
    if (breakdown.length > 1) {
        const totalMinutes = Math.floor(totalSeconds / 60);
        breakdownList.innerHTML += `
      <div class="pt-2 mt-2 border-t border-white/20">
        <div class="flex items-center justify-between font-semibold">
          <span class="text-white/80">Total</span>
          <span class="text-white">${totalMinutes}m</span>
        </div>
      </div>
    `;
    }
}

/**
 * Refresh breakdown if visible
 */
export function refreshBreakdownIfVisible() {
    if (isBreakdownVisible) {
        updateBreakdownDisplay();
    }
}
