import { dailyWatchLog, course } from "./storage.js";
import {
  todayDate,
  secondsToMinutesLabel,
  lastNDates,
  formatShortDate,
} from "./utils.js";
import { animatePercentage } from "./animatedCounter.js";
import { calculateStreak, getStreakMessage } from "./streakSystem.js";
import { calculateTodayProgress, getGoalMessage, getTimeRemaining } from "./dailyGoals.js";
import { getAchievementStats } from "./achievements.js";
import { getDueReviews } from "./spacedRepetition.js";

// --- calculate total course lengths and watched seconds ---
export function calculateTotals() {
  const totals = { totalSeconds: 0, watchedSeconds: 0 };
  for (const s of course.sections) {
    for (const v of s.videos) {
      totals.totalSeconds += v.length || 0;
      totals.watchedSeconds += Math.min(v.watched || 0, v.length || 0);
    }
  }
  return totals;
}

// --- update the dashboard UI ---
export function updateDashboard() {
  // --- Today info ---
  document.getElementById("today-date").textContent = formatShortDate(
    todayDate()
  );

  const todaySec = Math.max(dailyWatchLog[todayDate()] || 0, 0); // safety check
  document.getElementById("time-today").textContent =
    secondsToMinutesLabel(todaySec);

  // --- Daily Goals ---
  const goalProgress = calculateTodayProgress();
  const goalMsg = getGoalMessage();
  const timeLeft = getTimeRemaining();

  // Update videos goal
  document.getElementById("goal-videos-text").textContent =
    `${goalProgress.videos.current}/${goalProgress.videos.target}`;
  document.getElementById("goal-videos-bar").style.width =
    `${goalProgress.videos.percentage}%`;

  // Update minutes goal
  document.getElementById("goal-minutes-text").textContent =
    `${goalProgress.minutes.current}/${goalProgress.minutes.target}`;
  document.getElementById("goal-minutes-bar").style.width =
    `${goalProgress.minutes.percentage}%`;

  // Update message and time remaining
  document.getElementById("goal-message").textContent =
    `${goalMsg.icon} ${goalMsg.message}`;
  document.getElementById("time-remaining").textContent =
    `⏰ ${timeLeft} today`;

  // --- Overall progress ---
  const totals = calculateTotals();
  const percent = totals.totalSeconds
    ? Math.round((totals.watchedSeconds / totals.totalSeconds) * 100)
    : 0;

  // Animate percentage changes
  const overallProgressEl = document.getElementById("overall-progress");
  const progressCircleEl = document.getElementById("progress-circle");

  const currentPercent = parseInt(overallProgressEl.textContent) || 0;
  if (currentPercent !== percent) {
    animatePercentage(overallProgressEl, percent, 800);
    animatePercentage(progressCircleEl, percent, 800);
  } else {
    overallProgressEl.textContent = percent + "%";
    progressCircleEl.textContent = percent + "%";
  }

  const bar = document.getElementById("overall-progress-bar");
  bar.style.width = percent + "%";

  // Animate SVG circular progress
  const progressCircleSvg = document.getElementById("progress-circle-svg");
  const circumference = 2 * Math.PI * 40; // 2πr where r=40
  const offset = circumference - (percent / 100) * circumference;
  progressCircleSvg.style.strokeDashoffset = offset;

  // Color code based on percentage
  if (percent < 30) {
    progressCircleSvg.classList.remove("text-sky-500", "text-amber-500", "text-green-500");
    progressCircleSvg.classList.add("text-red-500");
    bar.classList.remove("bg-sky-500", "bg-amber-500", "bg-green-500");
    bar.classList.add("bg-red-500");
  } else if (percent < 70) {
    progressCircleSvg.classList.remove("text-sky-500", "text-red-500", "text-green-500");
    progressCircleSvg.classList.add("text-amber-500");
    bar.classList.remove("bg-sky-500", "bg-red-500", "bg-green-500");
    bar.classList.add("bg-amber-500");
  } else {
    progressCircleSvg.classList.remove("text-sky-500", "text-red-500", "text-amber-500");
    progressCircleSvg.classList.add("text-green-500");
    bar.classList.remove("bg-sky-500", "bg-red-500", "bg-amber-500");
    bar.classList.add("bg-green-500");
  }

  // --- Streak Counter ---
  const streak = calculateStreak();
  const streakMsg = getStreakMessage();

  document.getElementById("streak-current").textContent = streak.current;
  document.getElementById("streak-longest").textContent = streak.longest;
  document.getElementById("streak-message").textContent = streakMsg.message;
  document.getElementById("streak-icon").textContent = streakMsg.icon;

  // --- Achievements Progress ---
  const achievementStats = getAchievementStats();
  document.getElementById("achievements-count").textContent =
    `${achievementStats.unlocked}/${achievementStats.total}`;
  document.getElementById("achievements-bar").style.width =
    `${achievementStats.percentage}%`;

  // --- Reviews Due ---
  const dueReviews = getDueReviews();
  const reviewsCountEl = document.getElementById("reviews-count");
  if (reviewsCountEl) {
    reviewsCountEl.textContent = dueReviews.length;
    document.getElementById("reviews-message").textContent = dueReviews.length > 0
      ? `You have ${dueReviews.length} videos to review.`
      : "All caught up! Great job.";
  }

  // --- Last 7 days history ---
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";
  const dates = lastNDates(7);
  let nothing = true;

  // find max value for bar scaling, fallback to 300 sec
  const max = Math.max(...dates.map((dd) => dailyWatchLog[dd] || 0), 300);

  for (const d of dates) {
    const sec = Math.max(dailyWatchLog[d] || 0, 0); // ensure no negative values

    const li = document.createElement("li");
    li.className = "flex items-center gap-3";

    const label = document.createElement("div");
    label.className = "w-20 text-xs text-white/90 font-medium";
    label.textContent = d === todayDate() ? "Today" : d.slice(5);

    const barWrap = document.createElement("div");
    barWrap.className = "flex-1 bg-white/20 backdrop-blur-sm h-2 rounded-full overflow-hidden";

    const inner = document.createElement("div");
    inner.className = "h-2 rounded-full bg-white shadow-lg transition-all";
    const pct = Math.round((sec / max) * 100);
    inner.style.width = pct + "%";

    barWrap.appendChild(inner);

    const value = document.createElement("div");
    value.className = "w-16 text-right text-xs text-white/90 font-medium";
    value.textContent = secondsToMinutesLabel(sec);

    li.appendChild(label);
    li.appendChild(barWrap);
    li.appendChild(value);

    historyList.appendChild(li);

    if (sec > 0) nothing = false;
  }

  if (nothing) {
    historyList.innerHTML =
      '<li class="text-white/70 text-sm">No recorded activity yet.</li>';
  }
}
