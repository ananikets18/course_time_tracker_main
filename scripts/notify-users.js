const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Configuration
const configPath = path.join(__dirname, 'js', 'config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

// Helper to extract values from the config file string
const extractConfig = (key) => {
    const match = configContent.match(new RegExp(`${key}:\\s*"([^"]+)"`));
    return match ? match[1] : null;
};

const SUPABASE_URL = extractConfig('url');
const SUPABASE_KEY = extractConfig('key');
const VAPID_PUBLIC_KEY = extractConfig('vapidPublicKey');
const VAPID_PRIVATE_KEY = extractConfig('vapidPrivateKey');

if (!SUPABASE_URL || !SUPABASE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("❌ Missing configuration in js/config.js");
    console.log("Ensure url, key, vapidPublicKey, and vapidPrivateKey are all set.");
    process.exit(1);
}

// 2. Initialize Services
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

webpush.setVapidDetails(
    'mailto:admin@coursetracker.com', // Replace with your actual email
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// 3. Main Notification Logic
async function sendDailyNotifications() {
    console.log("🚀 Starting Daily Notification Run...");

    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*');

    if (error) {
        console.error("❌ Error fetching subscriptions:", error);
        return;
    }

    console.log(`📋 Found ${subscriptions.length} subscribers.`);

    const notificationPayload = JSON.stringify({
        title: 'Time to Focus! 🎯',
        body: 'Keep your streak alive! Log your study time today.',
        icon: '/assets/icon-192.png', // Ensure this path is correct relative to your web root
        badge: '/assets/icon-192.png'
    });

    let successCount = 0;
    let failCount = 0;

    // Send to each user
    for (const record of subscriptions) {
        const sub = record.subscription;

        try {
            await webpush.sendNotification(sub, notificationPayload);
            console.log(`✅ Sent to ID ${record.id}`);
            successCount++;
        } catch (err) {
            console.error(`❌ Failed to send to ID ${record.id}:`, err.statusCode);

            // If subscription is invalid (410 Gone or 404 Not Found), delete it
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`🗑️ Removing dead subscription ID ${record.id}`);
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('id', record.id);
            }
            failCount++;
        }
    }

    console.log("\n=================================");
    console.log(`🎉 Run Complete`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed:     ${failCount}`);
    console.log("=================================");
}

// Run the function
sendDailyNotifications();
