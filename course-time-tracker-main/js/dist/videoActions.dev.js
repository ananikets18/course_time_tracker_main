"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.openAddVideoModal = openAddVideoModal;
exports.openEditVideoModal = openEditVideoModal;
exports.onDeleteVideo = onDeleteVideo;
exports.onMarkWatched = onMarkWatched;
exports.onResetVideo = onResetVideo;

var _storage = require("./storage.js");

var _toast = require("./toast.js");

var _modal = require("./modal.js");

var _courseRenderer = require("./courseRenderer.js");

var _utils = require("./utils.js");

var _buttonLoading = require("./buttonLoading.js");

var _config = require("./config.js");

var _undoRedo = require("./undoRedo.js");

var _confetti = require("./confetti.js");

var _dailyGoals = require("./dailyGoals.js");

var _achievements = require("./achievements.js");

var _spacedRepetition = require("./spacedRepetition.js");

function openAddVideoModal() {
  var preferredSectionIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

  var sectionOptions = _storage.course.sections.map(function (s, i) {
    return "<option value=\"".concat(i, "\" class=\"dark:bg-slate-700 dark:text-slate-200\">").concat(s.title, "</option>");
  }).join("");

  (0, _modal.openModal)("\n    <div class=\"p-1\">\n      <h3 class=\"text-base font-bold mb-2 dark:text-sky-400\">Add Video</h3>\n      <div class=\"space-y-2 text-xs dark:text-slate-300\">\n        <label class=\"block\">Title \n          <input id=\"m-video-title\" class=\"w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm\" />\n        </label>\n        <label class=\"block\">Length (minutes) \n          <input id=\"m-video-length\" type=\"number\" min=\"0\" class=\"w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm\" placeholder=\"e.g. 8\" />\n        </label>\n        <label class=\"block\">Section\n          <select id=\"m-video-section\" class=\"w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm\">".concat(sectionOptions, "</select>\n        </label>\n        <div class=\"flex justify-end gap-2 mt-3\">\n          <button id=\"m-cancel\" class=\"px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs\">Cancel</button>\n          <button id=\"m-save\" class=\"px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white shadow text-xs\">Add Video</button>\n        </div>\n      </div>\n    </div>\n  "));

  if (preferredSectionIndex !== null) {
    document.getElementById("m-video-section").value = String(preferredSectionIndex);
  }

  document.getElementById("m-cancel").onclick = _modal.closeModal;

  document.getElementById("m-save").onclick = function _callee() {
    var saveBtn, rawTitle, rawLength, si, title, lengthValidation, isDuplicate, video;
    return regeneratorRuntime.async(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            saveBtn = document.getElementById("m-save");
            _context.prev = 1;
            rawTitle = document.getElementById("m-video-title").value;
            rawLength = document.getElementById("m-video-length").value;
            si = Number(document.getElementById("m-video-section").value); // Validate section index

            if (_storage.course.sections[si]) {
              _context.next = 8;
              break;
            }

            (0, _toast.toast)("Section not found", "error");
            return _context.abrupt("return");

          case 8:
            if (!(_storage.course.sections[si].videos.length >= _config.LIMITS.MAX_VIDEOS_PER_SECTION)) {
              _context.next = 11;
              break;
            }

            (0, _toast.toast)("Maximum ".concat(_config.LIMITS.MAX_VIDEOS_PER_SECTION, " videos per section reached"), "error");
            return _context.abrupt("return");

          case 11:
            // Sanitize and validate title
            title = (0, _utils.sanitizeInput)(rawTitle, _config.LIMITS.MAX_TITLE_LENGTH);

            if (title) {
              _context.next = 15;
              break;
            }

            (0, _toast.toast)("Title is required", "error");
            return _context.abrupt("return");

          case 15:
            if (!(title.length < 2)) {
              _context.next = 18;
              break;
            }

            (0, _toast.toast)("Title must be at least 2 characters", "error");
            return _context.abrupt("return");

          case 18:
            // Validate length
            lengthValidation = (0, _utils.validateNumber)(rawLength, 0.1, _config.LIMITS.MAX_VIDEO_LENGTH_MINUTES);

            if (lengthValidation.isValid) {
              _context.next = 22;
              break;
            }

            (0, _toast.toast)(lengthValidation.error, "error");
            return _context.abrupt("return");

          case 22:
            // Check for duplicate video names in the section
            isDuplicate = _storage.course.sections[si].videos.some(function (v) {
              return v.title.toLowerCase() === title.toLowerCase();
            });

            if (!isDuplicate) {
              _context.next = 26;
              break;
            }

            (0, _toast.toast)("A video with this name already exists in this section", "warning");
            return _context.abrupt("return");

          case 26:
            (0, _buttonLoading.setButtonLoading)(saveBtn, true);
            (0, _undoRedo.pushToHistory)("Add video");
            video = {
              title: title,
              length: (0, _utils.minutesToSeconds)(lengthValidation.value),
              watched: 0,
              addedToday: 0 // Initialize daily contribution tracker

            };

            _storage.course.sections[si].videos.push(video);

            _context.next = 32;
            return regeneratorRuntime.awrap((0, _storage.save)());

          case 32:
            (0, _toast.toast)("Video added", "success");
            (0, _utils.announceToScreenReader)("Video ".concat(title, " added successfully"));
            (0, _modal.closeModal)();
            (0, _courseRenderer.renderCourse)();
            _context.next = 43;
            break;

          case 38:
            _context.prev = 38;
            _context.t0 = _context["catch"](1);
            console.error("Error adding video:", _context.t0);
            (0, _toast.toast)("Failed to add video. Please try again.", "error");
            (0, _utils.announceToScreenReader)("Failed to add video");

          case 43:
            _context.prev = 43;
            (0, _buttonLoading.setButtonLoading)(saveBtn, false);
            return _context.finish(43);

          case 46:
          case "end":
            return _context.stop();
        }
      }
    }, null, null, [[1, 38, 43, 46]]);
  };
} // --- Edit Video ---


function openEditVideoModal(si, vi) {
  // Validate indices
  if (!_storage.course.sections[si] || !_storage.course.sections[si].videos[vi]) {
    (0, _toast.toast)("Video not found", "error");
    return;
  }

  var video = _storage.course.sections[si].videos[vi];
  (0, _modal.openModal)("\n    <div class=\"p-1\">\n      <h3 class=\"text-base font-bold mb-2 dark:text-amber-400\">Edit Video</h3>\n      <div class=\"space-y-2 text-xs dark:text-slate-300\">\n        <label class=\"block\">Title \n          <input id=\"m-video-title\" class=\"w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm\" />\n        </label>\n        <label class=\"block\">Length (minutes) \n          <input id=\"m-video-length\" type=\"number\" min=\"0\" class=\"w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded mt-1 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm\" />\n        </label>\n        <div class=\"flex justify-end gap-2 mt-3\">\n          <button id=\"m-cancel\" class=\"px-3 py-1.5 rounded border border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition text-xs\">Cancel</button>\n          <button id=\"m-save\" class=\"px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-500 text-white shadow text-xs\">Save</button>\n        </div>\n      </div>\n    </div>\n  ");
  document.getElementById("m-video-title").value = video.title;
  document.getElementById("m-video-length").value = Math.round(video.length / 60);
  document.getElementById("m-cancel").onclick = _modal.closeModal; // open modal code remains same...

  document.getElementById("m-save").onclick = function _callee2() {
    var saveBtn, rawTitle, rawLength, title, lengthValidation, isDuplicate, prevAdded;
    return regeneratorRuntime.async(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            saveBtn = document.getElementById("m-save");
            _context2.prev = 1;
            rawTitle = document.getElementById("m-video-title").value;
            rawLength = document.getElementById("m-video-length").value; // Sanitize and validate title

            title = (0, _utils.sanitizeInput)(rawTitle, _config.LIMITS.MAX_TITLE_LENGTH);

            if (title) {
              _context2.next = 8;
              break;
            }

            (0, _toast.toast)("Title is required", "error");
            return _context2.abrupt("return");

          case 8:
            if (!(title.length < 2)) {
              _context2.next = 11;
              break;
            }

            (0, _toast.toast)("Title must be at least 2 characters", "error");
            return _context2.abrupt("return");

          case 11:
            // Validate length
            lengthValidation = (0, _utils.validateNumber)(rawLength, 0.1, _config.LIMITS.MAX_VIDEO_LENGTH_MINUTES);

            if (lengthValidation.isValid) {
              _context2.next = 15;
              break;
            }

            (0, _toast.toast)(lengthValidation.error, "error");
            return _context2.abrupt("return");

          case 15:
            // Check for duplicate video names (excluding current video)
            isDuplicate = _storage.course.sections[si].videos.some(function (v, idx) {
              return idx !== vi && v.title.toLowerCase() === title.toLowerCase();
            });

            if (!isDuplicate) {
              _context2.next = 19;
              break;
            }

            (0, _toast.toast)("A video with this name already exists in this section", "warning");
            return _context2.abrupt("return");

          case 19:
            (0, _buttonLoading.setButtonLoading)(saveBtn, true);
            (0, _undoRedo.pushToHistory)("Edit video"); // Subtract previous contribution from daily log

            prevAdded = video.addedToday || 0;
            _storage.dailyWatchLog[(0, _utils.todayDate)()] = Math.max((_storage.dailyWatchLog[(0, _utils.todayDate)()] || 0) - prevAdded, 0); // Update video data

            video.title = title;
            video.length = (0, _utils.minutesToSeconds)(lengthValidation.value);
            video.watched = Math.min(video.watched, video.length); // adjust watched if new length < old watched

            video.addedToday = Math.min(prevAdded, video.length); // adjust today's contribution if necessary
            // Add adjusted contribution back

            _storage.dailyWatchLog[(0, _utils.todayDate)()] = (_storage.dailyWatchLog[(0, _utils.todayDate)()] || 0) + video.addedToday;
            _context2.next = 30;
            return regeneratorRuntime.awrap((0, _storage.save)());

          case 30:
            (0, _toast.toast)("Video updated", "success");
            (0, _utils.announceToScreenReader)("Video ".concat(title, " updated successfully"));
            (0, _modal.closeModal)();
            (0, _courseRenderer.renderCourse)();
            _context2.next = 41;
            break;

          case 36:
            _context2.prev = 36;
            _context2.t0 = _context2["catch"](1);
            console.error("Error updating video:", _context2.t0);
            (0, _toast.toast)("Failed to update video. Please try again.", "error");
            (0, _utils.announceToScreenReader)("Failed to update video");

          case 41:
            _context2.prev = 41;
            (0, _buttonLoading.setButtonLoading)(saveBtn, false);
            return _context2.finish(41);

          case 44:
          case "end":
            return _context2.stop();
        }
      }
    }, null, null, [[1, 36, 41, 44]]);
  };
} // --- Delete Video ---


function onDeleteVideo(si, vi) {
  var video, prevAdded;
  return regeneratorRuntime.async(function onDeleteVideo$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          if (!(!_storage.course.sections[si] || !_storage.course.sections[si].videos[vi])) {
            _context3.next = 3;
            break;
          }

          (0, _toast.toast)("Video not found", "error");
          return _context3.abrupt("return");

        case 3:
          video = _storage.course.sections[si].videos[vi];

          if (confirm("Delete \"".concat(video.title, "\"?\n\nThis action cannot be undone."))) {
            _context3.next = 6;
            break;
          }

          return _context3.abrupt("return");

        case 6:
          _context3.prev = 6;
          (0, _undoRedo.pushToHistory)("Delete video"); // Subtract its contribution from daily log

          prevAdded = video.addedToday || 0;
          _storage.dailyWatchLog[(0, _utils.todayDate)()] = Math.max((_storage.dailyWatchLog[(0, _utils.todayDate)()] || 0) - prevAdded, 0); // Remove from course

          _storage.course.sections[si].videos.splice(vi, 1);

          _context3.next = 13;
          return regeneratorRuntime.awrap((0, _storage.save)());

        case 13:
          (0, _toast.toast)("Video deleted", "success");
          (0, _utils.announceToScreenReader)("Video ".concat(video.title, " deleted"));
          (0, _courseRenderer.renderCourse)();
          _context3.next = 23;
          break;

        case 18:
          _context3.prev = 18;
          _context3.t0 = _context3["catch"](6);
          console.error("Error deleting video:", _context3.t0);
          (0, _toast.toast)("Failed to delete video. Please try again.", "error");
          (0, _utils.announceToScreenReader)("Failed to delete video");

        case 23:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[6, 18]]);
}

function onMarkWatched(si, vi) {
  var video = _storage.course.sections[si].videos[vi]; // If already fully watched today, do nothing

  if (video.watched >= video.length) {
    (0, _toast.toast)("Already completed!", "default");
    return;
  } // Compute how much to add to daily log


  var addTime = video.length - (video.addedToday || 0); // Mark video as watched

  video.watched = video.length;
  (0, _spacedRepetition.scheduleInitialReview)(video); // Track contribution to today's watch log

  video.addedToday = video.length;
  _storage.dailyWatchLog[(0, _utils.todayDate)()] = (_storage.dailyWatchLog[(0, _utils.todayDate)()] || 0) + addTime; // Success feedback (throttled)

  var now = Date.now();

  if (!window.lastCompletionToastTime || now - window.lastCompletionToastTime > 1500) {
    (0, _toast.toast)("\u2728 Completed: ".concat(video.title, " "), "success");
    window.lastCompletionToastTime = now;
  } // Add pulse animation to the element (if we can find it)


  setTimeout(function () {
    var videoElements = document.querySelectorAll('#course-container article .accordion-body > div');

    if (videoElements[vi]) {
      videoElements[vi].classList.add('pulse-success');
      setTimeout(function () {
        return videoElements[vi].classList.remove('pulse-success');
      }, 600);
    }
  }, 100);
  (0, _courseRenderer.renderCourse)(); // Check for milestones

  setTimeout(function () {
    var milestone = (0, _confetti.checkMilestone)(_storage.course);

    if (milestone) {
      // Get previously celebrated milestones from localStorage
      var celebratedKey = 'celebrated_milestones';
      var celebrated = JSON.parse(localStorage.getItem(celebratedKey) || '[]'); // Only celebrate if this milestone hasn't been celebrated yet

      if (!celebrated.includes(milestone)) {
        (0, _confetti.celebrateMilestone)(milestone); // Mark this milestone as celebrated

        celebrated.push(milestone);
        localStorage.setItem(celebratedKey, JSON.stringify(celebrated));
      }
    } // Check if daily goals are met


    var goalsKey = 'goals_met_today';
    var today = (0, _utils.todayDate)();
    var goalsMet = localStorage.getItem(goalsKey);

    if ((0, _dailyGoals.areGoalsMet)() && goalsMet !== today) {
      // Goals just completed!
      setTimeout(function () {
        (0, _toast.toast)("🎯 Daily goals complete! You're crushing it!", "success", 4000);
      }, 800);
      localStorage.setItem(goalsKey, today);
    } else if ((0, _dailyGoals.isAnyGoalMet)() && !(0, _dailyGoals.areGoalsMet)()) {} // One goal met, encourage to complete the other
    // (optional - can be removed if too chatty)
    // Check for newly unlocked achievements


    var newAchievements = (0, _achievements.checkAchievements)();

    if (newAchievements.length > 0) {
      // Show achievement unlocks with delay to avoid toast spam
      newAchievements.forEach(function (achievement, index) {
        setTimeout(function () {
          (0, _achievements.showAchievementUnlock)(achievement);
        }, 1200 + index * 1500); // Stagger notifications
      });
    }
  }, 300);
}

function onResetVideo(si, vi) {
  var video, subTime;
  return regeneratorRuntime.async(function onResetVideo$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          if (!(!_storage.course.sections[si] || !_storage.course.sections[si].videos[vi])) {
            _context4.next = 3;
            break;
          }

          (0, _toast.toast)("Video not found", "error");
          return _context4.abrupt("return");

        case 3:
          video = _storage.course.sections[si].videos[vi];

          if (!(video.watched <= 0)) {
            _context4.next = 7;
            break;
          }

          (0, _toast.toast)("Video has no progress to reset", "warning");
          return _context4.abrupt("return");

        case 7:
          if (confirm("Reset progress for \"".concat(video.title, "\"?\n\nThis will mark the video as unwatched and clear today's contribution."))) {
            _context4.next = 9;
            break;
          }

          return _context4.abrupt("return");

        case 9:
          _context4.prev = 9;
          (0, _undoRedo.pushToHistory)("Reset video progress"); // Subtract the contribution from today's log

          subTime = video.addedToday || 0;
          _storage.dailyWatchLog[(0, _utils.todayDate)()] = Math.max((_storage.dailyWatchLog[(0, _utils.todayDate)()] || 0) - subTime, 0); // Reset video state

          video.watched = 0;
          video.addedToday = 0;
          (0, _spacedRepetition.resetReview)(video);
          _context4.next = 18;
          return regeneratorRuntime.awrap((0, _storage.save)());

        case 18:
          (0, _toast.toast)("Reset progress: " + video.title, "success");
          (0, _utils.announceToScreenReader)("Reset progress for ".concat(video.title));
          (0, _courseRenderer.renderCourse)();
          _context4.next = 28;
          break;

        case 23:
          _context4.prev = 23;
          _context4.t0 = _context4["catch"](9);
          console.error("Error resetting video:", _context4.t0);
          (0, _toast.toast)("Failed to reset video progress. Please try again.", "error");
          (0, _utils.announceToScreenReader)("Failed to reset video progress");

        case 28:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[9, 23]]);
}