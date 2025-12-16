import { openModal, closeModal } from "./modal.js";
import { toast } from "./toast.js";
import { course, save, dailyWatchLog } from "./storage.js";
import { updateDashboard } from "./dashboard.js";
import { renderCourse } from "./courseRenderer.js";
import { todayDate } from "./utils.js";

let timerInterval = null;
let secondsElapsed = 0;
let isPaused = false;
let targetVideoIndex = null;
let targetSectionIndex = null;
let timerStartTime = null; // Track when timer started for accurate time calculation

// Timer state persistence key
const TIMER_STATE_KEY = 'focusTimerState';

// Load timer state from localStorage on module load
function loadTimerState() {
  try {
    const saved = localStorage.getItem(TIMER_STATE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      // Check if timer was running (less than 24 hours ago)
      if (state.startTime && Date.now() - state.startTime < 24 * 60 * 60 * 1000) {
        return state;
      } else {
        // Clear old state
        clearTimerState();
      }
    }
  } catch (error) {
    console.error('Error loading timer state:', error);
  }
  return null;
}

// Save timer state to localStorage
function saveTimerState() {
  try {
    const state = {
      secondsElapsed,
      isPaused,
      targetSectionIndex,
      targetVideoIndex,
      startTime: timerStartTime,
      lastUpdate: Date.now()
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving timer state:', error);
  }
}

// Clear timer state from localStorage
function clearTimerState() {
  try {
    localStorage.removeItem(TIMER_STATE_KEY);
  } catch (error) {
    console.error('Error clearing timer state:', error);
  }
}

// Check if there's an active timer on page load
export function checkAndRestoreTimer() {
  const savedState = loadTimerState();
  if (savedState) {
    // Calculate actual elapsed time based on timestamps
    // For paused timers, use the saved elapsed time
    // For running timers, calculate from start time
    const timeSinceStart = savedState.isPaused
      ? savedState.secondsElapsed
      : Math.floor((Date.now() - savedState.startTime) / 1000);

    // Restore timer with calculated time
    setTimeout(() => {
      secondsElapsed = timeSinceStart;
      isPaused = savedState.isPaused;
      targetSectionIndex = savedState.targetSectionIndex;
      targetVideoIndex = savedState.targetVideoIndex;
      timerStartTime = savedState.startTime;

      // Reopen the timer modal
      openFocusTimerModal(targetSectionIndex, targetVideoIndex, true);

      const statusMsg = savedState.isPaused ? '⏸️ Paused timer restored!' : '⏱️ Focus timer restored!';
      toast(statusMsg, 'info');
    }, 500); // Small delay to ensure page is loaded
  }
}


export function openFocusTimerModal(sectionIndex = null, videoIndex = null, isRestoring = false) {
  targetSectionIndex = sectionIndex;
  targetVideoIndex = videoIndex;

  // Only reset if not restoring
  if (!isRestoring) {
    secondsElapsed = 0;
    isPaused = false;
    timerStartTime = Date.now();
  }

  // If a specific video is selected, get its details
  let videoTitle = "General Study Session";
  let videoDuration = 0;
  let currentWatched = 0;

  if (targetSectionIndex !== null && targetVideoIndex !== null) {
    const video = course.sections[targetSectionIndex].videos[targetVideoIndex];
    videoTitle = video.title;
    videoDuration = video.length;
    currentWatched = video.watched || 0;
  }

  // Add restoration badge if this is a restored timer
  const restoredBadge = isRestoring
    ? '\u003cspan class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full ml-2">\u003csvg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">\u003cpath fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>\u003c/svg\u003eRestored\u003c/span\u003e'
    : '';

  const modalContent = `
    \u003cdiv class="p-2 text-center"\u003e
      \u003cdiv class="mb-6"\u003e
        \u003cdiv class="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl animate-pulse"\u003e
          ⏱️
        \u003c/div\u003e
        \u003ch3 class="text-2xl font-bold text-slate-800 dark:text-white mb-1 flex items-center justify-center"\u003eFocus Timer${restoredBadge}\u003c/h3\u003e
        \u003cp class="text-slate-500 dark:text-slate-400 text-sm truncate max-w-xs mx-auto"\u003e${videoTitle}\u003c/p\u003e
      \u003c/div\u003e

      <!-- Timer Display -->
      <div class="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
        <!-- Circular Progress Background -->
        <svg class="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6" class="text-slate-100 dark:text-slate-700" />
          <circle id="timer-progress-circle" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6" 
            stroke-dasharray="283" stroke-dashoffset="283" stroke-linecap="round" 
            class="text-indigo-500 transition-all duration-1000 ease-linear" />
        </svg>
        
        <!-- Time Text -->
        <div class="z-10 flex flex-col items-center">
          <div id="timer-display" class="text-5xl font-mono font-bold text-slate-800 dark:text-white tracking-wider">00:00</div>
          <div id="timer-status" class="text-xs font-medium text-indigo-500 mt-2 uppercase tracking-widest">Ready</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center gap-4 mb-6">
        <button id="btn-timer-toggle" class="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95">
          <svg id="icon-play" class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <svg id="icon-pause" class="w-8 h-8 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        
        <button id="btn-timer-stop" class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-500 dark:hover:text-rose-400 flex items-center justify-center transition-all" title="Stop & Save">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
        </button>
      </div>

      <p class="text-xs text-slate-400 dark:text-slate-500">
        Keep this window open while studying.
      </p>
    </div>
  `;

  openModal(modalContent);

  // --- Logic ---
  const display = document.getElementById("timer-display");
  const progressCircle = document.getElementById("timer-progress-circle");
  const statusText = document.getElementById("timer-status");
  const btnToggle = document.getElementById("btn-timer-toggle");
  const btnStop = document.getElementById("btn-timer-stop");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");

  // If linking to a video, we can show progress relative to video length
  const totalDuration = videoDuration > 0 ? videoDuration : 3600; // Default to 60m visual circle if no video

  function updateDisplay() {
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
    const s = (secondsElapsed % 60).toString().padStart(2, "0");
    display.textContent = `${m}:${s}`;

    // Update Circle (visual only)
    // We'll loop the circle every 60 minutes if no specific duration
    const progress = videoDuration > 0
      ? Math.min((currentWatched + secondsElapsed) / videoDuration, 1)
      : (secondsElapsed % 3600) / 3600;

    const circumference = 283; // 2 * pi * 45
    const offset = circumference - (progress * circumference);
    progressCircle.style.strokeDashoffset = offset;
  }

  function startTimer() {
    if (timerInterval) return;

    isPaused = false;
    statusText.textContent = "Focusing...";
    iconPlay.classList.add("hidden");
    iconPause.classList.remove("hidden");
    btnToggle.classList.add("bg-amber-500", "hover:bg-amber-600");
    btnToggle.classList.remove("bg-indigo-600", "hover:bg-indigo-700");

    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateDisplay();
      saveTimerState(); // Save state every second
    }, 1000);

    saveTimerState(); // Save immediately when starting
  }

  function pauseTimer() {
    if (!timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;
    isPaused = true;

    statusText.textContent = "Paused";
    iconPlay.classList.remove("hidden");
    iconPause.classList.add("hidden");
    btnToggle.classList.remove("bg-amber-500", "hover:bg-amber-600");
    btnToggle.classList.add("bg-indigo-600", "hover:bg-indigo-700");

    saveTimerState(); // Save paused state
  }

  function stopAndSave() {
    pauseTimer();

    if (secondsElapsed > 5) { // Only save if > 5 seconds
      // 1. Update Daily Log
      const today = todayDate();
      dailyWatchLog[today] = (dailyWatchLog[today] || 0) + secondsElapsed;

      // 2. Update Video Progress (if linked)
      if (targetSectionIndex !== null && targetVideoIndex !== null) {
        const video = course.sections[targetSectionIndex].videos[targetVideoIndex];
        video.watched = (video.watched || 0) + secondsElapsed;
        // Cap at length
        if (video.length > 0 && video.watched > video.length) {
          video.watched = video.length;
        }
      }

      save();
      updateDashboard();
      renderCourse();
      toast(`Saved ${Math.floor(secondsElapsed / 60)}m ${secondsElapsed % 60}s of study time!`, "success");
    } else {
      toast("Session too short, not saved.", "info");
    }

    // Clear timer state from localStorage
    clearTimerState();
    closeModal();
  }

  btnToggle.onclick = () => {
    if (timerInterval) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  btnStop.onclick = stopAndSave;

  // Initialize display with current time (important for restoration)
  updateDisplay();

  // Auto-start only if not restoring or if it was running when saved
  if (!isRestoring || !isPaused) {
    startTimer();
  } else {
    // If restoring a paused timer, set paused UI state
    statusText.textContent = "Paused";
    iconPlay.classList.remove("hidden");
    iconPause.classList.add("hidden");
  }
}
