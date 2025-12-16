// (Keep your existing imports)
import { course, save } from "./storage.js";
import { updateDashboard } from "./dashboard.js";
import { secondsToMinutesLabel, todayDate } from "./utils.js";
import { processReview } from "./spacedRepetition.js";
import {
  openAddVideoModal,
  openEditVideoModal,
  onDeleteVideo,
  onMarkWatched,
  onResetVideo,
} from "./videoActions.js";
import { openEditSectionModal, onDeleteSection } from "./sectionActions.js";
import { openNotesModal } from "./notes.js";
import { getFilteredCourse, highlightSearchTerm, hasActiveFilters, getFilterStats } from "./searchFilter.js";
import { isBulkMode, isVideoSelected, toggleVideoSelection } from "./bulkOperations.js";

// --- Drag helpers (add these to the top of the file) ---
let dragListenersAdded = false;

// --- Persistent accordion open-state (new!) ---
let openSections = new Set();

// --- NEW: Duration calculation helpers ---
function calculateSectionDuration(section) {
  if (!section.videos || section.videos.length === 0) return 0;

  const totalSeconds = section.videos.reduce((sum, video) => {
    return sum + (video.length || 0);
  }, 0);

  return totalSeconds;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
// --- END NEW ---

function createPlaceholder(height) {
  const ph = document.createElement("div");
  ph.className =
    "border-2 border-dashed border-sky-400 rounded-lg my-2 h-20 transition-all duration-200 ease-in-out placeholder-animate";
  ph.id = "drag-placeholder";
  ph.style.height = (height || 80) + "px";
  return ph;
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll("article:not(#drag-placeholder)"),
  ];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function attachContainerDragHandlers() {
  const container = document.getElementById("course-container");
  if (!container || dragListenersAdded) return;

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = getDragAfterElement(container, e.clientY);
    let placeholder = document.getElementById("drag-placeholder");
    const height = window.__dragging?.height || 80;
    if (!placeholder) placeholder = createPlaceholder(height);

    if (!after) {
      if (container.lastElementChild !== placeholder)
        container.appendChild(placeholder);
    } else {
      if (after.previousElementSibling !== placeholder)
        container.insertBefore(placeholder, after);
    }
  });

  container.addEventListener("drop", async (e) => {
    e.preventDefault();
    const placeholder = document.getElementById("drag-placeholder");

    if (!window.__dragging) {
      if (placeholder) placeholder.remove();
      return;
    }

    const fromIndex = window.__dragging.fromIndex;
    const children = Array.from(container.children);
    const phIndex = children.indexOf(placeholder);
    const beforeCount = children
      .slice(0, phIndex)
      .filter((c) => c.tagName === "ARTICLE").length;
    let toIndex = beforeCount;
    if (toIndex > fromIndex) toIndex = toIndex - 1;

    if (fromIndex !== toIndex) {
      const moved = course.sections.splice(fromIndex, 1)[0];
      course.sections.splice(toIndex, 0, moved);
      await save();

      // Move open state along with dragged item:
      const newOpenSections = new Set();
      Array.from(openSections).forEach((i) => {
        if (i === fromIndex) {
          newOpenSections.add(toIndex);
        } else if (fromIndex < toIndex && i > fromIndex && i <= toIndex) {
          newOpenSections.add(i - 1);
        } else if (fromIndex > toIndex && i < fromIndex && i >= toIndex) {
          newOpenSections.add(i + 1);
        } else {
          newOpenSections.add(i);
        }
      });
      openSections = newOpenSections;
    }

    if (placeholder) placeholder.remove();
    delete window.__dragging;
    renderCourse();
  });

  dragListenersAdded = true;
}

window.courseViewMode = "list";

export function renderCourse() {
  const container = document.getElementById("course-container");
  container.innerHTML = "";

  if (window.courseViewMode === "grid") {
    container.classList.remove("space-y-4");
    container.classList.add("grid", "grid-cols-1", "sm:grid-cols-2", "gap-4");
  } else {
    container.classList.remove(
      "grid",
      "grid-cols-1",
      "sm:grid-cols-2",
      "gap-4"
    );
    container.classList.add("space-y-4");
  }

  attachContainerDragHandlers();

  // Use filtered course if filters are active
  const displayCourse = hasActiveFilters() ? getFilteredCourse() : course;

  if (!displayCourse.sections || displayCourse.sections.length === 0) {
    document.getElementById("empty-state").classList.remove("hidden");

    // Show filter stats if filters are active
    if (hasActiveFilters()) {
      const stats = getFilterStats();
      const emptyState = document.getElementById("empty-state");
      emptyState.querySelector("h3").textContent = "No Results Found";
      emptyState.querySelector("p").textContent =
        `No videos match your current filters. ${stats.hidden} video(s) hidden.`;
    }
  } else {
    document.getElementById("empty-state").classList.add("hidden");
  }

  displayCourse.sections.forEach((section, si) => {
    const secEl = document.createElement("article");
    secEl.className =
      "draggable bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm sm:shadow card-glow dark:shadow-none dark:border dark:border-slate-800 dark:hover:border-sky-600 transition-all";

    const header = document.createElement("div");

    // --- Drag Handle ---
    const dragHandle = document.createElement("span");
    dragHandle.className =
      "drag-handle text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center cursor-grab active:cursor-grabbing p-1";
    dragHandle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
      </svg>
    `;
    dragHandle.setAttribute("draggable", "true");
    dragHandle.addEventListener("dragstart", (e) => {
      document.body.style.overflow = "hidden";
      e.dataTransfer.effectAllowed = "move";
      window.__dragging = { fromIndex: si, height: secEl.offsetHeight };
      e.dataTransfer.setData("text/plain", String(si));
      secEl.classList.add("dragging");
    });
    dragHandle.addEventListener("dragend", () => {
      document.body.style.overflow = "";
      secEl.classList.remove("dragging");
      const ph = document.getElementById("drag-placeholder");
      if (ph) ph.remove();
      delete window.__dragging;
    });

    // --- Title & Metadata ---
    const totalDuration = calculateSectionDuration(section);
    const durationLabel = totalDuration > 0 ? ` • ${formatDuration(totalDuration)}` : '';

    const textWrapper = document.createElement("div");
    textWrapper.className = "flex flex-col gap-0.5 min-w-0 flex-1";

    const titleBtn = document.createElement("button");
    titleBtn.className = "accordion-toggle text-left font-semibold text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-snug hover:text-sky-600 dark:hover:text-sky-400 transition-colors w-full break-words";
    titleBtn.textContent = section.title;
    titleBtn.setAttribute("aria-expanded", "false");

    const metaSpan = document.createElement("div");
    metaSpan.className = "text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1";
    metaSpan.innerHTML = `<span>${section.videos.length} videos</span>${durationLabel ? `<span class="opacity-50">•</span><span>${formatDuration(totalDuration)}</span>` : ''}`;

    textWrapper.appendChild(titleBtn);
    textWrapper.appendChild(metaSpan);

    // --- Left Container ---
    const left = document.createElement("div");
    left.className = "flex items-start gap-2 flex-1 min-w-0 w-full";
    left.appendChild(dragHandle);
    left.appendChild(textWrapper);

    // --- Right Container (Buttons) ---
    const right = document.createElement("div");
    right.className = "flex items-center gap-2 flex-shrink-0";

    const hasNotes = !!section.notes;
    const notesBtnClass = hasNotes ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600";
    const notesBtn = `<button class="text-xs px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md font-medium shadow-sm transition-colors ${notesBtnClass}" data-action="notes-section" title="Notes">${hasNotes ? '📝' : '🗒️'}</button>`;

    const addVideoBtn = `<button class="text-xs px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md bg-green-500 hover:bg-green-600 text-white font-medium shadow-sm transition-colors whitespace-nowrap" data-action="add-video">+ Video</button>`;

    const editDeleteBtns =
      section.videos.length > 0
        ? `<button class="text-xs px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md bg-amber-400 hover:bg-amber-500 text-white font-medium shadow-sm transition-colors" data-action="edit-section">Edit</button>
         <button class="text-xs px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-sm transition-colors" data-action="delete-section">Delete</button>`
        : "";

    right.innerHTML = notesBtn + addVideoBtn + editDeleteBtns;

    // --- Header Layout Logic ---
    if (window.courseViewMode === "grid") {
      header.className = "flex flex-col gap-3";
      right.classList.add("w-full", "justify-end", "pt-3", "border-t", "border-slate-100", "dark:border-slate-700/50");
    } else {
      header.className = "flex flex-col sm:flex-row sm:items-start justify-between gap-4";
    }

    header.appendChild(left);
    header.appendChild(right);
    secEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "accordion-body mt-4 space-y-3";

    if (!section.videos || section.videos.length === 0) {
      body.innerHTML = `<div class="text-sm text-slate-500 dark:text-slate-400">No videos yet. Add one to this section.</div>`;
    } else {
      section.videos.forEach((video, vi) => {
        const v = document.createElement("div");

        // Determine status
        const isComplete = video.watched >= video.length;
        const isInProgress = video.watched > 0 && video.watched < video.length;
        const statusClass = isComplete ? 'status-complete' : isInProgress ? 'status-progress' : 'status-pending';
        const statusIcon = isComplete ? '✓' : isInProgress ? '◐' : '○';
        const statusText = isComplete ? 'Complete' : isInProgress ? 'In Progress' : 'Not Started';

        // Add left border color based on status
        const borderColor = isComplete ? 'border-l-green-500' : isInProgress ? 'border-l-amber-500' : 'border-l-slate-300 dark:border-l-slate-600';

        v.className =
          `flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 border border-slate-200 dark:border-slate-700 ${borderColor} border-l-4 rounded-lg bg-white dark:bg-slate-700 hover:shadow-md transition-shadow`;

        const leftSide = document.createElement("div");
        leftSide.className = "flex items-center gap-3 flex-1 min-w-0";

        // Add checkbox for bulk mode
        if (isBulkMode()) {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 cursor-pointer flex-shrink-0";
          checkbox.checked = isVideoSelected(si, vi);
          checkbox.dataset.video = `${si}-${vi}`;
          checkbox.addEventListener("change", () => toggleVideoSelection(si, vi));
          leftSide.appendChild(checkbox);
        }

        // Progress percentage
        const progressPercent = Math.round((video.watched / Math.max(1, video.length)) * 100);
        const progressBarColor = isComplete ? 'bg-green-500' : isInProgress ? 'bg-amber-500' : 'bg-sky-500';

        leftSide.innerHTML = `
          <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-600 dark:to-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-bold text-sky-600 dark:text-sky-400 flex-shrink-0">
            ${vi + 1}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <div class="font-medium text-slate-700 dark:text-slate-200 truncate">
                ${highlightSearchTerm(video.title)}
              </div>
              <span class="status-badge ${statusClass} flex-shrink-0">
                <span>${statusIcon}</span>
                <span class="hidden sm:inline">${statusText}</span>
              </span>
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-2">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>${secondsToMinutesLabel(video.length)}</span>
              ${progressPercent > 0 ? `<span>• ${progressPercent}%</span>` : ''}
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
              <div class="progress-bar h-1.5 ${progressBarColor} rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        `;

        const rightSide = document.createElement("div");
        rightSide.className = "flex items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-600";

        // --- Notes Button ---
        const notesBtn = document.createElement("button");
        const hasVideoNotes = !!video.notes;
        notesBtn.className = `p-2 rounded ${hasVideoNotes ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"}`;
        notesBtn.setAttribute("title", "Notes");
        notesBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>`;
        notesBtn.addEventListener("click", () => {
          if (course.sections[si] && course.sections[si].videos[vi]) {
            openNotesModal("video", si, vi);
          }
        });
        rightSide.appendChild(notesBtn);

        // --- Review Button (Spaced Repetition) ---
        const today = todayDate();
        const isDueForReview = video.watched >= video.length && video.nextReviewDate && video.nextReviewDate <= today;

        if (isDueForReview) {
          const reviewBtn = document.createElement("button");
          reviewBtn.className = "p-2 rounded bg-purple-500 hover:bg-purple-600 text-white animate-pulse shadow-sm transition-colors";
          reviewBtn.setAttribute("title", "Review Due! Click to mark reviewed");
          reviewBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3M3.343 15.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>`;
          reviewBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            processReview(video);
            // toast("Review complete! Next review scheduled.", "success"); // processReview calls save which might trigger render? No, processReview just saves.
            // We need to re-render to hide the button
            import("./toast.js").then(m => m.toast("Review complete! Next review scheduled.", "success"));
            renderCourse();
          });
          rightSide.appendChild(reviewBtn);
        }

        // --- Focus Timer Button (only for incomplete videos) ---
        if (!isComplete) {
          const focusBtn = document.createElement("button");
          focusBtn.className = "p-2 rounded bg-indigo-500 hover:bg-indigo-600 text-white";
          focusBtn.setAttribute("title", "Start Focus Timer");
          focusBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>`;
          focusBtn.addEventListener("click", () => window.openFocusTimer(si, vi));
          rightSide.appendChild(focusBtn);
        }
        // --------------------------

        const markBtn = document.createElement("button");
        markBtn.className = `p-2 rounded ${video.watched >= video.length
          ? "bg-green-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
          }`;
        markBtn.setAttribute(
          "title",
          video.watched >= video.length ? "Completed" : "Mark Watched"
        );
        markBtn.innerHTML =
          video.watched >= video.length
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="h-5 w-5 text-white">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l6 6 9-14" />
            </svg>
              `
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="h-5 w-5 text-white">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l6 6 9-14" />
            </svg>
            `;
        markBtn.addEventListener("click", () => onMarkWatched(si, vi));

        const resetBtn = document.createElement("button");
        resetBtn.className =
          "p-2 rounded bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500";
        resetBtn.setAttribute("title", "Reset");
        resetBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="h-5 w-5 text-white">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20a8 8 0 0 0-12.9-11.9" />
        </svg>
        `;
        resetBtn.addEventListener("click", () => onResetVideo(si, vi));

        const editBtn = document.createElement("button");
        editBtn.className = "p-2 rounded bg-amber-400 hover:bg-amber-500";
        editBtn.setAttribute("title", "Edit");
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="h-5 w-5 text-white" stroke-width="2" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16 3l5 5-11 11H5v-5L16 3z" />
</svg>`;
        editBtn.addEventListener("click", () => openEditVideoModal(si, vi));

        const delBtn = document.createElement("button");
        delBtn.className = "p-2 rounded bg-rose-500 hover:bg-rose-600";
        delBtn.setAttribute("title", "Delete");
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" class="h-5 w-5 text-white" viewBox="0 0 24 24"  stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M10 11v6M14 11v6" />
                      </svg>
`;
        delBtn.addEventListener("click", () => onDeleteVideo(si, vi));

        rightSide.appendChild(markBtn);
        rightSide.appendChild(resetBtn);
        rightSide.appendChild(editBtn);
        rightSide.appendChild(delBtn);

        v.appendChild(leftSide);
        v.appendChild(rightSide);
        body.appendChild(v);
      });
    }

    secEl.appendChild(body);

    // Persistent Accordion Logic -------------------
    // Restore open state on render:
    if (openSections.has(si)) {
      secEl.classList.add("accordion-open");
      left
        .querySelector(".accordion-toggle")
        .setAttribute("aria-expanded", "true");
    } else {
      left
        .querySelector(".accordion-toggle")
        .setAttribute("aria-expanded", "false");
    }

    // Handle open/close events and update openSections set:
    left.querySelector(".accordion-toggle").addEventListener("click", () => {
      secEl.classList.toggle("accordion-open");
      const expanded = secEl.classList.contains("accordion-open");
      left
        .querySelector(".accordion-toggle")
        .setAttribute("aria-expanded", expanded ? "true" : "false");

      if (expanded) {
        openSections.add(si);
      } else {
        openSections.delete(si);
      }
    });
    // ----------------------------------------------

    // ---- MODIFIED SECTION: Conditional Event Listeners ----
    // Always attach Add Video listener
    right
      .querySelector('[data-action="add-video"]')
      .addEventListener("click", () => openAddVideoModal(si));

    // Attach Notes listener
    right
      .querySelector('[data-action="notes-section"]')
      .addEventListener("click", (e) => {
        e.stopPropagation();
        openNotesModal("section", si);
      });

    // Only attach Edit listener if button exists
    const editBtn = right.querySelector('[data-action="edit-section"]');
    if (editBtn) {
      editBtn.addEventListener("click", () => openEditSectionModal(si));
    }

    // Only attach Delete listener if button exists
    const deleteBtn = right.querySelector('[data-action="delete-section"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => onDeleteSection(si));
    }
    // ---- END MODIFIED SECTION ----

    container.appendChild(secEl);
  });

  updateDashboard();
  // Note: save() removed from here - callers should save when data changes
}

// --- View mode buttons/logic (unchanged) ---
const btnGrid = document.getElementById("btn-grid-view");
const btnList = document.getElementById("btn-list-view");

btnGrid.addEventListener("click", () => {
  window.courseViewMode = "grid";
  renderCourse();
  updateViewButtons();
});

btnList.addEventListener("click", () => {
  window.courseViewMode = "list";
  renderCourse();
  updateViewButtons();
});

function updateViewButtons() {
  if (window.courseViewMode === "grid") {
    btnGrid.classList.add("bg-slate-200", "dark:bg-slate-700");
    btnList.classList.remove("bg-slate-200", "dark:bg-slate-700");
  } else {
    btnList.classList.add("bg-slate-200", "dark:bg-slate-700");
    btnGrid.classList.remove("bg-slate-200", "dark:bg-slate-700");
  }
}

updateViewButtons();
