/**
 * Notes Integration - Bridge between old and new notes system
 * This file maintains backward compatibility while using the enhanced notes system
 */

import { course, save } from "./storage.js";
import { toast } from "./toast.js";
import { renderCourse } from "./courseRenderer.js";
import { openNotesEditorModal } from "./notes/notesEditor.js";
import {
  createNote,
  getNotesForVideo,
  getNotesForSection,
  updateNote
} from "./notes/notesManager.js";

/**
 * Open enhanced notes modal for video or section
 * @param {string} type - 'video' or 'section'
 * @param {number} si - Section index
 * @param {number} vi - Video index (optional, for video notes)
 */
export async function openNotesModal(type, si, vi = null) {
  let videoId = null;
  let sectionId = null;
  let courseId = course.id;
  let title = "";

  if (type === "section") {
    const section = course.sections[si];
    sectionId = si; // Using index as ID for now
    title = section.title;
  } else if (type === "video") {
    const video = course.sections[si].videos[vi];
    videoId = `${si}-${vi}`; // Composite ID: sectionIndex-videoIndex
    sectionId = si;
    title = video.title;
  }

  // Check if there's an old-style note to migrate
  const targetObject = type === "section"
    ? course.sections[si]
    : course.sections[si].videos[vi];

  let existingNoteId = null;

  // If old note exists, migrate it to new system
  if (targetObject.notes && targetObject.notes.trim()) {
    try {
      // Check if we already migrated this note
      const existingNotes = type === "video"
        ? await getNotesForVideo(videoId)
        : await getNotesForSection(sectionId);

      if (existingNotes.length === 0) {
        // Migrate old note to new system
        const migratedNote = await createNote({
          title: `Migrated: ${title}`,
          content: `<p>${targetObject.notes.replace(/\n/g, '<br>')}</p>`,
          contentType: 'html',
          videoId: type === "video" ? videoId : null,
          sectionId: sectionId,
          courseId: courseId,
          tags: ['migrated']
        });

        existingNoteId = migratedNote.id;

        // Clear old note
        targetObject.notes = "";
        save();

        toast('Note migrated to new system!', 'success');
      } else {
        // Use first existing note
        existingNoteId = existingNotes[0].id;
      }
    } catch (error) {
      console.error('Error migrating note:', error);
    }
  }

  // Open enhanced notes editor
  await openNotesEditorModal({
    noteId: existingNoteId,
    videoId: type === "video" ? videoId : null,
    sectionId: sectionId,
    courseId: courseId,
    onSave: async (savedNote) => {
      toast('Note saved successfully!', 'success');
      // Refresh the course display to show new notes
      renderCourse();
    }
  });
}

/**
 * Display notes for a video (called from courseRenderer)
 * @param {string} videoId - Video ID
 * @returns {Promise<string>} HTML for notes display
 */
export async function renderVideoNotes(videoId) {
  try {
    const notes = await getNotesForVideo(videoId);

    if (notes.length === 0) {
      return '';
    }

    let html = `
            <div class="video-notes-section">
                <div class="notes-header">
                    <span class="notes-count">📝 ${notes.length} note${notes.length > 1 ? 's' : ''}</span>
                </div>
        `;

    for (const note of notes) {
      const excerpt = note.content
        .replace(/<[^>]*>/g, '') // Strip HTML
        .substring(0, 100);

      html += `
                <div class="note-card ${note.isPinned ? 'pinned' : ''}" style="border-left-color: ${note.color}">
                    ${note.title ? `
                        <div class="note-card-header">
                            <div class="note-title">${note.isPinned ? '📌 ' : ''}${note.title}</div>
                        </div>
                    ` : ''}
                    <div class="note-content">
                        ${excerpt}${note.content.length > 100 ? '...' : ''}
                    </div>
                    ${note.tags.length > 0 ? `
                        <div class="note-tags">
                            ${note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${note.timestamp ? `
                        <div class="note-timestamp" onclick="seekToTimestamp(${note.timestamp})">
                            🕐 ${formatTime(note.timestamp)}
                        </div>
                    ` : ''}
                </div>
            `;
    }

    html += '</div>';
    return html;
  } catch (error) {
    console.error('Error rendering video notes:', error);
    return '';
  }
}

/**
 * Format time in MM:SS or HH:MM:SS
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Expose function to window for onclick handlers
if (typeof window !== 'undefined') {
  window.seekToTimestamp = function (seconds) {
    // TODO: Implement video seeking when video player is integrated
    console.log('Seek to:', seconds);
    toast(`Would seek to ${formatTime(seconds)}`, 'info');
  };
}
