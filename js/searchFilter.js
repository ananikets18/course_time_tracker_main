/**
 * Search & Filter System
 * 
 * Features:
 * - Real-time search across videos and sections
 * - Filter by completion status
 * - Sort by various criteria
 * - Keyboard shortcuts
 * - Search highlighting
 */

import { course } from "./storage.js";
import { renderCourse } from "./courseRenderer.js";

// Filter state
let filterState = {
    searchQuery: "",
    statusFilter: "all", // all, completed, in-progress, not-started
    sortBy: "default", // default, alphabetical, progress, recent
};

// Load filter state from localStorage
export function loadFilterState() {
    const saved = localStorage.getItem("courseFilterState");
    if (saved) {
        try {
            filterState = { ...filterState, ...JSON.parse(saved) };
        } catch (e) {
            console.warn("Failed to load filter state:", e);
        }
    }
}

// Save filter state to localStorage
function saveFilterState() {
    localStorage.setItem("courseFilterState", JSON.stringify(filterState));
}

// Get current filter state
export function getFilterState() {
    return { ...filterState };
}

// Update search query
export function setSearchQuery(query) {
    filterState.searchQuery = query.toLowerCase().trim();
    saveFilterState();
}

// Update status filter
export function setStatusFilter(status) {
    filterState.statusFilter = status;
    saveFilterState();
}

// Update sort option
export function setSortBy(sortBy) {
    filterState.sortBy = sortBy;
    saveFilterState();
}

// Clear all filters
export function clearFilters() {
    filterState = {
        searchQuery: "",
        statusFilter: "all",
        sortBy: "default",
    };
    saveFilterState();
}

// Check if a video matches the search query
function matchesSearch(video, section) {
    if (!filterState.searchQuery) return true;

    const query = filterState.searchQuery;
    const videoTitle = video.title.toLowerCase();
    const sectionTitle = section.title.toLowerCase();
    const videoUrl = (video.url || "").toLowerCase();

    return (
        videoTitle.includes(query) ||
        sectionTitle.includes(query) ||
        videoUrl.includes(query)
    );
}

// Check if a video matches the status filter
function matchesStatus(video) {
    if (filterState.statusFilter === "all") return true;

    const isCompleted = video.watched >= video.length && video.length > 0;
    const isInProgress = video.watched > 0 && video.watched < video.length;
    const isNotStarted = !video.watched || video.watched === 0;

    switch (filterState.statusFilter) {
        case "completed":
            return isCompleted;
        case "in-progress":
            return isInProgress;
        case "not-started":
            return isNotStarted;
        default:
            return true;
    }
}

// Filter and sort course data
export function getFilteredCourse() {
    if (!course || !course.sections) return null;

    // Deep clone to avoid mutating original
    const filtered = {
        ...course,
        sections: course.sections
            .map((section) => {
                const filteredVideos = section.videos.filter((video) => {
                    return matchesSearch(video, section) && matchesStatus(video);
                });

                return {
                    ...section,
                    videos: filteredVideos,
                };
            })
            .filter((section) => section.videos.length > 0), // Remove empty sections
    };

    // Apply sorting
    if (filterState.sortBy !== "default") {
        filtered.sections = sortSections(filtered.sections);
    }

    return filtered;
}

// Sort sections based on selected criteria
function sortSections(sections) {
    const sorted = [...sections];

    switch (filterState.sortBy) {
        case "alphabetical":
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            // Also sort videos within sections
            sorted.forEach((section) => {
                section.videos.sort((a, b) => a.title.localeCompare(b.title));
            });
            break;

        case "progress":
            sorted.sort((a, b) => {
                const progressA = calculateSectionProgress(a);
                const progressB = calculateSectionProgress(b);
                return progressB - progressA; // Descending
            });
            break;

        case "recent":
            // Sort by most recently updated (if we had timestamps)
            // For now, reverse order
            sorted.reverse();
            break;
    }

    return sorted;
}

// Calculate section progress percentage
function calculateSectionProgress(section) {
    if (!section.videos || section.videos.length === 0) return 0;

    let totalSeconds = 0;
    let watchedSeconds = 0;

    section.videos.forEach((video) => {
        totalSeconds += video.length || 0;
        watchedSeconds += Math.min(video.watched || 0, video.length || 0);
    });

    return totalSeconds > 0 ? (watchedSeconds / totalSeconds) * 100 : 0;
}

// Highlight search terms in text
export function highlightSearchTerm(text) {
    if (!filterState.searchQuery || !text) return text;

    const query = filterState.searchQuery;
    const regex = new RegExp(`(${escapeRegex(query)})`, "gi");

    return text.replace(
        regex,
        '<mark class="bg-yellow-200 dark:bg-yellow-600 dark:text-slate-900 px-1 rounded">$1</mark>'
    );
}

// Escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Get filter statistics
export function getFilterStats() {
    if (!course) return { total: 0, filtered: 0, hidden: 0 };

    let totalVideos = 0;
    let filteredVideos = 0;

    course.sections.forEach((section) => {
        totalVideos += section.videos.length;
    });

    const filtered = getFilteredCourse();
    if (filtered) {
        filtered.sections.forEach((section) => {
            filteredVideos += section.videos.length;
        });
    }

    return {
        total: totalVideos,
        filtered: filteredVideos,
        hidden: totalVideos - filteredVideos,
    };
}

// Check if any filters are active
export function hasActiveFilters() {
    return (
        filterState.searchQuery !== "" ||
        filterState.statusFilter !== "all" ||
        filterState.sortBy !== "default"
    );
}

// Initialize keyboard shortcuts
export function initSearchShortcuts() {
    document.addEventListener("keydown", (e) => {
        // "/" to focus search (like GitHub, Gmail)
        if (e.key === "/" && !isInputFocused()) {
            e.preventDefault();
            const searchInput = document.getElementById("search-input");
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }

        // Escape to clear search
        if (e.key === "Escape" && isInputFocused()) {
            const searchInput = document.getElementById("search-input");
            if (searchInput && searchInput.value) {
                searchInput.value = "";
                setSearchQuery("");
                renderCourse();
            }
        }
    });
}

// Check if an input element is focused
function isInputFocused() {
    const active = document.activeElement;
    return (
        active &&
        (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable)
    );
}
