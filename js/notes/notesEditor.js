/**
 * Enhanced Notes Editor Component
 * Rich text editor with Quill.js integration
 */

import { createNote, updateNote, getNote } from './notesManager.js';
import { toast } from '../toast.js';

// ============================================
// QUILL CONFIGURATION
// ============================================

const QUILL_CDN = {
    css: 'https://cdn.quilljs.com/1.3.6/quill.snow.css',
    js: 'https://cdn.quilljs.com/1.3.6/quill.js'
};

const HIGHLIGHT_CDN = {
    css: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
    js: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
};

// Quill toolbar configuration
const TOOLBAR_OPTIONS = [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ 'align': [] }],
    ['clean']
];

// ============================================
// EDITOR CLASS
// ============================================

export class NotesEditor {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = null;
        this.editor = null;
        this.quill = null;
        this.noteId = options.noteId || null;
        this.videoId = options.videoId || null;
        this.courseId = options.courseId || null;
        this.sectionId = options.sectionId || null;
        this.onSave = options.onSave || null;
        this.onCancel = options.onCancel || null;

        this.isInitialized = false;
        this.isQuillLoaded = false;
    }

    /**
     * Load external dependencies (Quill.js and Highlight.js)
     */
    async loadDependencies() {
        if (this.isQuillLoaded) return true;

        try {
            // Load Highlight.js CSS
            if (!document.querySelector(`link[href="${HIGHLIGHT_CDN.css}"]`)) {
                const highlightCss = document.createElement('link');
                highlightCss.rel = 'stylesheet';
                highlightCss.href = HIGHLIGHT_CDN.css;
                document.head.appendChild(highlightCss);
            }

            // Load Highlight.js
            if (!window.hljs) {
                await this.loadScript(HIGHLIGHT_CDN.js);
            }

            // Load Quill CSS
            if (!document.querySelector(`link[href="${QUILL_CDN.css}"]`)) {
                const quillCss = document.createElement('link');
                quillCss.rel = 'stylesheet';
                quillCss.href = QUILL_CDN.css;
                document.head.appendChild(quillCss);
            }

            // Load Quill.js
            if (!window.Quill) {
                await this.loadScript(QUILL_CDN.js);
            }

            this.isQuillLoaded = true;
            console.log('✅ Quill.js and Highlight.js loaded');
            return true;
        } catch (error) {
            console.error('Error loading dependencies:', error);
            toast('Failed to load editor. Please refresh the page.', 'error');
            return false;
        }
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize the editor
     */
    async init() {
        if (this.isInitialized) {
            console.warn('Editor already initialized');
            return;
        }

        // Load dependencies first
        const loaded = await this.loadDependencies();
        if (!loaded) return;

        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error('Container not found:', this.containerId);
            return;
        }

        // Create editor HTML structure
        this.createEditorHTML();

        // Initialize Quill
        this.initQuill();

        // Load existing note if editing
        if (this.noteId) {
            await this.loadNote(this.noteId);
        }

        // Attach event listeners
        this.attachEventListeners();

        this.isInitialized = true;
        console.log('✅ Notes editor initialized');
    }

    /**
     * Create editor HTML structure
     */
    createEditorHTML() {
        this.container.innerHTML = `
            <div class="notes-editor-wrapper">
                <!-- Title Input -->
                <div class="notes-editor-title-section">
                    <input 
                        type="text" 
                        id="note-title-input" 
                        class="notes-title-input" 
                        placeholder="Note title (optional)"
                    />
                </div>

                <!-- Toolbar -->
                <div class="notes-editor-toolbar">
                    <button type="button" class="toolbar-btn" id="insert-timestamp-btn" title="Insert Video Timestamp">
                        🕐 Timestamp
                    </button>
                    <button type="button" class="toolbar-btn" id="insert-code-btn" title="Insert Code Block">
                        💻 Code
                    </button>
                    <div class="toolbar-divider"></div>
                    <label class="toolbar-btn" for="note-color-picker" title="Note Color">
                        🎨 Color
                    </label>
                    <input type="color" id="note-color-picker" class="hidden" value="#FEF3C7" />
                    <div class="color-preview" id="color-preview" style="background-color: #FEF3C7;"></div>
                </div>

                <!-- Quill Editor Container -->
                <div id="quill-editor" class="notes-quill-editor"></div>

                <!-- Tags Input -->
                <div class="notes-tags-section">
                    <label class="notes-label">Tags (comma-separated):</label>
                    <input 
                        type="text" 
                        id="note-tags-input" 
                        class="notes-tags-input" 
                        placeholder="e.g., react, hooks, useState"
                    />
                    <div id="tag-suggestions" class="tag-suggestions hidden"></div>
                </div>

                <!-- Actions -->
                <div class="notes-editor-actions">
                    <div class="notes-meta">
                        <span id="word-count">0 words</span>
                        <span class="meta-separator">•</span>
                        <span id="char-count">0 characters</span>
                    </div>
                    <div class="notes-buttons">
                        <button type="button" class="btn-secondary" id="cancel-note-btn">
                            Cancel
                        </button>
                        <button type="button" class="btn-primary" id="save-note-btn">
                            💾 Save Note
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize Quill editor
     */
    initQuill() {
        const editorElement = document.getElementById('quill-editor');

        this.quill = new window.Quill(editorElement, {
            theme: 'snow',
            modules: {
                toolbar: TOOLBAR_OPTIONS,
                syntax: {
                    highlight: text => window.hljs.highlightAuto(text).value
                }
            },
            placeholder: 'Start writing your notes here...',
        });

        // Update word count on text change
        this.quill.on('text-change', () => {
            this.updateWordCount();
        });
    }

    /**
     * Load existing note
     */
    async loadNote(noteId) {
        try {
            const note = await getNote(noteId);
            if (!note) {
                toast('Note not found', 'error');
                return;
            }

            // Set title
            document.getElementById('note-title-input').value = note.title || '';

            // Set content
            if (note.contentType === 'html') {
                this.quill.root.innerHTML = note.content;
            } else {
                this.quill.setText(note.content);
            }

            // Set tags
            document.getElementById('note-tags-input').value = note.tags.join(', ');

            // Set color
            const colorPicker = document.getElementById('note-color-picker');
            const colorPreview = document.getElementById('color-preview');
            colorPicker.value = note.color;
            colorPreview.style.backgroundColor = note.color;

            this.updateWordCount();
        } catch (error) {
            console.error('Error loading note:', error);
            toast('Failed to load note', 'error');
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Save button
        document.getElementById('save-note-btn').addEventListener('click', () => {
            this.saveNote();
        });

        // Cancel button
        document.getElementById('cancel-note-btn').addEventListener('click', () => {
            if (this.onCancel) {
                this.onCancel();
            }
        });

        // Insert timestamp button
        document.getElementById('insert-timestamp-btn').addEventListener('click', () => {
            this.insertTimestamp();
        });

        // Insert code button
        document.getElementById('insert-code-btn').addEventListener('click', () => {
            this.insertCodeBlock();
        });

        // Color picker
        document.getElementById('note-color-picker').addEventListener('change', (e) => {
            document.getElementById('color-preview').style.backgroundColor = e.target.value;
        });

        // Tags input - show suggestions on focus
        const tagsInput = document.getElementById('note-tags-input');
        tagsInput.addEventListener('input', () => {
            this.showTagSuggestions();
        });
        tagsInput.addEventListener('focus', () => {
            this.showTagSuggestions();
        });
    }

    /**
     * Insert video timestamp at cursor
     */
    insertTimestamp() {
        // TODO: Get current video time from video player
        const currentTime = 0; // Placeholder
        const timeLabel = this.formatTime(currentTime);

        const range = this.quill.getSelection(true);
        this.quill.insertText(range.index, `🕐 ${timeLabel}`, 'bold', true);
        this.quill.insertText(range.index + timeLabel.length + 2, ' ');
        this.quill.setSelection(range.index + timeLabel.length + 3);
    }

    /**
     * Insert code block
     */
    insertCodeBlock() {
        const range = this.quill.getSelection(true);
        this.quill.insertText(range.index, '\n', 'user');
        this.quill.formatLine(range.index + 1, 1, 'code-block', true);
        this.quill.setSelection(range.index + 1);
    }

    /**
     * Format time in MM:SS or HH:MM:SS
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Update word and character count
     */
    updateWordCount() {
        const text = this.quill.getText().trim();
        const words = text.split(/\s+/).filter(word => word.length > 0).length;
        const chars = text.length;

        document.getElementById('word-count').textContent = `${words} word${words !== 1 ? 's' : ''}`;
        document.getElementById('char-count').textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    }

    /**
     * Show tag suggestions
     */
    async showTagSuggestions() {
        // TODO: Implement tag suggestions from notesManager
        // For now, just hide the suggestions
        const suggestionsEl = document.getElementById('tag-suggestions');
        suggestionsEl.classList.add('hidden');
    }

    /**
     * Get editor content
     */
    getContent() {
        return {
            html: this.quill.root.innerHTML,
            text: this.quill.getText(),
            delta: this.quill.getContents()
        };
    }

    /**
     * Set editor content
     */
    setContent(content, type = 'html') {
        if (type === 'html') {
            this.quill.root.innerHTML = content;
        } else {
            this.quill.setText(content);
        }
    }

    /**
     * Save note
     */
    async saveNote() {
        try {
            const title = document.getElementById('note-title-input').value.trim();
            const content = this.quill.root.innerHTML;
            const tagsInput = document.getElementById('note-tags-input').value.trim();
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
            const color = document.getElementById('note-color-picker').value;

            // Validate
            if (!content || content === '<p><br></p>') {
                toast('Note content cannot be empty', 'warning');
                return;
            }

            const noteData = {
                title,
                content,
                contentType: 'html',
                tags,
                color,
                videoId: this.videoId,
                courseId: this.courseId,
                sectionId: this.sectionId
            };

            let savedNote;
            if (this.noteId) {
                // Update existing note
                await updateNote(this.noteId, noteData);
                savedNote = await getNote(this.noteId);
                toast('Note updated successfully!', 'success');
            } else {
                // Create new note
                savedNote = await createNote(noteData);
                toast('Note saved successfully!', 'success');
            }

            // Call onSave callback
            if (this.onSave) {
                this.onSave(savedNote);
            }

        } catch (error) {
            console.error('Error saving note:', error);
            toast('Failed to save note', 'error');
        }
    }

    /**
     * Clear editor
     */
    clear() {
        if (this.quill) {
            this.quill.setText('');
            document.getElementById('note-title-input').value = '';
            document.getElementById('note-tags-input').value = '';
            document.getElementById('note-color-picker').value = '#FEF3C7';
            document.getElementById('color-preview').style.backgroundColor = '#FEF3C7';
        }
    }

    /**
     * Destroy editor
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.quill = null;
        this.isInitialized = false;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Track if a modal is currently open
let isModalOpen = false;
let currentModalOverlay = null;

/**
 * Create a simple notes editor modal
 */
export async function openNotesEditorModal(options = {}) {
    // Prevent multiple modals from opening
    if (isModalOpen && currentModalOverlay) {
        console.warn('Notes editor modal is already open');
        return null;
    }

    const { noteId, videoId, courseId, sectionId, onSave } = options;

    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'notes-editor-modal-overlay';

    // Add inline styles to ensure proper positioning (override any conflicts)
    modalOverlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 999999 !important;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        padding: 20px;
        margin: 0 !important;
        overflow: auto;
    `;

    modalOverlay.innerHTML = `
        <div class="notes-editor-modal" style="position: relative; z-index: 1000000; margin: auto;">
            <div class="notes-editor-modal-header">
                <h2>📝 ${noteId ? 'Edit Note' : 'Create Note'}</h2>
                <button class="notes-modal-close" id="close-notes-modal" aria-label="Close modal">✕</button>
            </div>
            <div class="notes-editor-modal-body" id="notes-editor-container"></div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    isModalOpen = true;
    currentModalOverlay = modalOverlay;

    // Function to close modal
    const closeModal = () => {
        if (modalOverlay && modalOverlay.parentNode) {
            modalOverlay.remove();
        }
        isModalOpen = false;
        currentModalOverlay = null;
    };

    // Initialize editor
    const editor = new NotesEditor('notes-editor-container', {
        noteId,
        videoId,
        courseId,
        sectionId,
        onSave: (savedNote) => {
            // Close modal
            closeModal();
            // Call callback
            if (onSave) onSave(savedNote);
        },
        onCancel: () => {
            closeModal();
        }
    });

    await editor.init();

    // Close button
    const closeBtn = document.getElementById('close-notes-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    return editor;
}
