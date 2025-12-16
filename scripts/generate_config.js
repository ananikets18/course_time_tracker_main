const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

const configContent = `/**
 * Configuration file
 * 
 * To use hardcoded credentials instead of entering them in the UI:
 * 1. Rename this file to config.js (if it's not already)
 * 2. Fill in your Supabase details below
 * 3. The app will automatically use these values
 * 
 * WARNING: Do not commit this file to public repositories if it contains real keys!
 */

export const config = {
    supabase: {
        url: "", // e.g. "https://your-project.supabase.co"
        key: ""  // e.g. "your-anon-key"
    },
    // VAPID Keys for Push Notifications
    vapidPublicKey: "${vapidKeys.publicKey}",
    vapidPrivateKey: "${vapidKeys.privateKey}" // Keep this secret! (Only needed for backend sending)
};
`;

fs.writeFileSync(path.join(__dirname, 'js', 'config.js'), configContent);
console.log('✅ js/config.js updated with new VAPID keys.');
