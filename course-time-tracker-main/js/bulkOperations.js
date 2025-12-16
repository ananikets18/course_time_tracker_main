/**
 * Bulk Operations System
 * Allows selecting and performing actions on multiple videos at once
 */

import { course, save } from "./storage.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";
import { onMarkWatched } from "./videoActions.js";
import { announceToScreenReader } from "./utils.js";
import { pushToHistory } from "./undoRedo.js";

// Bulk selection state
let bulkSelectionMode = false;
let selectedVideos = new Set(); // Set of "sectionIndex-videoIndex" strings

/**
 * Toggle bulk selection mode
 */
export function toggleBulkMode() {
  bulkSelectionMode = !bulkSelectionMode;
  selectedVideos.clear();
  
  const bulkBtn = document.getElementById("btn-bulk-mode");
  const bulkActions = document.getElementById("bulk-actions-bar");
  
  if (bulkBtn) {
    if (bulkSelectionMode) {
      bulkBtn.classList.add("bg-sky-600", "text-white");
      bulkBtn.classList.remove("bg-slate-200", "text-slate-700", "dark:bg-slate-700", "dark:text-slate-200");
      bulkBtn.textContent = "✓ Bulk Mode";
      announceToScreenReader("Bulk selection mode enabled");
    } else {
      bulkBtn.classList.remove("bg-sky-600", "text-white");
      bulkBtn.classList.add("bg-slate-200", "text-slate-700", "dark:bg-slate-700", "dark:text-slate-200");
      bulkBtn.textContent = "☑️ Bulk";
      announceToScreenReader("Bulk selection mode disabled");
    }
  }
  
  if (bulkActions) {
    bulkActions.classList.toggle("hidden", !bulkSelectionMode);
  }
  
  renderCourse();
  updateBulkActionBar();
}

/**
 * Check if bulk mode is active
 */
export function isBulkMode() {
  return bulkSelectionMode;
}

/**
 * Toggle video selection
 */
export function toggleVideoSelection(si, vi) {
  const key = `${si}-${vi}`;
  
  if (selectedVideos.has(key)) {
    selectedVideos.delete(key);
  } else {
    selectedVideos.add(key);
  }
  
  updateBulkActionBar();
  updateVideoCheckbox(si, vi);
  
  announceToScreenReader(`${selectedVideos.size} videos selected`);
}

/**
 * Check if video is selected
 */
export function isVideoSelected(si, vi) {
  return selectedVideos.has(`${si}-${vi}`);
}

/**
 * Select all videos
 */
export function selectAll() {
  selectedVideos.clear();
  course.sections.forEach((section, si) => {
    section.videos.forEach((_, vi) => {
      selectedVideos.add(`${si}-${vi}`);
    });
  });
  
  renderCourse();
  updateBulkActionBar();
  announceToScreenReader(`All ${selectedVideos.size} videos selected`);
}

/**
 * Deselect all videos
 */
export function deselectAll() {
  const count = selectedVideos.size;
  selectedVideos.clear();
  renderCourse();
  updateBulkActionBar();
  announceToScreenReader(`Deselected ${count} videos`);
}

/**
 * Mark all selected videos as watched
 */
export async function markSelectedWatched() {
  if (selectedVideos.size === 0) {
    toast("No videos selected", "warning");
    return;
  }
  
  const count = selectedVideos.size;
  
  if (!confirm(`Mark ${count} selected video(s) as watched?`)) {
    return;
  }
  
  try {
    pushToHistory(`Mark ${count} videos watched`);
    
    // Convert Set to array and process each video
    const selections = Array.from(selectedVideos);
    for (const key of selections) {
      const [si, vi] = key.split("-").map(Number);
      if (course.sections[si]?.videos[vi]) {
        await onMarkWatched(si, vi);
      }
    }
    
    selectedVideos.clear();
    await save();
    renderCourse();
    updateBulkActionBar();
    
    toast(`✨ Marked ${count} videos as watched!`, "success");
    announceToScreenReader(`Marked ${count} videos as watched`);
  } catch (error) {
    console.error("Error marking videos watched:", error);
    toast("Failed to mark videos as watched", "error");
  }
}

/**
 * Delete all selected videos
 */
export async function deleteSelected() {
  if (selectedVideos.size === 0) {
    toast("No videos selected", "warning");
    return;
  }
  
  const count = selectedVideos.size;
  
  if (!confirm(`Delete ${count} selected video(s)?\n\nThis action cannot be undone.`)) {
    return;
  }
  
  try {
    pushToHistory(`Delete ${count} videos`);
    
    // Convert to array and sort in reverse order to avoid index issues
    const selections = Array.from(selectedVideos)
      .map(key => {
        const [si, vi] = key.split("-").map(Number);
        return { si, vi };
      })
      .sort((a, b) => {
        if (a.si !== b.si) return b.si - a.si;
        return b.vi - a.vi;
      });
    
    // Delete videos (in reverse order to maintain indices)
    for (const { si, vi } of selections) {
      if (course.sections[si]?.videos[vi]) {
        course.sections[si].videos.splice(vi, 1);
      }
    }
    
    selectedVideos.clear();
    await save();
    renderCourse();
    updateBulkActionBar();
    
    toast(`🗑️ Deleted ${count} videos`, "success");
    announceToScreenReader(`Deleted ${count} videos`);
  } catch (error) {
    console.error("Error deleting videos:", error);
    toast("Failed to delete videos", "error");
  }
}

/**
 * Update bulk action bar visibility and count
 */
function updateBulkActionBar() {
  const bulkActions = document.getElementById("bulk-actions-bar");
  const selectedCount = document.getElementById("bulk-selected-count");
  
  if (!bulkActions) return;
  
  if (bulkSelectionMode) {
    bulkActions.classList.remove("hidden");
    if (selectedCount) {
      selectedCount.textContent = `${selectedVideos.size} selected`;
    }
    
    // Enable/disable action buttons based on selection
    const markBtn = document.getElementById("bulk-mark-watched");
    const deleteBtn = document.getElementById("bulk-delete");
    
    const hasSelection = selectedVideos.size > 0;
    if (markBtn) {
      markBtn.disabled = !hasSelection;
      markBtn.classList.toggle("opacity-50", !hasSelection);
      markBtn.classList.toggle("cursor-not-allowed", !hasSelection);
    }
    if (deleteBtn) {
      deleteBtn.disabled = !hasSelection;
      deleteBtn.classList.toggle("opacity-50", !hasSelection);
      deleteBtn.classList.toggle("cursor-not-allowed", !hasSelection);
    }
  } else {
    bulkActions.classList.add("hidden");
  }
}

/**
 * Update individual video checkbox
 */
function updateVideoCheckbox(si, vi) {
  const checkbox = document.querySelector(`[data-video="${si}-${vi}"]`);
  if (checkbox) {
    checkbox.checked = isVideoSelected(si, vi);
  }
}

/**
 * Initialize bulk operations
 */
export function initBulkOperations() {
  // Add event listeners for bulk action buttons
  const bulkBtn = document.getElementById("btn-bulk-mode");
  const selectAllBtn = document.getElementById("bulk-select-all");
  const deselectAllBtn = document.getElementById("bulk-deselect-all");
  const markWatchedBtn = document.getElementById("bulk-mark-watched");
  const deleteBtn = document.getElementById("bulk-delete");
  
  if (bulkBtn) {
    bulkBtn.addEventListener("click", toggleBulkMode);
  }
  
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", selectAll);
  }
  
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", deselectAll);
  }
  
  if (markWatchedBtn) {
    markWatchedBtn.addEventListener("click", markSelectedWatched);
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener("click", deleteSelected);
  }
}
