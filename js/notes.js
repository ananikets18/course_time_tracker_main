import { course, save } from "./storage.js";
import { openModal, closeModal } from "./modal.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";

export function openNotesModal(type, si, vi = null) {
    let title = "";
    let content = "";
    let targetObject = null;

    if (type === "section") {
        targetObject = course.sections[si];
        title = `Notes: ${targetObject.title}`;
    } else if (type === "video") {
        targetObject = course.sections[si].videos[vi];
        title = `Notes: ${targetObject.title}`;
    }

    content = targetObject.notes || "";

    openModal(`
    <div class="p-1">
      <h3 class="text-base font-bold mb-2 dark:text-sky-400 flex items-center gap-2 truncate pr-4">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        <span class="truncate">${title}</span>
      </h3>
      <div class="space-y-2">
        <textarea id="note-content" class="w-full h-48 border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none" placeholder="Write your notes here...">${content}</textarea>
        <div class="flex justify-between items-center mt-3">
          <span class="text-xs text-slate-400" id="last-saved">
            ${content ? "Has saved notes" : "No notes yet"}
          </span>
          <div class="flex gap-2">
            <button id="n-cancel" class="px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs">Close</button>
            <button id="n-save" class="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white shadow text-xs">Save Notes</button>
          </div>
        </div>
      </div>
    </div>
  `);

    document.getElementById("n-cancel").onclick = closeModal;
    document.getElementById("n-save").onclick = () => {
        const newContent = document.getElementById("note-content").value.trim();
        targetObject.notes = newContent;
        save();
        toast("Notes saved successfully!", "success");
        closeModal();
        renderCourse();
    };
}
