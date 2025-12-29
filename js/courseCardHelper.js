/**
 * Helper function to generate detailed course card HTML
 * This should be used in dailySummaryModal.js
 */

import { secondsToMinutesLabel } from "./utils.js";

export function generateCourseCardHTML(course, courseDetails) {
    const hasDetails = courseDetails && courseDetails[course.id];

    return `
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
      
      ${hasDetails ? `
        <!-- Expandable Details -->
        <div class="course-details-toggle">
          <button class="course-expand-btn" data-course-id="${course.id}">
            <span class="expand-icon">▼</span>
            <span>View Details</span>
          </button>
        </div>
        
        <div class="course-details" id="course-details-${course.id}">
          ${courseDetails[course.id].yesterdayVideos.length > 0 ? `
            <div class="detail-section">
              <div class="detail-header">✨ Completed Yesterday</div>
              ${courseDetails[course.id].yesterdayVideos.slice(0, 3).map(v => `
                <div class="detail-video">
                  <span class="video-icon">✓</span>
                  <div class="video-info">
                    <div class="video-name">${v.videoTitle}</div>
                    <div class="video-section">${v.sectionTitle}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${courseDetails[course.id].inProgressVideos.length > 0 ? `
            <div class="detail-section">
              <div class="detail-header">▶️ In Progress</div>
              ${courseDetails[course.id].inProgressVideos.slice(0, 3).map(v => `
                <div class="detail-video">
                  <span class="video-icon">◐</span>
                  <div class="video-info">
                    <div class="video-name">${v.videoTitle}</div>
                    <div class="video-section">${v.sectionTitle} • ${v.progress}% done</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${courseDetails[course.id].reviewsVideos.length > 0 ? `
            <div class="detail-section">
              <div class="detail-header">💡 Reviews Due</div>
              ${courseDetails[course.id].reviewsVideos.slice(0, 3).map(v => `
                <div class="detail-video">
                  <span class="video-icon">🔄</span>
                  <div class="video-info">
                    <div class="video-name">${v.videoTitle}</div>
                    <div class="video-section">${v.sectionTitle}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${courseDetails[course.id].nextVideos.length > 0 ? `
            <div class="detail-section">
              <div class="detail-header">🎯 Next Up</div>
              ${courseDetails[course.id].nextVideos.slice(0, 2).map(v => `
                <div class="detail-video">
                  <span class="video-icon">○</span>
                  <div class="video-info">
                    <div class="video-name">${v.videoTitle}</div>
                    <div class="video-section">${v.sectionTitle} • ${secondsToMinutesLabel(v.duration)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Action Buttons -->
      ${!course.isActive ? `
        <div class="course-actions">
          <button class="course-switch-btn" data-course-id="${course.id}" data-course-name="${course.title}">
            <span>Switch to this course</span>
            <span>→</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}
