# 🧪 Enhanced Notes System - Testing Guide

## Quick Start Testing

### Prerequisites
- The app should be running (use `npx serve .` or similar)
- Open the app in a modern browser (Chrome, Firefox, Edge, Safari)
- Have at least one course with videos created

---

## Test Scenarios

### ✅ Test 1: Create Your First Note

**Steps:**
1. Open your Course Time Tracker app
2. Navigate to any video in your course
3. Click the **Notes** icon/button on the video
4. The rich text editor modal should appear
5. Try the following:
   - Type some text
   - Make text **bold**, *italic*, or `code`
   - Add a heading (H1, H2, etc.)
   - Insert a code block using the "💻 Code" button
   - Add some tags (e.g., "react, hooks, tutorial")
   - Change the note color using the color picker
6. Click **"💾 Save Note"**
7. The note should appear under the video

**Expected Result:**
- ✅ Modal opens smoothly
- ✅ Editor loads with Quill.js toolbar
- ✅ All formatting works
- ✅ Note saves successfully
- ✅ Toast notification appears
- ✅ Note displays under the video

---

### ✅ Test 2: Edit an Existing Note

**Steps:**
1. Click on a note you just created
2. The editor should open with your existing content
3. Make some changes
4. Click **"💾 Save Note"**

**Expected Result:**
- ✅ Existing content loads correctly
- ✅ Changes are saved
- ✅ Updated note displays with changes

---

### ✅ Test 3: Note Migration (If you have old notes)

**Steps:**
1. If you have any old plain-text notes from before
2. Click the notes button on that video/section
3. The system should automatically migrate the old note

**Expected Result:**
- ✅ Old note content appears in the editor
- ✅ Note is tagged with "migrated"
- ✅ Old note is cleared from the old system
- ✅ Toast shows "Note migrated to new system!"

---

### ✅ Test 4: Multiple Notes per Video

**Steps:**
1. Create a note on a video
2. Save it
3. Click the notes button again
4. Create another note
5. Save it

**Expected Result:**
- ✅ Both notes appear under the video
- ✅ Note count shows "📝 2 notes"
- ✅ Each note is displayed separately

---

### ✅ Test 5: Tags

**Steps:**
1. Create a note with tags: "javascript, arrays, methods"
2. Save it
3. Create another note with tags: "javascript, objects"
4. Save it

**Expected Result:**
- ✅ Tags appear as colored chips under each note
- ✅ Tags are saved correctly
- ✅ Tag usage counts are tracked in the database

---

### ✅ Test 6: Code Blocks with Syntax Highlighting

**Steps:**
1. Create a new note
2. Click the "💻 Code" button
3. Paste this code:
```javascript
const [count, setCount] = useState(0);

function handleClick() {
    setCount(count + 1);
}
```
4. Save the note

**Expected Result:**
- ✅ Code block is created
- ✅ Syntax highlighting appears (colored keywords)
- ✅ Code is properly formatted in the saved note

---

### ✅ Test 7: Timestamp Insertion

**Steps:**
1. Create a new note
2. Click the "🕐 Timestamp" button
3. A timestamp should be inserted (currently shows 0:00 as placeholder)
4. Save the note

**Expected Result:**
- ✅ Timestamp is inserted in the editor
- ✅ Timestamp appears in the saved note
- ✅ Timestamp is clickable (shows toast for now)

---

### ✅ Test 8: Note Colors

**Steps:**
1. Create a note
2. Click the "🎨 Color" button
3. Choose a color (e.g., blue, green, pink)
4. Save the note

**Expected Result:**
- ✅ Color picker opens
- ✅ Selected color is applied
- ✅ Note card has colored left border matching your choice

---

### ✅ Test 9: Dark Mode Compatibility

**Steps:**
1. Toggle dark mode in your app
2. Open the notes editor
3. Check all elements

**Expected Result:**
- ✅ Modal background is dark
- ✅ Text is readable (light colored)
- ✅ All buttons and inputs have proper dark mode styling
- ✅ Code blocks have dark theme

---

### ✅ Test 10: Responsive Design

**Steps:**
1. Resize your browser window to mobile size (< 640px)
2. Open the notes editor
3. Try creating a note

**Expected Result:**
- ✅ Modal takes 95% width on mobile
- ✅ All buttons are touch-friendly (44px minimum)
- ✅ Toolbar wraps properly
- ✅ Everything is usable on small screens

---

## Database Inspection

### Check Notes in IndexedDB

**Using Browser DevTools:**

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **IndexedDB** → **CourseTrackerDB**
4. Click on **notes** table
5. You should see your notes with all fields:
   - id, title, content, tags, color, timestamps, metadata, etc.

6. Click on **noteTags** table
7. You should see tags with usage counts

---

## Console Testing

### Test CRUD Operations Directly

Open the browser console and try these commands:

```javascript
// Import the manager
import { createNote, getAllNotes, getNotesStats } from './js/notes/notesManager.js';

// Create a test note
const note = await createNote({
    title: 'Test Note',
    content: '<p>This is a <strong>test</strong> note!</p>',
    tags: ['test', 'demo'],
    videoId: '0-0',
    courseId: 'your-course-id',
    color: '#DBEAFE'
});

console.log('Created note:', note);

// Get all notes
const allNotes = await getAllNotes();
console.log('All notes:', allNotes);

// Get statistics
const stats = await getNotesStats();
console.log('Stats:', stats);
```

---

## Common Issues & Solutions

### Issue 1: Editor doesn't load
**Solution:** Check browser console for errors. Quill.js might not be loading from CDN.
- Try refreshing the page
- Check internet connection
- Check if CDN URLs are accessible

### Issue 2: Notes don't save
**Solution:** 
- Check browser console for errors
- Verify IndexedDB is enabled in your browser
- Check if you have storage quota

### Issue 3: Old notes don't migrate
**Solution:**
- The migration only happens once
- If already migrated, the note will open in edit mode
- Check the 'migrated' tag

### Issue 4: Styles look broken
**Solution:**
- Verify `style.css` has the import statement
- Check if `notesStyles.css` file exists
- Clear browser cache and reload

### Issue 5: Dark mode doesn't work
**Solution:**
- Ensure the `dark` class is on the `<html>` or `<body>` element
- Check if dark mode toggle is working for other parts of the app

---

## Performance Testing

### Test with Many Notes

1. Create 20-30 notes on different videos
2. Check page load time
3. Check note rendering speed
4. Check editor open speed

**Expected:**
- Page load: < 2 seconds
- Note rendering: Instant
- Editor open: < 500ms

---

## Accessibility Testing

### Keyboard Navigation

1. Use **Tab** key to navigate through the editor
2. Use **Enter** to activate buttons
3. Use **Esc** to close modal (if implemented)

**Expected:**
- ✅ All interactive elements are reachable
- ✅ Focus indicators are visible
- ✅ Logical tab order

### Screen Reader Testing

1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through the notes interface
3. All elements should be announced properly

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 1 is complete and working!
2. 📝 Document any bugs or issues found
3. 🚀 Ready to move to Phase 2 (Search, Export, etc.)

If issues found:
1. 📋 List all issues
2. 🐛 Debug using browser DevTools
3. 🔧 Fix and re-test

---

## Reporting Issues

When reporting issues, include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots (if applicable)

---

Happy Testing! 🎉
