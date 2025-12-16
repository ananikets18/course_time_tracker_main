// Push Notification Logic
import { config } from "./config.js";
import { toast } from "./toast.js";

// Helper to convert VAPID key
// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    if (!base64String) return new Uint8Array(0);
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Check if Push is supported
export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Subscribe User
export async function subscribeToPush() {
    console.log("🚀 Starting Push Subscription...");

    if (!isPushSupported()) {
        toast("Push notifications are not supported in this browser.", "error");
        return null;
    }

    // 1. Check Permissions
    if (Notification.permission === 'denied') {
        console.error("❌ Notification permission is DENIED.");
        toast("Notifications are blocked. Please allow them in your browser settings (lock icon in URL bar).", "error");
        return null;
    }

    if (!config.vapidPublicKey) {
        console.error("❌ VAPID Public Key missing in config.js");
        toast("Push configuration missing.", "error");
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        console.log("✅ Service Worker is ready:", registration);

        // 2. Check for existing subscription and unsubscribe (Clean Slate)
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
            console.log("⚠️ Found existing subscription. Unsubscribing to ensure clean state...", existingSub);
            await existingSub.unsubscribe();
            console.log("✅ Unsubscribed successfully.");
        }

        console.log("🔑 Using VAPID Public Key:", config.vapidPublicKey);
        const applicationServerKey = urlBase64ToUint8Array(config.vapidPublicKey);
        console.log("🔢 Converted Key Length:", applicationServerKey.length);

        // 3. Subscribe
        console.log("⏳ Attempting to subscribe...");
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });

        console.log("✅ Push Subscription successful:", subscription);
        console.log("📋 COPY THIS OBJECT FOR BACKEND:", JSON.stringify(subscription));

        // Save to Supabase (if connected)
        await saveSubscriptionToSupabase(subscription);

        toast("Notifications enabled successfully!", "success");
        return subscription;

    } catch (error) {
        console.error("❌ Failed to subscribe to push:", error);

        if (error.name === 'NotAllowedError') {
            toast("Permission denied. Please click the Lock icon in your URL bar and 'Allow' notifications.", "error");
        } else if (error.message.includes("push service error")) {
            toast("Browser could not connect to Push Service. Check your internet connection or VPN.", "error");
        } else {
            toast(`Failed to enable notifications: ${error.message}`, "error");
        }
        return null;
    }
}

// Save subscription to database
async function saveSubscriptionToSupabase(subscription) {
    // We need to dynamically import db to avoid circular deps if possible, 
    // or just assume global access if we attached it to window, 
    // but better to use the module.

    // For now, we'll try to use the existing Supabase client from db.js logic
    // But since db.js doesn't export the client directly, we might need to rely on 
    // the fact that we can insert into a table via the same mechanism.

    // Actually, let's look at how db.js handles sync. 
    // It uses a specific client. We might need to expose a 'saveSubscription' method in db.js
    // OR just use the raw fetch if we had the URL/Key, but we want to use the authenticated client.

    // Let's try to use the window.courseTrackerDB debug object if available, or import from db.js
    // We'll add a helper in db.js for this.

    try {
        const { savePushSubscription } = await import('./db.js');
        await savePushSubscription(subscription);
    } catch (e) {
        console.warn("Could not save subscription to DB (Offline or not implemented):", e);
    }
}
