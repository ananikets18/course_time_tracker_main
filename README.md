# 📚 Course Time Tracker

> **Transform your online learning journey into an engaging, gamified experience.**  
> Track progress, build streaks, unlock achievements, and stay motivated—all while learning at your own pace.

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Offline First](https://img.shields.io/badge/Offline-First-blue?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Offline_Service_workers)
[![No Build Required](https://img.shields.io/badge/Build-Not%20Required-green?style=flat-square)](https://vanilla-js.com/)

---

## 🎯 **Why Course Time Tracker?**

Staying consistent with online courses is hard. **Course Time Tracker** makes it easier by turning learning into a rewarding habit with gamification, progress tracking, and smart reminders.

### ✨ **Key Features**

- 🎮 **Gamification** - Unlock 15+ achievements and build learning streaks
- 📊 **Visual Progress** - Beautiful charts and real-time statistics
- ⏱️ **Focus Timer** - Built-in Pomodoro timer for focused sessions
- 🌙 **Dark Mode** - Easy on the eyes during late-night study
- 📱 **Responsive** - Works perfectly on mobile, tablet, and desktop
- 🔔 **Smart Reminders** - Push notifications to keep you on track
- 💾 **Offline First** - All data stored locally, works without internet
- ☁️ **Optional Cloud Sync** - Sync across devices with Supabase

---

## 🚀 **Quick Start**

### **Try It Now**

```bash
# Clone the repository
git clone https://github.com/ananikets18/course_time_tracker_main.git
cd course_time_tracker_main

# Open in browser (or use a local server)
npx serve .
```

### **Install as PWA**

1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Enjoy native app experience!

---

## 🎨 **Core Features**

### 📈 **Progress Tracking**
- Overall course completion with animated counters
- Section-based organization with drag & drop
- Time tracking for every video
- 7-day activity history chart

### 🔥 **Streak System**
- Track consecutive days of learning
- Current and longest streak display
- Motivational messages based on progress

### 🏆 **Achievements**
Unlock badges as you progress:

| Achievement | Description | Icon |
|------------|-------------|------|
| **First Steps** | Complete your first video | 🎬 |
| **Week Warrior** | Maintain a 7-day streak | 🔥 |
| **Early Bird** | Study before 8 AM | 🌅 |
| **Night Owl** | Study after 10 PM | 🦉 |
| **Speed Demon** | Complete 5 videos in one day | ⚡ |
| **Course Master** | Complete 100% of a course | 🏆 |

### ⏰ **Focus Timer**
- Pomodoro-style timer with custom durations
- Pause/resume functionality
- Automatic time tracking
- State persistence across page refreshes

### 🎯 **Daily Goals**
- Set daily video and time targets
- Real-time progress tracking
- Smart motivational messages

### 🧠 **Spaced Repetition**
- Science-backed review intervals (1, 3, 7, 14, 30 days)
- Automatic review reminders
- Improve long-term retention

---

## 🛠️ **Tech Stack**

Built with modern web technologies, no frameworks required:

- **HTML5** - Semantic markup with accessibility
- **CSS3** - Custom properties, animations, dark mode
- **Vanilla JavaScript (ES6+)** - Modular architecture
- **Dexie.js** - IndexedDB wrapper for local storage
- **Supabase** - Optional cloud sync
- **Service Worker** - PWA and offline support

**No build step required!** Just open `index.html` and start coding.

---

## 📁 **Project Structure**

```
course-time-tracker/
├── index.html              # Main application
├── style.css               # Design system
├── manifest.json           # PWA config
├── sw.js                   # Service worker
│
├── assets/                 # Icons
│   ├── icon-192.png
│   └── icon-512.png
│
├── js/                     # 30 JavaScript modules
│   ├── main.js            # App initialization
│   ├── db.js              # Database layer
│   ├── courseRenderer.js  # UI rendering
│   ├── dashboard.js       # Statistics
│   ├── focusTimer.js      # Pomodoro timer
│   ├── achievements.js    # Badge system
│   └── ...
│
└── scripts/               # Backend utilities
    ├── generate_config.js # VAPID keys
    └── send-notification.js
```

---

## 🎮 **How to Use**

### **1. Create a Course**
Click **"+ New Course"** in the header dropdown.

### **2. Add Sections & Videos**
- Click **"+ Add Section"** to create sections
- Click **"+ Add Video"** to add videos
- Enter title, URL, and duration
- Drag & drop to reorder

### **3. Track Progress**
- ✅ Click checkbox to mark videos complete
- ⏱️ Use focus timer for timed sessions
- 📊 Watch dashboard update in real-time
- 🎉 Unlock achievements!

### **4. Set Daily Goals**
- Open **Settings** (⚙️)
- Set daily video and time goals
- Track progress throughout the day

### **5. Enable Cloud Sync** (Optional)
1. Create a [Supabase account](https://supabase.com)
2. Copy project URL and anon key
3. Paste in **Settings → Cloud Sync**
4. Auto-sync every 30 seconds

---

## 💾 **Data Management**

### **Export Data**
Settings → Export Data → Save JSON file

### **Import Data**
Settings → Import Data → Select JSON file

**Privacy:** All data stored locally. Cloud sync is optional. No tracking or analytics.

---

## 🌐 **Browser Compatibility**

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 87+ |
| Firefox | 78+ |
| Safari | 14+ |
| Edge | 87+ |

---

## 🤝 **Contributing**

Contributions welcome! 

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🗺️ **Roadmap**

- [ ] Video embedding (YouTube, Vimeo)
- [ ] Rich text notes with code snippets
- [ ] Advanced analytics dashboard
- [ ] Study groups and sharing
- [ ] Browser extension
- [ ] Native mobile apps

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 📞 **Contact**

- 🐛 **Issues:** [GitHub Issues](https://github.com/ananikets18/course_time_tracker_main/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/ananikets18/course_time_tracker_main/discussions)

---

<div align="center">

### **Happy Learning! 📚✨**

*Built with ❤️ by [Aniket Shinde](https://github.com/ananikets18)*

**If this helped you, give it a ⭐ on GitHub!**

</div>