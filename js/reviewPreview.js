/**
 * Review Preview Module
 * Handles the display and interaction of review preview list in Reviews widget
 */

import { getDueReviews, processReview } from "./spacedRepetition.js";
import { updateDashboard } from "./dashboard.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";

/**
 * Initialize review preview functionality
 */
export function initReviewPreview() {
  // No initialization needed - reviews are shown in scrollable list
}

/**
 * Update review preview display
 */
export function updateReviewPreview() {
  const dueReviews = getDueReviews();
  const previewSection = document.getElementById("review-preview-section");
  const previewList = document.getElementById("review-preview-list");

  if (!previewSection || !previewList) return;

  // Show/hide section based on reviews
  if (dueReviews.length > 0) {
    previewSection.classList.remove("hidden");
    renderReviewList(dueReviews);
  } else {
    previewSection.classList.add("hidden");
  }
}

/**
 * Render review list
 */
function renderReviewList(reviews) {
  const previewList = document.getElementById("review-preview-list");
  if (!previewList) return;

  // Show top 5 reviews initially
  const displayReviews = reviews.slice(0, 5);
  const hasMore = reviews.length > 5;

  previewList.innerHTML = displayReviews.map((review, index) => {
    const { video, sectionTitle, si, vi } = review;
    const daysOverdue = getDaysOverdue(video.nextReviewDate);
    const urgencyClass = getUrgencyClass(daysOverdue);
    const urgencyIcon = getUrgencyIcon(daysOverdue);

    return `
      <li class="bg-white/5 backdrop-blur-sm rounded-lg p-2 hover:bg-white/10 transition-all">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 mb-1">
              <span class="${urgencyClass} flex-shrink-0">${urgencyIcon}</span>
              <span class="text-white font-medium truncate text-xs flex-1" title="${video.title}">${video.title}</span>
            </div>
            <div class="text-white/60 text-xs truncate" title="${sectionTitle}">${sectionTitle}</div>
            <div class="text-white/50 text-xs mt-0.5">
              ${daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Due today'}
            </div>
          </div>
          <button 
            class="review-mark-btn flex-shrink-0 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs text-white transition-all"
            data-si="${si}"
            data-vi="${vi}"
            title="Mark as reviewed">
            ✓
          </button>
        </div>
      </li>
    `;
  }).join('');

  // Show "more reviews" indicator if needed
  if (hasMore) {
    previewList.innerHTML += `
      <li class="text-white/50 text-xs text-center py-1">
        +${reviews.length - 5} more reviews
      </li>
    `;
  }

  // Add event listeners to mark buttons
  document.querySelectorAll('.review-mark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const si = parseInt(btn.dataset.si);
      const vi = parseInt(btn.dataset.vi);
      markAsReviewed(si, vi);
    });
  });

  // Reviews are now shown in a scrollable list - no toggle needed
}

/**
 * Mark video as reviewed
 */
async function markAsReviewed(si, vi) {
  const { course } = await import("./storage.js");
  const video = course.sections[si]?.videos[vi];

  if (!video) return;

  processReview(video);
  toast(`✓ "${video.title}" marked as reviewed`, "success");

  // Update displays
  updateDashboard();
  renderCourse();
  updateReviewPreview();
}

/**
 * Get days overdue
 */
function getDaysOverdue(nextReviewDate) {
  const today = new Date();
  const reviewDate = new Date(nextReviewDate);
  const diffTime = today - reviewDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get urgency class based on days overdue
 */
function getUrgencyClass(daysOverdue) {
  if (daysOverdue > 7) return "text-red-400";
  if (daysOverdue > 3) return "text-yellow-400";
  return "text-green-400";
}

/**
 * Get urgency icon
 */
function getUrgencyIcon(daysOverdue) {
  if (daysOverdue > 7) return "🔴";
  if (daysOverdue > 3) return "🟡";
  return "🟢";
}
