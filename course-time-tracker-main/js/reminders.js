import { toast } from "./toast.js";

const REMINDER_KEY = "userReminderSettings";

// Default settings
const defaultSettings = {
  enabled: false,
  time: "20:00", // 8:00 PM default
  lastTriggered: null
};

// Load settings
export function loadReminderSettings() {
  const saved = localStorage.getItem(REMINDER_KEY);
  return saved ? JSON.parse(saved) : defaultSettings;
}

// Save settings
export function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
  
  // If enabled, ensure we have permission
  if (settings.enabled) {
    checkPermission();
  }
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    toast("This browser does not support notifications", "error");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// Check permission status without requesting
function checkPermission() {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

// Check if it's time to remind
export function checkReminders() {
  const settings = loadReminderSettings();
  
  if (!settings.enabled || !settings.time) return;
  
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todayDate = now.toISOString().split('T')[0];

  // Check if time matches and hasn't been triggered today
  if (currentTime === settings.time && settings.lastTriggered !== todayDate) {
    sendNotification();
    
    // Update last triggered
    settings.lastTriggered = todayDate;
    saveReminderSettings(settings);
  }
}

// Send the actual notification
function sendNotification() {
  const options = {
    body: "It's time to reach your study goals! 📚",
    icon: "/favicon.ico", // Fallback if no specific icon
    badge: "/favicon.ico",
    requireInteraction: true
  };

  new Notification("Time to Study!", options);
}

// Initialize the reminder system
export function initReminders() {
  // Check every minute
  setInterval(checkReminders, 60000);
  
  // Initial check in case we opened the app exactly at the minute
  checkReminders();
}
