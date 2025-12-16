const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Load config manually since it's an ES module and we are in CommonJS node script
// We'll just read the file content and extract keys with regex for simplicity
const configPath = path.join(__dirname, 'js', 'config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

const publicKeyMatch = configContent.match(/vapidPublicKey:\s*"([^"]+)"/);
const privateKeyMatch = configContent.match(/vapidPrivateKey:\s*"([^"]+)"/);

if (!publicKeyMatch || !privateKeyMatch) {
    console.error("❌ Could not find VAPID keys in js/config.js");
    process.exit(1);
}

const vapidKeys = {
    publicKey: publicKeyMatch[1],
    privateKey: privateKeyMatch[1]
};

webpush.setVapidDetails(
    'mailto:test@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// This is where you'd normally fetch subscriptions from Supabase
// For this test, you need to PASTE the subscription object you got in the browser console here:
const subscription = { "endpoint": "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABpLBWNMmcmPwx5sxMPPzXsF7z9RYca5kFm2zkHwT2D4PkZEO1FXi1-KnbVi1L5o4ZPNVHXC_5BXDCDWuMPd-fCbr81KH63KO8ZXkbDEhTai1FkbQHhIvY0vuGWIn8dv3X6hfM_JiVVZtuJAkYo3pIykepPEuFRZkATENyfMcCIRxwu3LU", "expirationTime": null, "keys": { "auth": "bvq_WY_kU6N9zGTiV5sfdg", "p256dh": "BPvSjCMcNFN2gaJwuTzzc0YHelsW9hn7H4SptRl2v2cjIVD0AjnR2RwA8BVzXzd2NHikHGw4CMPFPVtRzDKMCow" } }
const payload = JSON.stringify({
    title: 'Course Tracker Reminder',
    body: 'Time to study! Keep your streak alive! 🔥'
});

console.log("🚀 Sending test notification...");

webpush.sendNotification(subscription, payload)
    .then(response => console.log("✅ Notification sent successfully!", response.statusCode))
    .catch(error => {
        console.error("❌ Error sending notification:", error);
        if (error.statusCode === 410) {
            console.log("ℹ️ Subscription is no longer valid (user unsubscribed or expired).");
        }
    });
