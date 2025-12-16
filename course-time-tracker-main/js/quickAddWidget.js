/**
 * Quick Add Widget - Fast video progress logging
 * Provides a floating action button and modal for quick time entry
 */

import { course, save, getCoursesList } from "./storage.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";
import { todayDate } from "./utils.js";
import { dailyWatchLog } from "./storage.js";

// Memory for last logged video
const MEMORY_KEY = "quickAdd:lastVideo";
const WIDGET_COLLAPSED_KEY = "quickAdd:collapsed";

/**
 * Initialize Quick Add Widget
 */
export function initQuickAddWidget() {
  createFloatingButton();
  setupKeyboardShortcut();
  
  // Restore collapsed state
  const isCollapsed = localStorage.getItem(WIDGET_COLLAPSED_KEY) === "true";
  if (isCollapsed) {
    const fab = document.getElementById("quick-add-fab");
    if (fab) fab.classList.add("collapsed");
  }
}

/**
 * Create floating action button
 */
function createFloatingButton() {
  const fab = document.createElement("button");
  fab.id = "quick-add-fab";
  fab.className = "quick-add-fab";
  fab.setAttribute("aria-label", "Quick Add Progress");
  fab.setAttribute("title", "Quick Add Progress (Ctrl+Shift+L)");
  
  fab.innerHTML = `
    <svg class="fab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span class="fab-text">Quick Log</span>
  `;
  
  fab.onclick = openQuickAddModal;
  document.body.appendChild(fab);
}

/**
 * Setup keyboard shortcut (Ctrl+Shift+L or Cmd+Shift+L)
 */
function setupKeyboardShortcut() {
  document.addEventListener("keydown", (e) => {
    // Ctrl+Shift+L (Windows/Linux) or Cmd+Shift+L (Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") {
      e.preventDefault();
      openQuickAddModal();
    }
  });
}

/**
 * Open Quick Add Modal
 */
export function openQuickAddModal() {
  // Get last logged video from memory
  const lastVideo = getLastLoggedVideo();
  
  // Get all videos from current course
  const allVideos = getAllVideosFromCourse();
  
  if (allVideos.length === 0) {
    toast("No videos found. Add a video first!", "default");
    return;
  }
  
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.id = "quick-add-overlay";
  overlay.className = "quick-add-overlay";
  
  // Create modal
  const modal = document.createElement("div");
  modal.id = "quick-add-modal";
  modal.className = "quick-add-modal";
  
  modal.innerHTML = `
    <div class="quick-add-header">
      <div class="flex items-center gap-2">
        <div class="quick-add-icon">⚡</div>
        <h3 class="quick-add-title">Quick Log Progress</h3>
      </div>
      <button id="quick-add-close" class="quick-add-close" aria-label="Close">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <div class="quick-add-body">
      ${lastVideo ? `
        <div class="quick-add-last-video">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Continue with last video</span>
          </div>
          <button id="continue-last-video" class="continue-last-btn">
            <div class="flex-1 text-left">
              <div class="font-medium text-sm">${lastVideo.title}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${lastVideo.sectionTitle}</div>
            </div>
            <svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        <div class="quick-add-divider">
          <span>or select a video</span>
        </div>
      ` : ''}
      
      <div class="quick-add-search-wrapper">
        <svg class="quick-add-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          id="quick-add-search" 
          class="quick-add-search" 
          placeholder="Search videos..."
          autocomplete="off"
        />
      </div>
      
      <div id="quick-add-video-list" class="quick-add-video-list">
        ${renderVideoList(allVideos)}
      </div>
      
      <div id="quick-add-time-section" class="quick-add-time-section hidden">
        <div class="selected-video-info">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-600 dark:text-slate-400">Selected Video</span>
            <button id="change-video-btn" class="text-xs text-sky-600 dark:text-sky-400 hover:underline">
              Change
            </button>
          </div>
          <div id="selected-video-display" class="selected-video-display"></div>
        </div>
        
        <div class="time-buttons-label">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Add Time</span>
        </div>
        
        <div class="time-buttons-grid">
          <button class="time-btn" data-minutes="5">+5 min</button>
          <button class="time-btn" data-minutes="10">+10 min</button>
          <button class="time-btn" data-minutes="15">+15 min</button>
          <button class="time-btn" data-minutes="20">+20 min</button>
          <button class="time-btn" data-minutes="30">+30 min</button>
          <button class="time-btn time-btn-custom" data-minutes="custom">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Custom
          </button>
        </div>
        
        <div id="custom-time-input" class="custom-time-input hidden">
          <label class="text-xs font-medium text-slate-600 dark:text-slate-400">
            Custom Minutes
          </label>
          <div class="flex gap-2 mt-1">
            <input 
              type="number" 
              id="custom-minutes" 
              class="custom-minutes-field" 
              placeholder="e.g., 25"
              min="1"
            />
            <button id="add-custom-time" class="add-custom-btn">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Setup event listeners
  setupModalListeners(lastVideo, allVideos);
  
  // Focus search input
  setTimeout(() => {
    document.getElementById("quick-add-search")?.focus();
  }, 100);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add("active");
  });
}

/**
 * Setup modal event listeners
 */
function setupModalListeners(lastVideo, allVideos) {
  const overlay = document.getElementById("quick-add-overlay");
  const closeBtn = document.getElementById("quick-add-close");
  const searchInput = document.getElementById("quick-add-search");
  const videoList = document.getElementById("quick-add-video-list");
  const timeSection = document.getElementById("quick-add-time-section");
  const changeVideoBtn = document.getElementById("change-video-btn");
  const customTimeBtn = document.querySelector(".time-btn-custom");
  const customTimeInput = document.getElementById("custom-time-input");
  const addCustomBtn = document.getElementById("add-custom-time");
  const continueLastBtn = document.getElementById("continue-last-video");
  
  let selectedVideo = null;
  
  // Close modal
  const closeModal = () => {
    overlay.classList.remove("active");
    setTimeout(() => overlay.remove(), 300);
  };
  
  closeBtn?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  
  // ESC key to close
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
  
  // Continue with last video
  if (continueLastBtn && lastVideo) {
    continueLastBtn.addEventListener("click", () => {
      selectVideo(lastVideo);
    });
  }
  
  // Search functionality
  searchInput?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allVideos.filter(v => 
      v.title.toLowerCase().includes(query) || 
      v.sectionTitle.toLowerCase().includes(query)
    );
    videoList.innerHTML = renderVideoList(filtered);
    attachVideoListeners();
  });
  
  // Video selection
  function attachVideoListeners() {
    document.querySelectorAll(".quick-add-video-item").forEach(item => {
      item.addEventListener("click", () => {
        const si = parseInt(item.dataset.si);
        const vi = parseInt(item.dataset.vi);
        const video = allVideos.find(v => v.si === si && v.vi === vi);
        if (video) selectVideo(video);
      });
    });
  }
  attachVideoListeners();
  
  // Select video
  function selectVideo(video) {
    selectedVideo = video;
    
    // Hide video list, show time section
    videoList.classList.add("hidden");
    searchInput.parentElement.classList.add("hidden");
    timeSection.classList.remove("hidden");
    
    // Display selected video
    const display = document.getElementById("selected-video-display");
    const progress = Math.round((video.watched / video.length) * 100);
    const watchedMin = Math.floor(video.watched / 60);
    const totalMin = Math.floor(video.length / 60);
    
    display.innerHTML = `
      <div class="font-medium text-sm mb-1">${video.title}</div>
      <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${video.sectionTitle}</div>
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div class="bg-sky-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
        </div>
        <span class="text-xs font-medium text-slate-600 dark:text-slate-400">${watchedMin}/${totalMin}m</span>
      </div>
    `;
  }
  
  // Change video
  changeVideoBtn?.addEventListener("click", () => {
    videoList.classList.remove("hidden");
    searchInput.parentElement.classList.remove("hidden");
    timeSection.classList.add("hidden");
    customTimeInput.classList.add("hidden");
    selectedVideo = null;
  });
  
  // Time buttons
  document.querySelectorAll(".time-btn:not(.time-btn-custom)").forEach(btn => {
    btn.addEventListener("click", () => {
      const minutes = parseInt(btn.dataset.minutes);
      if (selectedVideo) {
        addProgressToVideo(selectedVideo, minutes);
        closeModal();
      }
    });
  });
  
  // Custom time button
  customTimeBtn?.addEventListener("click", () => {
    customTimeInput.classList.toggle("hidden");
    if (!customTimeInput.classList.contains("hidden")) {
      document.getElementById("custom-minutes")?.focus();
    }
  });
  
  // Add custom time
  const addCustomTime = () => {
    const customMinutes = parseInt(document.getElementById("custom-minutes")?.value);
    if (customMinutes && customMinutes > 0 && selectedVideo) {
      addProgressToVideo(selectedVideo, customMinutes);
      closeModal();
    } else {
      toast("Please enter a valid number of minutes", "default");
    }
  };
  
  addCustomBtn?.addEventListener("click", addCustomTime);
  
  // Enter key on custom input
  document.getElementById("custom-minutes")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addCustomTime();
    }
  });
}

/**
 * Add progress to a video
 */
function addProgressToVideo(videoInfo, minutes) {
  const { si, vi } = videoInfo;
  const video = course.sections[si].videos[vi];
  
  const secondsToAdd = minutes * 60;
  const previousWatched = video.watched || 0;
  const newWatched = Math.min(previousWatched + secondsToAdd, video.length);
  const actualAdded = newWatched - previousWatched;
  
  // Update video progress
  video.watched = newWatched;
  
  // Update today's contribution
  const prevAddedToday = video.addedToday || 0;
  video.addedToday = Math.min(prevAddedToday + actualAdded, video.length);
  
  // Update daily log
  const today = todayDate();
  dailyWatchLog[today] = (dailyWatchLog[today] || 0) + actualAdded;
  
  // Save and render
  save();
  renderCourse();
  
  // Remember this video
  saveLastLoggedVideo(videoInfo);
  
  // Show success toast
  const addedMin = Math.floor(actualAdded / 60);
  const totalMin = Math.floor(video.length / 60);
  const watchedMin = Math.floor(newWatched / 60);
  const progress = Math.round((newWatched / video.length) * 100);
  
  if (newWatched >= video.length) {
    toast(`✨ Completed: ${video.title}`, "success");
  } else {
    toast(`+${addedMin} min added to "${video.title}" (${watchedMin}/${totalMin}m, ${progress}%)`, "success");
  }
}

/**
 * Get all videos from current course
 */
function getAllVideosFromCourse() {
  const videos = [];
  
  course.sections.forEach((section, si) => {
    section.videos.forEach((video, vi) => {
      videos.push({
        si,
        vi,
        title: video.title,
        sectionTitle: section.title,
        length: video.length,
        watched: video.watched || 0
      });
    });
  });
  
  return videos;
}

/**
 * Render video list
 */
function renderVideoList(videos) {
  if (videos.length === 0) {
    return `
      <div class="text-center py-8 text-slate-500 dark:text-slate-400">
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm">No videos found</p>
      </div>
    `;
  }
  
  return videos.map(video => {
    const progress = Math.round((video.watched / video.length) * 100);
    const watchedMin = Math.floor(video.watched / 60);
    const totalMin = Math.floor(video.length / 60);
    const isComplete = video.watched >= video.length;
    
    return `
      <button class="quick-add-video-item" data-si="${video.si}" data-vi="${video.vi}">
        <div class="flex-1 text-left">
          <div class="flex items-center gap-2 mb-1">
            ${isComplete ? '<span class="text-green-500">✓</span>' : ''}
            <span class="font-medium text-sm">${video.title}</span>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">${video.sectionTitle}</div>
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
              <div class="bg-sky-500 h-1.5 rounded-full transition-all" style="width: ${progress}%"></div>
            </div>
            <span class="text-xs text-slate-600 dark:text-slate-400">${watchedMin}/${totalMin}m</span>
          </div>
        </div>
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    `;
  }).join('');
}

/**
 * Save last logged video to memory
 */
function saveLastLoggedVideo(videoInfo) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify({
    si: videoInfo.si,
    vi: videoInfo.vi,
    title: videoInfo.title,
    sectionTitle: videoInfo.sectionTitle,
    timestamp: Date.now()
  }));
}

/**
 * Get last logged video from memory
 */
function getLastLoggedVideo() {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if video still exists
    const section = course.sections[data.si];
    if (!section) return null;
    
    const video = section.videos[data.vi];
    if (!video) return null;
    
    // Check if it was logged recently (within last 24 hours)
    const hoursSince = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (hoursSince > 24) return null;
    
    return {
      si: data.si,
      vi: data.vi,
      title: video.title,
      sectionTitle: section.title,
      length: video.length,
      watched: video.watched || 0
    };
  } catch (e) {
    return null;
  }
}
