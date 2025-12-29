/**
 * Enhanced Multi-Course Daily Summary Modal UI
 * Beautiful modal showing yesterday's progress across ALL courses with smart recommendations
 */

import {
  getYesterdayAggregateSummary,
  getYesterdayPerCourseBreakdown,
  generateCrossCourseRecommendations,
  getMotivationalMessage,
  getCourseDetails
} from "./dailySummary.js";
import { todayDate, secondsToMinutesLabel } from "./utils.js";
import { switchCourse } from "./storage.js";

let modalElement = null;

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
}

/**
 * Show the daily summary modal
 */
export async function showDailySummaryModal() {
  if (modalElement) {
    modalElement.remove();
  }

  const aggregate = await getYesterdayAggregateSummary();
  const courseBreakdown = await getYesterdayPerCourseBreakdown();
  const recommendations = await generateCrossCourseRecommendations();
  const motivation = await getMotivationalMessage();

  // Get detailed info for courses with activity
  const courseDetails = {};
  for (const course of courseBreakdown) {
    if (course.hadYesterdayActivity || course.dueReviews > 0 || course.inProgressVideos > 0) {
      courseDetails[course.id] = await getCourseDetails(course.id);
    }
  }

  modalElement = createModalElement(aggregate, courseBreakdown, recommendations, motivation, courseDetails);
  document.body.appendChild(modalElement);

  // Attach event listeners for expandable courses
  attachCourseExpansionListeners();
  attachCourseSwitchListeners();

  // Animate in
  requestAnimationFrame(() => {
    modalElement.classList.add('active');
  });

  markAsShown();
}

/**
 * Attach listeners for course expansion
 */
function attachCourseExpansionListeners() {
  const expandButtons = document.querySelectorAll('.course-expand-btn');
  expandButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      const detailsEl = document.getElementById(`course-details-${courseId}`);
      const icon = btn.querySelector('.expand-icon');

      if (detailsEl) {
        detailsEl.classList.toggle('expanded');
        icon.classList.toggle('rotated');
      }
    });
  });
}

/**
 * Attach listeners for course switching
 */
function attachCourseSwitchListeners() {
  const switchButtons = document.querySelectorAll('.course-switch-btn');
  switchButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      const courseName = btn.dataset.courseName;

      // Switch course
      const success = await switchCourse(courseId);
      if (success) {
        closeDailySummaryModal();
        // Reload to show the switched course
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    });
  });
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
function createModalElement(aggregate, courseBreakdown, recommendations, motivation, courseDetails) {
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

      <!-- Yesterday's Aggregate Summary -->
      <div class="daily-summary-section">
        <h3>📊 Yesterday's Total Activity</h3>
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
              <div class="stat-value">${aggregate.timeSpentLabel}</div>
              <div class="stat-label">Time Spent</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">${aggregate.videosCompleted}</div>
              <div class="stat-label">Videos Completed</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📚</div>
            <div class="stat-content">
              <div class="stat-value">${aggregate.coursesWorkedOn}</div>
              <div class="stat-label">Courses Studied</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-content">
              <div class="stat-value">${aggregate.currentStreak}</div>
              <div class="stat-label">Day Streak</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Per-Course Breakdown -->
      ${courseBreakdown.length > 0 ? `
        <div class="daily-summary-section">
          <h3>📚 Course Breakdown</h3>
          <div class="course-breakdown-list">
            ${courseBreakdown.map(course => `
              <div class="course-breakdown-card ${course.isActive ? 'active-course' : ''} ${course.hadYesterdayActivity ? 'had-activity' : ''}">
                <div class="course-breakdown-header">
                  <div class="course-title-group">
                    <h4>${course.title}</h4>
                    ${course.isActive ? '<span class="active-badge">Active</span>' : ''}
                  </div>
                  <div class="course-completion">${course.completionRate}%</div>
                </div>
                
                <div class="course-progress-bar-container">
                  <div class="course-progress-bar" style="width: ${course.completionRate}%"></div>
                </div>
                
                <div class="course-stats-row">
                  <div class="course-stat">
                    <span class="stat-icon-small">📊</span>
                    <span>${course.completedVideos}/${course.totalVideos} videos</span>
                  </div>
                  ${course.yesterdayCompleted > 0 ? `
                    <div class="course-stat highlight">
                      <span class="stat-icon-small">✨</span>
                      <span>+${course.yesterdayCompleted} yesterday</span>
                    </div>
                  ` : ''}
                  ${course.dueReviews > 0 ? `
                    <div class="course-stat warning">
                      <span class="stat-icon-small">💡</span>
                      <span>${course.dueReviews} reviews due</span>
                    </div>
                  ` : ''}
                </div>
                
                ${course.inProgressVideos > 0 ? `
                  <div class="course-hint">
                    <span>▸</span>
                    <span>${course.inProgressVideos} video${course.inProgressVideos > 1 ? 's' : ''} in progress</span>
                  </div>
                ` : course.notStartedVideos > 0 ? `
                  <div class="course-hint">
                    <span>▸</span>
                    <span>${course.notStartedVideos} video${course.notStartedVideos > 1 ? 's' : ''} remaining</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Smart Cross-Course Recommendations -->
      <div class="daily-summary-section">
        <h3>💡 Smart Recommendations for Today</h3>
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
              ${rec.courses && rec.courses.length > 0 ? `
                <div class="recommendation-courses">
                  ${rec.courses.map(c => `
                    <div class="recommended-course-item">
                      <span class="course-bullet">▸</span>
                      <span class="course-name">${c.title}</span>
                      <span class="course-reviews">${c.reviews} review${c.reviews > 1 ? 's' : ''}</span>
                    </div>
                  `).join('')}
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
 * Manually trigger the modal (for testing or user action)
 */
export async function openDailySummary() {
  await showDailySummaryModal();
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
  window.closeDailySummaryModal = closeDailySummaryModal;
  window.openDailySummary = openDailySummary;
}
