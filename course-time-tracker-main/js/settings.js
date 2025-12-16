import { openModal, closeModal } from "./modal.js";
import { loadReminderSettings, saveReminderSettings, requestNotificationPermission, checkReminders } from "./reminders.js";
import { toast } from "./toast.js";
import { exportData, importData, enableSync, getSyncStatus, syncFromCloud, syncToCloud } from "./storage.js";
import { renderCourse } from "./courseRenderer.js";
import { config } from "./config.js";
import { subscribeToPush } from "./pushNotifications.js";

export function openSettingsModal() {
  const settings = loadReminderSettings();

  openModal(`
    <div class="p-1">
      <h3 class="text-lg font-bold mb-4 dark:text-sky-400 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Settings
      </h3>
      
      <div class="space-y-4">
        <!-- Reminders Section -->
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔔</span>
              <div>
                <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">Daily Reminders</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">Get notified when it's time to study</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="s-reminder-toggle" class="sr-only peer" ${settings.enabled ? 'checked' : ''}>
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div id="reminder-time-container" class="transition-all duration-300 ${settings.enabled ? 'opacity-100 max-h-20' : 'opacity-50 max-h-0 overflow-hidden'}">
            <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reminder Time
            </label>
            <input type="time" id="s-reminder-time" value="${settings.time}" 
              class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 outline-none">
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Note: You must keep a browser tab open to receive notifications.
            </p>
          </div>
          
          <!-- Push Notifications (New) -->
          <div class="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
             <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">Push Notifications</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Receive alerts even when app is closed</p>
                </div>
                <button id="btn-enable-push" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors">
                    Enable Push
                </button>
             </div>
          </div>
        </div>

        <!-- Cloud Sync Section -->
        <div class="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-xl p-3 border border-sky-200 dark:border-sky-700">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">☁️</span>
            <div>
              <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">Cloud Sync</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">Sync across devices with Supabase</p>
            </div>
          </div>
          
          <div id="sync-status" class="mb-2 text-xs">
            ${getSyncStatus() ?
      '<div class="flex items-center gap-2 text-green-600 dark:text-green-400"><span>✅</span><span>Sync Active</span></div>' :
      '<div class="flex items-center gap-2 text-slate-500"><span>📡</span><span>Sync Disconnected</span></div>'
    }
          </div>
          
          ${config.supabase?.url && config.supabase?.key ? `
            <!-- Config Mode -->
            <div class="mb-3 p-2 bg-sky-100 dark:bg-sky-900/30 rounded text-xs text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800">
              <span class="font-semibold">Configuration loaded from file.</span><br>
              URL: ${config.supabase.url.substring(0, 20)}...
            </div>
            ${!getSyncStatus() ? `
              <button id="btn-retry-sync" class="w-full mb-3 flex items-center justify-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors">
                Retry Connection
              </button>
            ` : ''}
          ` : `
            <!-- Manual Mode -->
            <div id="sync-config" class="${getSyncStatus() ? 'hidden' : ''}">
              <div class="space-y-2 mb-3">
                <div>
                  <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Supabase URL</label>
                  <input type="url" id="supabase-url" placeholder="https://xxxxx.supabase.co" value="${localStorage.getItem('supabase_url') || ''}" 
                    class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Supabase Anon Key</label>
                  <input type="password" id="supabase-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${localStorage.getItem('supabase_key') || ''}" 
                    class="w-full border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none">
                </div>
              </div>
              <button id="btn-enable-sync" class="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors">
                Enable Sync
              </button>
            </div>
          `}
          
          <div id="sync-actions" class="${getSyncStatus() ? '' : 'hidden'}">
            <div class="flex gap-2">
              <button id="btn-push-sync" class="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span class="text-lg leading-none">⬆️</span> Push
              </button>
              <button id="btn-pull-sync" class="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span class="text-lg leading-none">⬇️</span> Pull
              </button>
            </div>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
              Auto-sync active (every 30s)
            </p>
          </div>
        </div>

        <!-- Data Management -->
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">💾</span>
            <div>
              <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200">Data Management</h4>
              <p class="text-xs text-slate-500 dark:text-slate-400">Backup or restore your progress</p>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button id="btn-export-data" class="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Export Data
            </button>
            <button id="btn-import-data" class="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              Import Data
            </button>
            <input type="file" id="file-import-input" accept=".json" class="hidden">
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button id="s-close" class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition">Close</button>
          <button id="s-save" class="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm shadow-lg shadow-sky-500/30 transition transform active:scale-95">Save Changes</button>
        </div>
      </div>
    </div>
  `);

  // Event Listeners
  const toggle = document.getElementById("s-reminder-toggle");
  const timeContainer = document.getElementById("reminder-time-container");
  const timeInput = document.getElementById("s-reminder-time");

  toggle.onchange = async () => {
    if (toggle.checked) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toggle.checked = false;
        toast("Notifications permission denied. Please enable them in your browser settings.", "error");
        return;
      }
      timeContainer.classList.remove("opacity-50", "max-h-0", "overflow-hidden");
      timeContainer.classList.add("opacity-100", "max-h-20");
    } else {
      timeContainer.classList.add("opacity-50", "max-h-0", "overflow-hidden");
      timeContainer.classList.remove("opacity-100", "max-h-20");
    }
  };

  // Push Notification Handler
  const btnEnablePush = document.getElementById("btn-enable-push");
  if (btnEnablePush) {
    btnEnablePush.onclick = async () => {
      btnEnablePush.disabled = true;
      btnEnablePush.textContent = "Enabling...";
      const sub = await subscribeToPush();
      if (sub) {
        btnEnablePush.textContent = "Enabled ✅";
        btnEnablePush.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
        btnEnablePush.classList.add("bg-green-600", "hover:bg-green-700");
      } else {
        btnEnablePush.textContent = "Enable Push";
        btnEnablePush.disabled = false;
      }
    };
  }

  // Sync Handlers
  const btnEnableSync = document.getElementById("btn-enable-sync");
  const btnRetrySync = document.getElementById("btn-retry-sync");
  const btnPushSync = document.getElementById("btn-push-sync");
  const btnPullSync = document.getElementById("btn-pull-sync");

  if (btnRetrySync) {
    btnRetrySync.onclick = async () => {
      btnRetrySync.disabled = true;
      btnRetrySync.innerHTML = '<span class="animate-spin">⏳</span> Connecting...';

      const success = await enableSync(config.supabase.url, config.supabase.key);

      if (success) {
        toast("✅ Connected to Supabase!", "success");
        setTimeout(() => {
          closeModal();
          openSettingsModal();
        }, 1000);
      } else {
        toast("❌ Connection failed.", "error");
        btnRetrySync.disabled = false;
        btnRetrySync.textContent = "Retry Connection";
      }
    };
  }

  if (btnEnableSync) {
    btnEnableSync.onclick = async () => {
      const url = document.getElementById("supabase-url").value.trim();
      const key = document.getElementById("supabase-key").value.trim();

      if (!url || !key) {
        toast("Please enter both Supabase URL and Key", "error");
        return;
      }

      if (!url.includes('supabase.co')) {
        toast("Invalid Supabase URL format", "error");
        return;
      }

      btnEnableSync.disabled = true;
      btnEnableSync.innerHTML = '<span class="animate-spin">⏳</span> Connecting...';

      const success = await enableSync(url, key);

      if (success) {
        toast("✅ Cloud sync enabled! Data will sync automatically.", "success");
        localStorage.setItem('supabase_url', url);
        localStorage.setItem('supabase_key', key);
        setTimeout(() => {
          closeModal();
          openSettingsModal();
        }, 1000);
      } else {
        toast("❌ Failed to connect to Supabase. Check your credentials.", "error");
        btnEnableSync.disabled = false;
        btnEnableSync.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Enable Sync';
      }
    };
  }

  if (btnPushSync) {
    btnPushSync.onclick = async () => {
      btnPushSync.disabled = true;
      btnPushSync.innerHTML = '<span class="animate-spin">⏳</span> Pushing...';

      const success = await syncToCloud();

      if (success) {
        toast("✅ Data pushed to cloud successfully!", "success");
      } else {
        toast("❌ Failed to push data. Check your connection.", "error");
      }

      btnPushSync.disabled = false;
      btnPushSync.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg> Push to Cloud';
    };
  }

  if (btnPullSync) {
    btnPullSync.onclick = async () => {
      if (!confirm("This will replace your local data with cloud data. Continue?")) {
        return;
      }

      btnPullSync.disabled = true;
      btnPullSync.innerHTML = '<span class="animate-spin">⏳</span> Pulling...';

      const success = await syncFromCloud();

      if (success) {
        toast("✅ Data pulled from cloud successfully!", "success");
        renderCourse();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast("❌ Failed to pull data. Check your connection.", "error");
      }

      btnPullSync.disabled = false;
      btnPullSync.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-12"></path></svg> Pull from Cloud';
    };
  }

  // Export Handler
  document.getElementById("btn-export-data").onclick = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `course-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Data exported successfully!", "success");
  };

  // Import Handler
  const fileInput = document.getElementById("file-import-input");
  document.getElementById("btn-import-data").onclick = () => {
    fileInput.click();
  };

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const success = await importData(event.target.result);
      if (success) {
        toast("Data imported successfully!", "success");
        renderCourse();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast("Failed to import data. Invalid format.", "error");
      }
    };
    reader.readAsText(file);
  };

  document.getElementById("s-close").onclick = closeModal;

  document.getElementById("s-save").onclick = () => {
    const newSettings = {
      enabled: toggle.checked,
      time: timeInput.value,
      lastTriggered: settings.lastTriggered
    };

    saveReminderSettings(newSettings);
    checkReminders();
    toast("Settings saved successfully!", "success");
    closeModal();
  };
}
