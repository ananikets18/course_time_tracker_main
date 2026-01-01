const CACHE_NAME = "course-tracker-v9";
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./manifest.json",
    "./js/main.js",
    "./js/db.js",
    "./js/storage.js",
    "./js/courseRenderer.js",
    "./js/dashboard.js",
    "./js/streakSystem.js",
    "./js/achievements.js",
    "./js/focusTimer.js",
    "./js/modal.js",
    "./js/toast.js",
    "./js/utils.js",
    "./js/settings.js",
    "./js/config.js",
    "./js/reminders.js",
    "./js/searchFilter.js",
    "./js/searchFilterUI.js",
    "./js/sectionActions.js",
    "./js/videoActions.js",
    "./js/formValidation.js",
    "./js/dailyGoals.js",
    "./js/goalAdjustmentControls.js",
    "./js/trendAnalysis.js",
    "./js/reviewPreview.js",
    "./js/timeBreakdown.js",
    "./js/notes.js",
    "./js/spacedRepetition.js",
    "./js/confetti.js",
    "./js/buttonLoading.js",
    "./js/animatedCounter.js"
];

// Install Event - Cache Assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean Old Caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// Fetch Event - Serve from Cache, then Network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

// Push Notification Event
self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: './assets/icon-192.png',
            badge: './assets/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2'
            },
            actions: [
                { action: 'explore', title: 'Open App', icon: './assets/icon-192.png' },
                { action: 'close', title: 'Close', icon: './assets/icon-192.png' },
            ]
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification Click Event
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./index.html')
        );
    }
});
