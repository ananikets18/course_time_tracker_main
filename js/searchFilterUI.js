/**
 * Search and Filter UI Controller
 * Connects the search/filter UI elements to the search/filter system
 */

import {
    loadFilterState,
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    clearFilters,
    getFilterState,
    hasActiveFilters,
    getFilterStats,
    initSearchShortcuts,
} from "./searchFilter.js";
import { renderCourse } from "./courseRenderer.js";

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize search and filter UI
export function initSearchFilterUI() {
    // Load saved filter state
    loadFilterState();

    // Initialize keyboard shortcuts
    initSearchShortcuts();

    // Get UI elements
    const searchInput = document.getElementById("search-input");
    const statusFilter = document.getElementById("status-filter");
    const sortBy = document.getElementById("sort-by");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const filterStats = document.getElementById("filter-stats");
    const filterStatsText = document.getElementById("filter-stats-text");

    // Restore filter state to UI
    const state = getFilterState();
    if (searchInput) searchInput.value = state.searchQuery || "";
    if (statusFilter) statusFilter.value = state.statusFilter || "all";
    if (sortBy) sortBy.value = state.sortBy || "default";

    // Update UI based on filter state
    updateFilterUI();

    // Search input handler (debounced for performance)
    const handleSearch = debounce(() => {
        if (searchInput) {
            setSearchQuery(searchInput.value);
            renderCourse();
            updateFilterUI();
        }
    }, 300);

    if (searchInput) {
        searchInput.addEventListener("input", handleSearch);
    }

    // Status filter handler
    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            setStatusFilter(statusFilter.value);
            renderCourse();
            updateFilterUI();
        });
    }

    // Sort by handler
    if (sortBy) {
        sortBy.addEventListener("change", () => {
            setSortBy(sortBy.value);
            renderCourse();
            updateFilterUI();
        });
    }

    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", () => {
            clearFilters();

            // Reset UI
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "all";
            if (sortBy) sortBy.value = "default";

            renderCourse();
            updateFilterUI();
        });
    }
}

// Update filter UI (show/hide clear button and stats)
function updateFilterUI() {
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const filterStats = document.getElementById("filter-stats");
    const filterStatsText = document.getElementById("filter-stats-text");

    if (hasActiveFilters()) {
        // Show clear button
        if (clearFiltersBtn) {
            clearFiltersBtn.classList.remove("hidden");
        }

        // Show filter stats
        const stats = getFilterStats();
        if (filterStats && filterStatsText) {
            filterStats.classList.remove("hidden");
            filterStatsText.textContent = `Showing ${stats.filtered} of ${stats.total} videos`;

            if (stats.hidden > 0) {
                filterStatsText.textContent += ` (${stats.hidden} hidden)`;
            }
        }
    } else {
        // Hide clear button
        if (clearFiltersBtn) {
            clearFiltersBtn.classList.add("hidden");
        }

        // Hide filter stats
        if (filterStats) {
            filterStats.classList.add("hidden");
        }
    }
}

// Export for use in other modules
export { updateFilterUI };
