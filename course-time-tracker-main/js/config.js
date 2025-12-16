/**
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
        url: "https://dvdxhukswpaewgtkeuel.supabase.co", // e.g. "https://your-project.supabase.co"
        key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2ZHhodWtzd3BhZXdndGtldWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODE2MjIsImV4cCI6MjA4MDA1NzYyMn0.v3BG9XdSpHgS7VNGwlinmzjwcCQ1Oz-Ib6CkoCZLZw4"  // e.g. "your-anon-key"
    },
    // VAPID Keys for Push Notifications
    vapidPublicKey: "BLCTejH7jwNbhou6z0KrCD2PDr_avgc3fXk6Y9866p4dzj9liYYr2elGXFpqBaUQEwmoZdRhhi1rF_kwOqlxaCo",
    vapidPrivateKey: "SXyG77GkclXz_A66YzrH4YSCRSGybmmXY7mnnXCpGoU" // Keep this secret! (Only needed for backend sending)
};

/**
 * Application limits to prevent performance issues
 */
export const LIMITS = {
    MAX_SECTIONS: 50,
    MAX_VIDEOS_PER_SECTION: 200,
    MAX_COURSES: 20,
    MAX_TITLE_LENGTH: 100,
    MAX_SECTION_TITLE_LENGTH: 50,
    MAX_VIDEO_LENGTH_MINUTES: 999
};
