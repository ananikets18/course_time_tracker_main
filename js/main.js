import { load, course, getCoursesList, getActiveCourseId, switchCourse, addNewCourse, deleteCourse, renameCourse, enableSync } from "./storage.js";
import { renderCourse } from "./courseRenderer.js";
import { openAddSectionModal } from "./sectionActions.js";
import { toast } from "./toast.js";
import { initReminders } from "./reminders.js";
import { openSettingsModal } from "./settings.js";
import { openModal, closeModal } from "./modal.js";
import { openFocusTimerModal, checkAndRestoreTimer } from "./focusTimer.js";
import { initSearchFilterUI } from "./searchFilterUI.js";
import { initWidgetCollapsible } from "./widgetCollapsible.js";
import { initQuickAddWidget } from "./quickAddWidget.js";
import { initUndoRedo } from "./undoRedo.js";
import { initBulkOperations } from "./bulkOperations.js";
import { config } from "./config.js";
import { shouldShowDailySummary, showDailySummaryModal } from "./dailySummaryModal.js";

// Expose functions to window for inline calls
window.openFocusTimer = openFocusTimerModal;

// Show skeleton loader initially
const skeletonLoader = document.getElementById("skeleton-loader");
const mainContent = document.getElementById("main-content-wrapper");

// Show skeleton on load
skeletonLoader.classList.remove("hidden");

// Load data and initialize app
(async function initializeApp() {
  try {
    // Load data from IndexedDB (must complete before rendering)
    await load();

    // Initialize reminders
    initReminders();

    // Auto-connect to Supabase (Config file OR LocalStorage)
    const savedUrl = config.supabase?.url || localStorage.getItem('supabase_url');
    const savedKey = config.supabase?.key || localStorage.getItem('supabase_key');

    if (savedUrl && savedKey) {
      enableSync(savedUrl, savedKey).then(success => {
        if (success) console.log("✅ Auto-connected to Supabase");
      });
    }

    // Initialize search and filter UI
    initSearchFilterUI();

    // Initialize collapsible widgets
    initWidgetCollapsible();

    // Initialize Quick Add Widget
    initQuickAddWidget();

    // Initialize undo/redo system
    initUndoRedo();

    // Initialize bulk operations
    initBulkOperations();

    // Small delay for better UX (skeleton animation)
    await new Promise(resolve => setTimeout(resolve, 400));

    // Hide skeleton
    skeletonLoader.classList.add("hidden");

    // Show main content with fade-in
    mainContent.classList.remove("hidden");

    // Render course after content is visible and data is loaded
    renderCourse();
    updateCourseHeader();

    // Check and restore focus timer if one was running
    checkAndRestoreTimer();

    // Show daily summary modal if it's a new day
    setTimeout(() => {
      if (shouldShowDailySummary()) {
        showDailySummaryModal();
      }
    }, 1500); // Delay to let the user see the main interface first

    console.log('✅ App initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing app:', error);
    // Show error state
    skeletonLoader.classList.add("hidden");
    mainContent.classList.remove("hidden");
    renderCourse();
    updateCourseHeader();
  }
})();

// --- Course Management UI ---
// Desktop elements
const courseSelectorBtn = document.getElementById("course-selector-btn");
const courseDropdown = document.getElementById("course-dropdown");
const courseListDropdown = document.getElementById("course-list-dropdown");
const currentCourseTitle = document.getElementById("current-course-title");
const btnAddNewCourse = document.getElementById("btn-add-new-course");

// Mobile elements
const courseSelectorBtnMobile = document.getElementById("course-selector-btn-mobile");
const courseDropdownMobile = document.getElementById("course-dropdown-mobile");
const courseListDropdownMobile = document.getElementById("course-list-dropdown-mobile");
const currentCourseTitleMobile = document.getElementById("current-course-title-mobile");
const btnAddNewCourseMobile = document.getElementById("btn-add-new-course-mobile");

// Toggle Desktop Dropdown
courseSelectorBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  renderCourseDropdown();
  courseDropdown.classList.toggle("hidden");
});

// Toggle Mobile Dropdown
courseSelectorBtnMobile?.addEventListener("click", (e) => {
  e.stopPropagation();
  renderCourseDropdownMobile();
  courseDropdownMobile.classList.toggle("hidden");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  // Close desktop dropdown
  if (courseDropdown && courseSelectorBtn && !courseDropdown.contains(e.target) && !courseSelectorBtn.contains(e.target)) {
    courseDropdown.classList.add("hidden");
  }
  // Close mobile dropdown
  if (courseDropdownMobile && courseSelectorBtnMobile && !courseDropdownMobile.contains(e.target) && !courseSelectorBtnMobile.contains(e.target)) {
    courseDropdownMobile.classList.add("hidden");
  }
});

function updateCourseHeader() {
  if (course) {
    // Update both desktop and mobile titles
    if (currentCourseTitle) currentCourseTitle.textContent = course.title;
    if (currentCourseTitleMobile) currentCourseTitleMobile.textContent = course.title;
  }
}

function renderCourseDropdown() {
  const courses = getCoursesList();
  const activeId = getActiveCourseId();

  courseListDropdown.innerHTML = courses.map(c => `
    <div class="group flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg mx-2 cursor-pointer ${c.id === activeId ? 'bg-sky-50 dark:bg-sky-900/20' : ''}" 
         data-action="switch-course" 
         data-course-id="${c.id}">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="text-sm font-medium ${c.id === activeId ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'} truncate">${c.title}</span>
        ${c.id === activeId ? '<span class="w-2 h-2 rounded-full bg-sky-500"></span>' : ''}
      </div>
      <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button data-action="rename-course" data-course-id="${c.id}" data-course-title="${escapeHtml(c.title)}" class="p-1 text-slate-400 hover:text-sky-500" title="Rename">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
        <button data-action="delete-course" data-course-id="${c.id}" class="p-1 text-slate-400 hover:text-rose-500" title="Delete">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  `).join("");
}

function renderCourseDropdownMobile() {
  const courses = getCoursesList();
  const activeId = getActiveCourseId();

  courseListDropdownMobile.innerHTML = courses.map(c => `
    <div class="group flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg mx-2 cursor-pointer ${c.id === activeId ? 'bg-sky-50 dark:bg-sky-900/20' : ''}" 
         data-action="switch-course" 
         data-course-id="${c.id}">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="text-sm font-medium ${c.id === activeId ? 'text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-300'} truncate">${c.title}</span>
        ${c.id === activeId ? '<span class="w-2 h-2 rounded-full bg-sky-500"></span>' : ''}
      </div>
      <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button data-action="rename-course" data-course-id="${c.id}" data-course-title="${escapeHtml(c.title)}" class="p-1 text-slate-400 hover:text-sky-500" title="Rename">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
        </button>
        <button data-action="delete-course" data-course-id="${c.id}" class="p-1 text-slate-400 hover:text-rose-500" title="Delete">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  `).join("");
}

// Helper function to escape HTML in data attributes
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event delegation for course dropdown actions (Desktop)
courseListDropdown?.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const courseId = target.dataset.courseId;

  switch (action) {
    case "switch-course":
      if (switchCourse(courseId)) {
        updateCourseHeader();
        renderCourse();
        courseDropdown.classList.add("hidden");
        toast("Switched course", "success");
      }
      break;

    case "rename-course":
      e.stopPropagation();
      const currentTitle = target.dataset.courseTitle;
      const newTitle = prompt("Enter new course name:", currentTitle);
      if (newTitle && newTitle.trim() !== "") {
        if (renameCourse(courseId, newTitle.trim())) {
          renderCourseDropdown();
          updateCourseHeader();
          toast("Course renamed", "success");
        }
      }
      break;

    case "delete-course":
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
        if (deleteCourse(courseId)) {
          renderCourseDropdown();
          updateCourseHeader();
          renderCourse();
          toast("Course deleted", "success");
        } else {
          toast("Cannot delete the only course", "error");
        }
      }
      break;
  }
});

// Event delegation for course dropdown actions (Mobile)
courseListDropdownMobile?.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const courseId = target.dataset.courseId;

  switch (action) {
    case "switch-course":
      if (switchCourse(courseId)) {
        updateCourseHeader();
        renderCourse();
        courseDropdownMobile.classList.add("hidden");
        toast("Switched course", "success");
      }
      break;

    case "rename-course":
      e.stopPropagation();
      const currentTitle = target.dataset.courseTitle;
      const newTitle = prompt("Enter new course name:", currentTitle);
      if (newTitle && newTitle.trim() !== "") {
        if (renameCourse(courseId, newTitle.trim())) {
          renderCourseDropdownMobile();
          updateCourseHeader();
          toast("Course renamed", "success");
        }
      }
      break;

    case "delete-course":
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
        if (deleteCourse(courseId)) {
          renderCourseDropdownMobile();
          updateCourseHeader();
          renderCourse();
          toast("Course deleted", "success");
        } else {
          toast("Cannot delete the only course", "error");
        }
      }
      break;
  }
});

btnAddNewCourse?.addEventListener("click", () => {
  const title = prompt("Enter course name:");
  if (title && title.trim() !== "") {
    addNewCourse(title.trim());
    updateCourseHeader();
    renderCourse();
    courseDropdown.classList.add("hidden");
    toast("New course created!", "success");
  }
});

btnAddNewCourseMobile?.addEventListener("click", () => {
  const title = prompt("Enter course name:");
  if (title && title.trim() !== "") {
    addNewCourse(title.trim());
    updateCourseHeader();
    renderCourse();
    courseDropdownMobile.classList.add("hidden");
    toast("New course created!", "success");
  }
});

// Add Section buttons (using class selector for all instances)
document.querySelectorAll(".btn-add-section").forEach(btn => {
  btn.addEventListener("click", openAddSectionModal);
});

// Empty state CTA button
document.getElementById("empty-add-section")
  ?.addEventListener("click", openAddSectionModal);

// Settings buttons (using class selector)
document.querySelectorAll(".btn-settings").forEach(btn => {
  btn.addEventListener("click", openSettingsModal);
});


// Dark mode toggle - unified handler for all instances
const htmlEl = document.documentElement;

if (
  localStorage.theme === "dark" ||
  (!("theme" in localStorage) &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  htmlEl.classList.add("dark");
} else {
  htmlEl.classList.remove("dark");
}

// Handle all dark mode toggle buttons using class selector
document.querySelectorAll(".btn-dark-mode").forEach(toggleBtn => {
  toggleBtn.addEventListener("click", () => {
    if (htmlEl.classList.contains("dark")) {
      htmlEl.classList.remove("dark");
      localStorage.theme = "light";
      // Update all toggle buttons
      document.querySelectorAll(".btn-dark-mode").forEach(btn => {
        btn.textContent = "🌙";
      });
    } else {
      htmlEl.classList.add("dark");
      localStorage.theme = "dark";
      // Update all toggle buttons
      document.querySelectorAll(".btn-dark-mode").forEach(btn => {
        btn.textContent = "☀️";
      });
    }
  });
});
