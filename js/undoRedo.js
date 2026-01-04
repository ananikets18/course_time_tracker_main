/**
 * Undo/Redo System for Course Time Tracker
 * Tracks changes and allows reverting/reapplying operations
 */

import { course, dailyWatchLog, save } from "./storage.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";
import { announceToScreenReader } from "./utils.js";

// History stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 50; // Limit history size to prevent memory issues

/**
 * Create a snapshot of current state
 */
function createSnapshot(actionDescription) {
  return {
    course: JSON.parse(JSON.stringify(course)),
    dailyWatchLog: JSON.parse(JSON.stringify(dailyWatchLog)),
    actionDescription,
    timestamp: Date.now()
  };
}

/**
 * Push action to undo stack
 * @param {string} actionDescription - Description of the action
 */
export function pushToHistory(actionDescription) {
  const snapshot = createSnapshot(actionDescription);
  undoStack.push(snapshot);

  // Limit stack size
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  // Clear redo stack when new action is performed
  redoStack.length = 0;

  updateUndoRedoButtons();
}

/**
 * Restore a snapshot
 */
async function restoreSnapshot(snapshot) {
  // Restore course data
  // IMPORTANT: Update properties instead of reassigning to maintain reference
  course.title = snapshot.course.title;

  // Clear existing sections and add snapshot sections
  course.sections.length = 0;
  course.sections.push(...snapshot.course.sections);

  // Restore daily log
  Object.keys(dailyWatchLog).forEach(key => delete dailyWatchLog[key]);
  Object.assign(dailyWatchLog, snapshot.dailyWatchLog);

  await save();
  renderCourse();
}

/**
 * Undo last action
 */
export async function undo() {
  if (undoStack.length === 0) {
    toast("Nothing to undo", "warning");
    return;
  }

  try {
    // Save current state to redo stack
    const currentSnapshot = createSnapshot("Current state");
    redoStack.push(currentSnapshot);

    // Get previous state from undo stack
    const previousSnapshot = undoStack.pop();

    await restoreSnapshot(previousSnapshot);

    toast(`Undone: ${previousSnapshot.actionDescription}`, "success");
    announceToScreenReader(`Undone ${previousSnapshot.actionDescription}`);

    updateUndoRedoButtons();
  } catch (error) {
    console.error("Error during undo:", error);
    toast("Failed to undo action", "error");
  }
}

/**
 * Redo last undone action
 */
export async function redo() {
  if (redoStack.length === 0) {
    toast("Nothing to redo", "warning");
    return;
  }

  try {
    // Save current state to undo stack
    const currentSnapshot = createSnapshot("Current state");
    undoStack.push(currentSnapshot);

    // Get next state from redo stack
    const nextSnapshot = redoStack.pop();

    await restoreSnapshot(nextSnapshot);

    toast(`Redone: ${nextSnapshot.actionDescription}`, "success");
    announceToScreenReader(`Redone ${nextSnapshot.actionDescription}`);

    updateUndoRedoButtons();
  } catch (error) {
    console.error("Error during redo:", error);
    toast("Failed to redo action", "error");
  }
}

/**
 * Clear all history
 */
export function clearHistory() {
  undoStack.length = 0;
  redoStack.length = 0;
  updateUndoRedoButtons();
}

/**
 * Update undo/redo button states
 */
function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");

  if (undoBtn) {
    undoBtn.disabled = undoStack.length === 0;
    undoBtn.classList.toggle("opacity-50", undoStack.length === 0);
    undoBtn.classList.toggle("cursor-not-allowed", undoStack.length === 0);
  }

  if (redoBtn) {
    redoBtn.disabled = redoStack.length === 0;
    redoBtn.classList.toggle("opacity-50", redoStack.length === 0);
    redoBtn.classList.toggle("cursor-not-allowed", redoStack.length === 0);
  }
}

/**
 * Initialize undo/redo keyboard shortcuts
 */
export function initUndoRedo() {
  // Keyboard shortcuts: Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      redo();
    }
  });

  // Initialize button states
  updateUndoRedoButtons();
}

/**
 * Get history stats (for debugging/UI)
 */
export function getHistoryStats() {
  return {
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    maxHistory: MAX_HISTORY
  };
}
