/**
 * Daily Summary Modal UI
 * Beautiful modal showing daily progress and smart recommendations
 */

import {
    getTodaySummary,
    analyzeCourseProgress,
    generateRecommendations,
    getMotivationalMessage,
    getEstimatedCompletion
} from "./dailySummary.js";
import { todayDate, secondsToMinutesLabel } from "./utils.js";
import { toast } from "./toast.js";

let modalElement = null;
let lastShownDate = null;

/**
 * Check if modal should be shown today
 */
export function shouldShowDailySummary() {
    const today = todayDate();
    const lastShown = localStorage.getItem('dailySummary:lastShown');

    // Show if never shown or if it's a new day
    if (!lastShown || lastShown !== today) {
        return true;
    }

    return false;
}

/**
 * Mark modal as shown for today
 */
function markAsShown() {
    const today = todayDate();
    localStorage.setItem('dailySummary:lastShown', today);
    lastShownDate = today;
}

/**
 * Show the daily summary modal
 */
export function showDailySummaryModal() {
    if (modalElement) {
        modalElement.remove();
    }

    const summary = getTodaySummary();
    const progress = analyzeCourseProgress();
    const recommendations = generateRecommendations();
    const motivation = getMotivationalMessage();
    const estimation = getEstimatedCompletion();

    modalElement = createModalElement(summary, progress, recommendations, motivation, estimation);
    document.body.appendChild(modalElement);

    // Animate in
    requestAnimationFrame(() => {
        modalElement.classList.add('active');
    });

    markAsShown();
}

/**
 * Close the modal
 */
export function closeDailySummaryModal() {
    if (!modalElement) return;

    modalElement.classList.remove('active');
    setTimeout(() => {
        if (modalElement) {
            modalElement.remove();
            modalElement = null;
        }
    }, 300);
}

/**
 * Create modal HTML element
 */
function createModalElement(summary, progress, recommendations, motivation, estimation) {
    const modal = document.createElement('div');
    modal.id = 'daily-summary-modal';
    modal.className = 'daily-summary-modal';

    // Determine time of day greeting
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    let greetingIcon = '🌅';

    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
        greetingIcon = '☀️';
    } else if (hour >= 17 && hour < 21) {
        greeting = 'Good Evening';
        greetingIcon = '🌆';
    } else if (hour >= 21 || hour < 5) {
        greeting = 'Good Night';
        greetingIcon = '🌙';
    }

    modal.innerHTML = `
    <div class="daily-summary-overlay" onclick="window.closeDailySummaryModal()"></div>
    <div class="daily-summary-content">
      <!-- Header -->
      <div class="daily-summary-header">
        <div class="daily-summary-greeting">
          <span class="greeting-icon">${greetingIcon}</span>
          <h2>${greeting}!</h2>
        </div>
        <button class="daily-summary-close" onclick="window.closeDailySummaryModal()" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Motivational Message -->
      <div class="daily-summary-motivation ${motivation.type}">
        <span class="motivation-icon">${motivation.icon}</span>
        <p>${motivation.message}</p>
      </div>

      <!-- Today's Summary -->
      <div class="daily-summary-section">
        <h3>📊 Today's Progress</h3>
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-value">${summary.timeSpentLabel}</div>
              <div class="stat-label">Time Spent</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">${summary.videosCompleted}</div>
              <div class="stat-label">Videos Completed</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <div class="stat-value">${summary.currentStreak}</div>
              <div class="stat-label">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Progress -->
      <div class="daily-summary-section">
        <h3>📈 Course Progress</h3>
        <div class="progress-overview">
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.completionRate}%"></div>
          </div>
          <div class="progress-stats">
            <span class="progress-percentage">${progress.completionRate}%</span>
            <span class="progress-details">${progress.completedVideos}/${progress.totalVideos} videos</span>
          </div>
        </div>
        <div class="progress-breakdown">
          <div class="breakdown-item completed">
            <span class="breakdown-dot"></span>
            <span>${progress.completedVideos} Completed</span>
          </div>
          <div class="breakdown-item in-progress">
            <span class="breakdown-dot"></span>
            <span>${progress.inProgressVideos} In Progress</span>
          </div>
          <div class="breakdown-item not-started">
            <span class="breakdown-dot"></span>
            <span>${progress.notStartedVideos} Not Started</span>
          </div>
        </div>
        ${estimation ? `
          <div class="estimation-card">
            <span class="estimation-icon">🎯</span>
            <div class="estimation-content">
              <p class="estimation-text">At your current pace (${estimation.avgDailyTime}/day), you'll complete the course in approximately <strong>${estimation.daysRemaining} days</strong></p>
              <p class="estimation-date">Estimated completion: ${formatDate(estimation.completionDate)}</p>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Smart Recommendations -->
      <div class="daily-summary-section">
        <h3>💡 Smart Recommendations for Tomorrow</h3>
        <div class="recommendations-list">
          ${recommendations.length > 0 ? recommendations.map(rec => `
            <div class="recommendation-card ${rec.priority}">
              <div class="recommendation-header">
                <span class="recommendation-icon">${rec.icon}</span>
                <div class="recommendation-title-group">
                  <h4>${rec.title}</h4>
                  <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                </div>
              </div>
              <p class="recommendation-description">${rec.description}</p>
              ${rec.videos && rec.videos.length > 0 ? `
                <div class="recommendation-videos">
                  ${rec.videos.slice(0, 2).map(v => `
                    <div class="recommended-video">
                      <span class="video-bullet">▸</span>
                      <span class="video-title">${v.title || v.sectionTitle}</span>
                      ${v.progress ? `<span class="video-progress">${v.progress}%</span>` : ''}
                    </div>
                  `).join('')}
                  ${rec.videos.length > 2 ? `<div class="more-videos">+${rec.videos.length - 2} more</div>` : ''}
                </div>
              ` : ''}
            </div>
          `).join('') : `
            <div class="no-recommendations">
              <span class="no-rec-icon">🎉</span>
              <p>You're all caught up! Great work!</p>
            </div>
          `}
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="daily-summary-footer">
        <button class="btn-secondary" onclick="window.closeDailySummaryModal()">
          Maybe Later
        </button>
        <button class="btn-primary" onclick="window.closeDailySummaryModal()">
          Let's Go! 🚀
        </button>
      </div>
    </div>
  `;

    return modal;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Manually trigger the modal (for testing or user action)
 */
export function openDailySummary() {
    showDailySummaryModal();
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
    window.closeDailySummaryModal = closeDailySummaryModal;
    window.openDailySummary = openDailySummary;
}
