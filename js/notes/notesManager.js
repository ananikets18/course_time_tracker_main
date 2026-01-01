/**
 * Enhanced Notes Manager - Core CRUD Operations
 * Handles all database operations for notes, tags, and attachments
 */

import { db } from '../db.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get current timestamp
 */
function timestamp() {
    return new Date().toISOString();
}

/**
 * Calculate word count from HTML content
 */
function getWordCount(htmlContent) {
    const text = htmlContent.replace(/<[^>]*>/g, ' ').trim();
    return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count code blocks in content
 */
function getCodeBlockCount(htmlContent) {
    const matches = htmlContent.match(/<pre[^>]*>|```/g);
    return matches ? matches.length : 0;
}

/**
 * Count links in content
 */
function getLinkCount(htmlContent) {
    const matches = htmlContent.match(/<a[^>]*>/g);
    return matches ? matches.length : 0;
}

/**
 * Generate metadata for note
 */
function generateMetadata(content) {
    return {
        wordCount: getWordCount(content),
        codeBlocks: getCodeBlockCount(content),
        links: getLinkCount(content)
    };
}

// ============================================
// NOTES CRUD OPERATIONS
// ============================================

/**
 * Create a new note
 * @param {Object} noteData - Note data
 * @returns {Promise<Object>} Created note
 */
export async function createNote(noteData) {
    try {
        const note = {
            id: generateId(),
            videoId: noteData.videoId || null,
            courseId: noteData.courseId || null,
            sectionId: noteData.sectionId || null,
            title: noteData.title || '',
            content: noteData.content || '',
            contentType: noteData.contentType || 'html',
            timestamp: noteData.timestamp || null, // Video timestamp in seconds
            tags: noteData.tags || [],
            isPinned: noteData.isPinned || false,
            color: noteData.color || '#FEF3C7', // Default yellow
            createdAt: timestamp(),
            updatedAt: timestamp(),
            metadata: generateMetadata(noteData.content || '')
        };

        const id = await db.notes.add(note);
        note.id = id;

        // Update tag usage counts
        if (note.tags.length > 0) {
            await updateTagUsageCounts(note.tags, note.courseId);
        }

        console.log('✅ Note created:', note.id);
        return note;
    } catch (error) {
        console.error('Error creating note:', error);
        throw error;
    }
}

/**
 * Get a single note by ID
 * @param {number} noteId - Note ID
 * @returns {Promise<Object|null>} Note object or null
 */
export async function getNote(noteId) {
    try {
        return await db.notes.get(noteId);
    } catch (error) {
        console.error('Error getting note:', error);
        return null;
    }
}

/**
 * Get all notes for a video
 * @param {number} videoId - Video ID
 * @returns {Promise<Array>} Array of notes
 */
export async function getNotesForVideo(videoId) {
    try {
        return await db.notes
            .where('videoId')
            .equals(videoId)
            .sortBy('createdAt');
    } catch (error) {
        console.error('Error getting notes for video:', error);
        return [];
    }
}

/**
 * Get all notes for a section
 * @param {number} sectionId - Section ID
 * @returns {Promise<Array>} Array of notes
 */
export async function getNotesForSection(sectionId) {
    try {
        return await db.notes
            .where('sectionId')
            .equals(sectionId)
            .sortBy('createdAt');
    } catch (error) {
        console.error('Error getting notes for section:', error);
        return [];
    }
}

/**
 * Get all notes for a course
 * @param {number} courseId - Course ID
 * @returns {Promise<Array>} Array of notes
 */
export async function getNotesForCourse(courseId) {
    try {
        return await db.notes
            .where('courseId')
            .equals(courseId)
            .sortBy('createdAt');
    } catch (error) {
        console.error('Error getting notes for course:', error);
        return [];
    }
}

/**
 * Get all notes (across all courses)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of notes
 */
export async function getAllNotes(options = {}) {
    try {
        let query = db.notes.toCollection();

        // Apply filters
        if (options.isPinned !== undefined) {
            query = query.filter(note => note.isPinned === options.isPinned);
        }

        if (options.courseId) {
            query = query.filter(note => note.courseId === options.courseId);
        }

        if (options.tags && options.tags.length > 0) {
            query = query.filter(note =>
                options.tags.some(tag => note.tags.includes(tag))
            );
        }

        // Sort
        const sortBy = options.sortBy || 'updatedAt';
        const sortOrder = options.sortOrder || 'desc';

        let notes = await query.toArray();

        notes.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];

            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        // Pagination
        if (options.limit) {
            const offset = options.offset || 0;
            notes = notes.slice(offset, offset + options.limit);
        }

        return notes;
    } catch (error) {
        console.error('Error getting all notes:', error);
        return [];
    }
}

/**
 * Update a note
 * @param {number} noteId - Note ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateNote(noteId, updates) {
    try {
        const note = await db.notes.get(noteId);
        if (!note) {
            console.warn('Note not found:', noteId);
            return false;
        }

        const updatedNote = {
            ...note,
            ...updates,
            updatedAt: timestamp()
        };

        // Regenerate metadata if content changed
        if (updates.content) {
            updatedNote.metadata = generateMetadata(updates.content);
        }

        await db.notes.put(updatedNote);

        // Update tag usage counts if tags changed
        if (updates.tags) {
            await updateTagUsageCounts(updates.tags, note.courseId);
        }

        console.log('✅ Note updated:', noteId);
        return true;
    } catch (error) {
        console.error('Error updating note:', error);
        return false;
    }
}

/**
 * Delete a note
 * @param {number} noteId - Note ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteNote(noteId) {
    try {
        // Delete associated attachments first
        const attachments = await db.noteAttachments
            .where('noteId')
            .equals(noteId)
            .toArray();

        if (attachments.length > 0) {
            await db.noteAttachments
                .where('noteId')
                .equals(noteId)
                .delete();
        }

        // Delete the note
        await db.notes.delete(noteId);

        console.log('✅ Note deleted:', noteId);
        return true;
    } catch (error) {
        console.error('Error deleting note:', error);
        return false;
    }
}

/**
 * Toggle pin status of a note
 * @param {number} noteId - Note ID
 * @returns {Promise<boolean>} New pin status
 */
export async function togglePinNote(noteId) {
    try {
        const note = await db.notes.get(noteId);
        if (!note) return false;

        const newPinStatus = !note.isPinned;
        await db.notes.update(noteId, {
            isPinned: newPinStatus,
            updatedAt: timestamp()
        });

        console.log(`✅ Note ${newPinStatus ? 'pinned' : 'unpinned'}:`, noteId);
        return newPinStatus;
    } catch (error) {
        console.error('Error toggling pin:', error);
        return false;
    }
}

/**
 * Bulk delete notes
 * @param {Array<number>} noteIds - Array of note IDs
 * @returns {Promise<number>} Number of deleted notes
 */
export async function bulkDeleteNotes(noteIds) {
    try {
        let deletedCount = 0;

        for (const noteId of noteIds) {
            const success = await deleteNote(noteId);
            if (success) deletedCount++;
        }

        console.log(`✅ Bulk deleted ${deletedCount} notes`);
        return deletedCount;
    } catch (error) {
        console.error('Error bulk deleting notes:', error);
        return 0;
    }
}

// ============================================
// TAG OPERATIONS
// ============================================

/**
 * Create a new tag
 * @param {Object} tagData - Tag data
 * @returns {Promise<Object>} Created tag
 */
export async function createTag(tagData) {
    try {
        // Check if tag already exists
        const existing = await db.noteTags
            .where('name')
            .equalsIgnoreCase(tagData.name)
            .and(tag => tag.courseId === (tagData.courseId || null))
            .first();

        if (existing) {
            console.log('ℹ️ Tag already exists:', tagData.name);
            return existing;
        }

        const tag = {
            id: generateId(),
            name: tagData.name.toLowerCase().trim(),
            color: tagData.color || '#3B82F6', // Default blue
            courseId: tagData.courseId || null, // null = global tag
            usageCount: 0,
            createdAt: timestamp()
        };

        const id = await db.noteTags.add(tag);
        tag.id = id;

        console.log('✅ Tag created:', tag.name);
        return tag;
    } catch (error) {
        console.error('Error creating tag:', error);
        throw error;
    }
}

/**
 * Get all tags
 * @param {number} courseId - Optional course ID filter
 * @returns {Promise<Array>} Array of tags
 */
export async function getAllTags(courseId = null) {
    try {
        if (courseId) {
            return await db.noteTags
                .where('courseId')
                .equals(courseId)
                .or('courseId')
                .equals(null)
                .sortBy('usageCount');
        } else {
            return await db.noteTags.toArray();
        }
    } catch (error) {
        console.error('Error getting tags:', error);
        return [];
    }
}

/**
 * Get tag suggestions based on partial input
 * @param {string} partial - Partial tag name
 * @param {number} courseId - Optional course ID
 * @returns {Promise<Array>} Array of matching tags
 */
export async function getTagSuggestions(partial, courseId = null) {
    try {
        const allTags = await getAllTags(courseId);
        const lowerPartial = partial.toLowerCase();

        return allTags
            .filter(tag => tag.name.includes(lowerPartial))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10);
    } catch (error) {
        console.error('Error getting tag suggestions:', error);
        return [];
    }
}

/**
 * Update tag usage counts
 * @param {Array<string>} tagNames - Array of tag names
 * @param {number} courseId - Course ID
 */
async function updateTagUsageCounts(tagNames, courseId) {
    try {
        for (const tagName of tagNames) {
            // Find or create tag
            let tag = await db.noteTags
                .where('name')
                .equalsIgnoreCase(tagName)
                .and(t => t.courseId === courseId || t.courseId === null)
                .first();

            if (!tag) {
                // Create new tag
                tag = await createTag({ name: tagName, courseId });
            }

            // Count actual usage
            const usageCount = await db.notes
                .filter(note => note.tags.includes(tagName))
                .count();

            // Update usage count
            await db.noteTags.update(tag.id, { usageCount });
        }
    } catch (error) {
        console.error('Error updating tag usage counts:', error);
    }
}

/**
 * Delete a tag
 * @param {number} tagId - Tag ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTag(tagId) {
    try {
        const tag = await db.noteTags.get(tagId);
        if (!tag) return false;

        // Remove tag from all notes
        const notesWithTag = await db.notes
            .filter(note => note.tags.includes(tag.name))
            .toArray();

        for (const note of notesWithTag) {
            const updatedTags = note.tags.filter(t => t !== tag.name);
            await db.notes.update(note.id, {
                tags: updatedTags,
                updatedAt: timestamp()
            });
        }

        // Delete the tag
        await db.noteTags.delete(tagId);

        console.log('✅ Tag deleted:', tag.name);
        return true;
    } catch (error) {
        console.error('Error deleting tag:', error);
        return false;
    }
}

/**
 * Rename a tag
 * @param {number} tagId - Tag ID
 * @param {string} newName - New tag name
 * @returns {Promise<boolean>} Success status
 */
export async function renameTag(tagId, newName) {
    try {
        const tag = await db.noteTags.get(tagId);
        if (!tag) return false;

        const oldName = tag.name;
        const normalizedNewName = newName.toLowerCase().trim();

        // Update tag name
        await db.noteTags.update(tagId, { name: normalizedNewName });

        // Update all notes using this tag
        const notesWithTag = await db.notes
            .filter(note => note.tags.includes(oldName))
            .toArray();

        for (const note of notesWithTag) {
            const updatedTags = note.tags.map(t => t === oldName ? normalizedNewName : t);
            await db.notes.update(note.id, {
                tags: updatedTags,
                updatedAt: timestamp()
            });
        }

        console.log(`✅ Tag renamed: ${oldName} → ${normalizedNewName}`);
        return true;
    } catch (error) {
        console.error('Error renaming tag:', error);
        return false;
    }
}

// ============================================
// ATTACHMENT OPERATIONS
// ============================================

/**
 * Add attachment to note
 * @param {number} noteId - Note ID
 * @param {Object} attachmentData - Attachment data
 * @returns {Promise<Object>} Created attachment
 */
export async function addAttachment(noteId, attachmentData) {
    try {
        const attachment = {
            id: generateId(),
            noteId: noteId,
            type: attachmentData.type, // 'image', 'file', 'link'
            name: attachmentData.name,
            data: attachmentData.data, // Base64 for images, URL for links
            size: attachmentData.size || 0,
            createdAt: timestamp()
        };

        const id = await db.noteAttachments.add(attachment);
        attachment.id = id;

        console.log('✅ Attachment added to note:', noteId);
        return attachment;
    } catch (error) {
        console.error('Error adding attachment:', error);
        throw error;
    }
}

/**
 * Get all attachments for a note
 * @param {number} noteId - Note ID
 * @returns {Promise<Array>} Array of attachments
 */
export async function getAttachmentsForNote(noteId) {
    try {
        return await db.noteAttachments
            .where('noteId')
            .equals(noteId)
            .toArray();
    } catch (error) {
        console.error('Error getting attachments:', error);
        return [];
    }
}

/**
 * Delete an attachment
 * @param {number} attachmentId - Attachment ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAttachment(attachmentId) {
    try {
        await db.noteAttachments.delete(attachmentId);
        console.log('✅ Attachment deleted:', attachmentId);
        return true;
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return false;
    }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get notes statistics
 * @param {number} courseId - Optional course ID
 * @returns {Promise<Object>} Statistics object
 */
export async function getNotesStats(courseId = null) {
    try {
        let notes;

        if (courseId) {
            notes = await getNotesForCourse(courseId);
        } else {
            notes = await db.notes.toArray();
        }

        const stats = {
            total: notes.length,
            pinned: notes.filter(n => n.isPinned).length,
            withTimestamps: notes.filter(n => n.timestamp !== null).length,
            withTags: notes.filter(n => n.tags.length > 0).length,
            totalWords: notes.reduce((sum, n) => sum + (n.metadata?.wordCount || 0), 0),
            totalCodeBlocks: notes.reduce((sum, n) => sum + (n.metadata?.codeBlocks || 0), 0),
            byContentType: {
                html: notes.filter(n => n.contentType === 'html').length,
                markdown: notes.filter(n => n.contentType === 'markdown').length,
                plain: notes.filter(n => n.contentType === 'plain').length
            }
        };

        return stats;
    } catch (error) {
        console.error('Error getting notes stats:', error);
        return null;
    }
}

/**
 * Get most used tags
 * @param {number} limit - Number of tags to return
 * @param {number} courseId - Optional course ID
 * @returns {Promise<Array>} Array of tags sorted by usage
 */
export async function getMostUsedTags(limit = 10, courseId = null) {
    try {
        const tags = await getAllTags(courseId);
        return tags
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting most used tags:', error);
        return [];
    }
}
