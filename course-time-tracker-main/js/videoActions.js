import { course, dailyWatchLog, save } from "./storage.js";
import { toast } from "./toast.js";
import { openModal, closeModal } from "./modal.js";
import { renderCourse } from "./courseRenderer.js";
import { minutesToSeconds, todayDate, secondsToMinutesLabel, sanitizeInput, validateNumber, announceToScreenReader } from "./utils.js";
import { setButtonLoading } from "./buttonLoading.js";
import { LIMITS } from "./config.js";
import { pushToHistory } from "./undoRedo.js";
import { triggerConfetti, checkCourseCompletion, checkMilestone, celebrateMilestone } from "./confetti.js";
import { areGoalsMet, isAnyGoalMet } from "./dailyGoals.js";
import { checkAchievements, showAchievementUnlock } from "./achievements.js";
import { scheduleInitialReview, resetReview } from "./spacedRepetition.js";

export function openAddVideoModal(preferredSectionIndex = null) {
  const sectionOptions = course.sections
    .map(
      (s, i) =>
        `<option value="${i}" class="dark:bg-slate-700 dark:text-slate-200">${s.title}</option>`
    )
    .join("");
  openModal(`
    <div class="p-1">
      <h3 class="text-base font-bold mb-2 dark:text-sky-400">Add Video</h3>
      <div class="space-y-2 text-xs dark:text-slate-300">
        <label class="block">Title 
          <input id="m-video-title" class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm" />
        </label>
        <label class="block">Length (minutes) 
          <input id="m-video-length" type="number" min="0" class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm" placeholder="e.g. 8" />
        </label>
        <label class="block">Section
          <select id="m-video-section" class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm">${sectionOptions}</select>
        </label>
        <div class="flex justify-end gap-2 mt-3">
          <button id="m-cancel" class="px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs">Cancel</button>
          <button id="m-save" class="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white shadow text-xs">Add Video</button>
        </div>
      </div>
    </div>
  `);

  if (preferredSectionIndex !== null) {
    document.getElementById("m-video-section").value = String(
      preferredSectionIndex
    );
  }

  document.getElementById("m-cancel").onclick = closeModal;
  document.getElementById("m-save").onclick = async () => {
    const saveBtn = document.getElementById("m-save");
    
    try {
      const rawTitle = document.getElementById("m-video-title").value;
      const rawLength = document.getElementById("m-video-length").value;
      const si = Number(document.getElementById("m-video-section").value);

      // Validate section index
      if (!course.sections[si]) {
        toast("Section not found", "error");
        return;
      }

      // Check max videos limit
      if (course.sections[si].videos.length >= LIMITS.MAX_VIDEOS_PER_SECTION) {
        toast(`Maximum ${LIMITS.MAX_VIDEOS_PER_SECTION} videos per section reached`, "error");
        return;
      }

      // Sanitize and validate title
      const title = sanitizeInput(rawTitle, LIMITS.MAX_TITLE_LENGTH);
      if (!title) {
        toast("Title is required", "error");
        return;
      }
      if (title.length < 2) {
        toast("Title must be at least 2 characters", "error");
        return;
      }

      // Validate length
      const lengthValidation = validateNumber(rawLength, 0.1, LIMITS.MAX_VIDEO_LENGTH_MINUTES);
      if (!lengthValidation.isValid) {
        toast(lengthValidation.error, "error");
        return;
      }

      // Check for duplicate video names in the section
      const isDuplicate = course.sections[si].videos.some(
        v => v.title.toLowerCase() === title.toLowerCase()
      );
      if (isDuplicate) {
        toast("A video with this name already exists in this section", "warning");
        return;
      }

      setButtonLoading(saveBtn, true);

      pushToHistory("Add video");

      const video = { 
        title, 
        length: minutesToSeconds(lengthValidation.value), 
        watched: 0,
        addedToday: 0 // Initialize daily contribution tracker
      };
      course.sections[si].videos.push(video);
      
      await save();
      toast("Video added", "success");
      announceToScreenReader(`Video ${title} added successfully`);
      closeModal();
      renderCourse();
    } catch (error) {
      console.error("Error adding video:", error);
      toast("Failed to add video. Please try again.", "error");
      announceToScreenReader("Failed to add video");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };
}

// --- Edit Video ---
export function openEditVideoModal(si, vi) {
  // Validate indices
  if (!course.sections[si] || !course.sections[si].videos[vi]) {
    toast("Video not found", "error");
    return;
  }
  const video = course.sections[si].videos[vi];
  openModal(`
    <div class="p-1">
      <h3 class="text-base font-bold mb-2 dark:text-amber-400">Edit Video</h3>
      <div class="space-y-2 text-xs dark:text-slate-300">
        <label class="block">Title 
          <input id="m-video-title" class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm" />
        </label>
        <label class="block">Length (minutes) 
          <input id="m-video-length" type="number" min="0" class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm" />
        </label>
        <div class="flex justify-end gap-2 mt-3">
          <button id="m-cancel" class="px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs">Cancel</button>
          <button id="m-save" class="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-white shadow text-xs">Save</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById("m-video-title").value = video.title;
  document.getElementById("m-video-length").value = Math.round(
    video.length / 60
  );
  document.getElementById("m-cancel").onclick = closeModal;
  // open modal code remains same...
  document.getElementById("m-save").onclick = async () => {
    const saveBtn = document.getElementById("m-save");
    
    try {
      const rawTitle = document.getElementById("m-video-title").value;
      const rawLength = document.getElementById("m-video-length").value;

      // Sanitize and validate title
      const title = sanitizeInput(rawTitle, LIMITS.MAX_TITLE_LENGTH);
      if (!title) {
        toast("Title is required", "error");
        return;
      }
      if (title.length < 2) {
        toast("Title must be at least 2 characters", "error");
        return;
      }

      // Validate length
      const lengthValidation = validateNumber(rawLength, 0.1, LIMITS.MAX_VIDEO_LENGTH_MINUTES);
      if (!lengthValidation.isValid) {
        toast(lengthValidation.error, "error");
        return;
      }

      // Check for duplicate video names (excluding current video)
      const isDuplicate = course.sections[si].videos.some(
        (v, idx) => idx !== vi && v.title.toLowerCase() === title.toLowerCase()
      );
      if (isDuplicate) {
        toast("A video with this name already exists in this section", "warning");
        return;
      }

      setButtonLoading(saveBtn, true);

      pushToHistory("Edit video");

      // Subtract previous contribution from daily log
      const prevAdded = video.addedToday || 0;
      dailyWatchLog[todayDate()] = Math.max(
        (dailyWatchLog[todayDate()] || 0) - prevAdded,
        0
      );

      // Update video data
      video.title = title;
      video.length = minutesToSeconds(lengthValidation.value);
      video.watched = Math.min(video.watched, video.length); // adjust watched if new length < old watched
      video.addedToday = Math.min(prevAdded, video.length); // adjust today's contribution if necessary

      // Add adjusted contribution back
      dailyWatchLog[todayDate()] =
        (dailyWatchLog[todayDate()] || 0) + video.addedToday;

      await save();
      toast("Video updated", "success");
      announceToScreenReader(`Video ${title} updated successfully`);
      closeModal();
      renderCourse();
    } catch (error) {
      console.error("Error updating video:", error);
      toast("Failed to update video. Please try again.", "error");
      announceToScreenReader("Failed to update video");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };
}

// --- Delete Video ---
export async function onDeleteVideo(si, vi) {
  // Validate indices
  if (!course.sections[si] || !course.sections[si].videos[vi]) {
    toast("Video not found", "error");
    return;
  }
  const video = course.sections[si].videos[vi];
  
  if (!confirm(`Delete "${video.title}"?\n\nThis action cannot be undone.`)) return;

  try {
    pushToHistory("Delete video");

    // Subtract its contribution from daily log
    const prevAdded = video.addedToday || 0;
    dailyWatchLog[todayDate()] = Math.max(
      (dailyWatchLog[todayDate()] || 0) - prevAdded,
      0
    );

    // Remove from course
    course.sections[si].videos.splice(vi, 1);

    await save();
    toast("Video deleted", "success");
    announceToScreenReader(`Video ${video.title} deleted`);
    renderCourse();
  } catch (error) {
    console.error("Error deleting video:", error);
    toast("Failed to delete video. Please try again.", "error");
    announceToScreenReader("Failed to delete video");
  }
}
export function onMarkWatched(si, vi) {
  const video = course.sections[si].videos[vi];

  // If already fully watched today, do nothing
  if (video.watched >= video.length) {
    toast("Already completed!", "default");
    return;
  }

  // Compute how much to add to daily log
  const addTime = video.length - (video.addedToday || 0);

  // Mark video as watched
  video.watched = video.length;
  scheduleInitialReview(video);

  // Track contribution to today's watch log
  video.addedToday = video.length;

  dailyWatchLog[todayDate()] = (dailyWatchLog[todayDate()] || 0) + addTime;

  // Success feedback (throttled)
  const now = Date.now();
  if (!window.lastCompletionToastTime || now - window.lastCompletionToastTime > 1500) {
    toast(`✨ Completed: ${video.title} `, "success");
    window.lastCompletionToastTime = now;
  }

  // Add pulse animation to the element (if we can find it)
  setTimeout(() => {
    const videoElements = document.querySelectorAll('#course-container article .accordion-body > div');
    if (videoElements[vi]) {
      videoElements[vi].classList.add('pulse-success');
      setTimeout(() => videoElements[vi].classList.remove('pulse-success'), 600);
    }
  }, 100);

  renderCourse();

  // Check for milestones
  setTimeout(() => {
    const milestone = checkMilestone(course);

    if (milestone) {
      // Get previously celebrated milestones from localStorage
      const celebratedKey = 'celebrated_milestones';
      const celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]');

      // Only celebrate if this milestone hasn't been celebrated yet
      if (!celebrated.includes(milestone)) {
        celebrateMilestone(milestone);

        // Mark this milestone as celebrated
        celebrated.push(milestone);
        localStorage.setItem(celebratedKey, JSON.stringify(celebrated));
      }
    }

    // Check if daily goals are met
    const goalsKey = 'goals_met_today';
    const today = todayDate();
    const goalsMet = localStorage.getItem(goalsKey);

    if (areGoalsMet() && goalsMet !== today) {
      // Goals just completed!
      setTimeout(() => {
        toast("🎯 Daily goals complete! You're crushing it!", "success", 4000);
      }, 800);
      localStorage.setItem(goalsKey, today);
    } else if (isAnyGoalMet() && !areGoalsMet()) {
      // One goal met, encourage to complete the other
      // (optional - can be removed if too chatty)
    }

    // Check for newly unlocked achievements
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
      // Show achievement unlocks with delay to avoid toast spam
      newAchievements.forEach((achievement, index) => {
        setTimeout(() => {
          showAchievementUnlock(achievement);
        }, 1200 + (index * 1500)); // Stagger notifications
      });
    }
  }, 300);
}

export async function onResetVideo(si, vi) {
  // Validate indices
  if (!course.sections[si] || !course.sections[si].videos[vi]) {
    toast("Video not found", "error");
    return;
  }
  
  const video = course.sections[si].videos[vi];

  if (video.watched <= 0) {
    toast("Video has no progress to reset", "warning");
    return;
  }

  // Add confirmation for reset action
  if (!confirm(`Reset progress for "${video.title}"?\n\nThis will mark the video as unwatched and clear today's contribution.`)) {
    return;
  }

  try {
    pushToHistory("Reset video progress");

    // Subtract the contribution from today's log
    const subTime = video.addedToday || 0;
    dailyWatchLog[todayDate()] = Math.max(
      (dailyWatchLog[todayDate()] || 0) - subTime,
      0
    );

    // Reset video state
    video.watched = 0;
    video.addedToday = 0;
    resetReview(video);

    await save();
    toast("Reset progress: " + video.title, "success");
    announceToScreenReader(`Reset progress for ${video.title}`);
    renderCourse();
  } catch (error) {
    console.error("Error resetting video:", error);
    toast("Failed to reset video progress. Please try again.", "error");
    announceToScreenReader("Failed to reset video progress");
  }
}
