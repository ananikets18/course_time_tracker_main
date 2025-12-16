import { course, save } from "./storage.js";
import { toast } from "./toast.js";
import { closeModal, openModal } from "./modal.js";
import { renderCourse } from "./courseRenderer.js";
import { addRealtimeValidation, validateInput } from "./formValidation.js";
import { sanitizeInput, announceToScreenReader } from "./utils.js";
import { setButtonLoading } from "./buttonLoading.js";
import { LIMITS } from "./config.js";
import { pushToHistory } from "./undoRedo.js";

export function openAddSectionModal() {
  openModal(`
  <div class="p-1">
    <h3 class="text-base font-bold mb-2 dark:text-sky-400">Add Section</h3>
    <div class="space-y-2">
      <div class="relative">
        <input 
          id="m-section-name"
          class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all text-sm"
          placeholder="Section name (e.g. Basics)"
        />
      </div>
      <div class="flex justify-end gap-2 mt-3">
        <button 
          id="m-cancel"
          class="px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs"
        >
          Cancel
        </button>
        <button 
          id="m-save"
          class="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white shadow text-xs"
        >
          Add
        </button>
      </div>
    </div>
  </div>

  `);

  // Add real-time validation
  const input = document.getElementById("m-section-name");
  addRealtimeValidation(input, {
    required: true,
    minLength: 2,
    maxLength: 50,
    requiredMessage: "Section name is required",
    minLengthMessage: "Section name must be at least 2 characters",
    maxLengthMessage: "Section name must be less than 50 characters"
  });

  document.getElementById("m-cancel").onclick = closeModal;
  document.getElementById("m-save").onclick = async () => {
    const saveBtn = document.getElementById("m-save");
    
    try {
      // Check max sections limit
      if (course.sections.length >= LIMITS.MAX_SECTIONS) {
        toast(`Maximum ${LIMITS.MAX_SECTIONS} sections reached`, "error");
        return;
      }

      const result = validateInput(input, {
        required: true,
        minLength: 2,
        maxLength: LIMITS.MAX_SECTION_TITLE_LENGTH
      });

      if (!result.isValid) {
        toast(result.errorMessage, "error");
        return;
      }

      // Sanitize input
      const sectionTitle = sanitizeInput(input.value, LIMITS.MAX_SECTION_TITLE_LENGTH);

      // Check for duplicate section names
      const isDuplicate = course.sections.some(
        s => s.title.toLowerCase() === sectionTitle.toLowerCase()
      );
      if (isDuplicate) {
        toast("A section with this name already exists", "warning");
        return;
      }

      setButtonLoading(saveBtn, true);

      pushToHistory("Add section");

      course.sections.push({ title: sectionTitle, videos: [] });
      await save();
      toast("✅ Section added successfully!", "success");
      announceToScreenReader(`Section ${sectionTitle} added successfully`);
      closeModal();
      renderCourse();
    } catch (error) {
      console.error("Error adding section:", error);
      toast("Failed to add section. Please try again.", "error");
      announceToScreenReader("Failed to add section");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };
}

export function openEditSectionModal(si) {
  openModal(`
    <div class="p-1">
      <h3 class="text-base font-bold mb-2 dark:text-amber-400">Edit Section</h3>
      <div class="space-y-2">
        <input 
          id="m-section-name" 
          class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm" 
          placeholder="Section name" 
        />
        <div class="flex justify-end gap-2 mt-3">
          <button 
            id="m-cancel" 
            class="px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs"
          >
            Cancel
          </button>
          <button 
            id="m-save" 
            class="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-white shadow text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>

  `);

  document.getElementById("m-section-name").value = course.sections[si].title;
  document.getElementById("m-cancel").onclick = closeModal;
  document.getElementById("m-save").onclick = async () => {
    const saveBtn = document.getElementById("m-save");
    
    try {
      const rawValue = document.getElementById("m-section-name").value;
      const sectionTitle = sanitizeInput(rawValue, LIMITS.MAX_SECTION_TITLE_LENGTH);
      
      if (!sectionTitle) {
        toast("Section name cannot be empty", "error");
        return;
      }
      if (sectionTitle.length < 2) {
        toast("Section name must be at least 2 characters", "error");
        return;
      }

      // Check for duplicate section names (excluding current section)
      const isDuplicate = course.sections.some(
        (s, idx) => idx !== si && s.title.toLowerCase() === sectionTitle.toLowerCase()
      );
      if (isDuplicate) {
        toast("A section with this name already exists", "warning");
        return;
      }

      setButtonLoading(saveBtn, true);

      pushToHistory("Edit section");

      course.sections[si].title = sectionTitle;
      await save();
      toast("Section updated", "success");
      announceToScreenReader(`Section updated to ${sectionTitle}`);
      closeModal();
      renderCourse();
    } catch (error) {
      console.error("Error updating section:", error);
      toast("Failed to update section. Please try again.", "error");
      announceToScreenReader("Failed to update section");
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };
}

export async function onDeleteSection(si) {
  const section = course.sections[si];
  const videoCount = section.videos.length;
  
  const confirmMessage = videoCount > 0
    ? `Delete section "${section.title}" and all ${videoCount} video(s)?\n\nThis action cannot be undone.`
    : `Delete section "${section.title}"?\n\nThis action cannot be undone.`;
    
  if (!confirm(confirmMessage)) return;

  try {
    pushToHistory("Delete section");

    const sectionName = section.title;
    course.sections.splice(si, 1);
    await save();
    toast("Section deleted", "success");
    announceToScreenReader(`Section ${sectionName} deleted`);
    renderCourse();
  } catch (error) {
    console.error("Error deleting section:", error);
    toast("Failed to delete section. Please try again.", "error");
    announceToScreenReader("Failed to delete section");
  }
}
