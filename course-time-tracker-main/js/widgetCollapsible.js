
/**
 * Widget Collapsible System
 * Handles expanding/collapsing of dashboard widgets and persistence.
 */

export function initWidgetCollapsible() {
    const widgets = document.querySelectorAll('.widget-card');

    widgets.forEach(widget => {
        const header = widget.querySelector('.widget-header');
        const content = widget.querySelector('.widget-content');
        const toggleBtn = widget.querySelector('.widget-toggle-btn');
        const icon = toggleBtn?.querySelector('svg');
        const widgetId = widget.id;

        if (!header || !content || !widgetId) return;

        // Load saved state
        const isCollapsed = localStorage.getItem(`widget_collapsed_${widgetId}`) === 'true';
        if (isCollapsed) {
            content.classList.add('collapsed');
            icon?.classList.add('rotated');
        }

        // Toggle handler
        const toggleWidget = (e) => {
            // Prevent triggering if clicking interactive elements inside header (if any)
            if (e.target.closest('button') && e.target.closest('button') !== toggleBtn) return;

            e.stopPropagation(); // Prevent bubbling

            const wasCollapsed = content.classList.contains('collapsed');

            // Toggle classes
            content.classList.toggle('collapsed');
            icon?.classList.toggle('rotated');

            // Save state
            localStorage.setItem(`widget_collapsed_${widgetId}`, !wasCollapsed);
        };

        // Add listeners to both header (for easier clicking) and button
        header.addEventListener('click', toggleWidget);
        toggleBtn?.addEventListener('click', (e) => {
            // The header listener handles the logic, but we need to ensure 
            // clicking the button doesn't double-trigger if it bubbles.
            // Actually, let's just let the header handle it, or stop propagation on button.
            // Simplest: Button is inside header. Header click catches it.
            // But we need to prevent default if it's a button to avoid form submission behavior (though it's type=button implicitly usually)
            e.preventDefault();
            // toggleWidget is attached to header, so clicking button bubbles to header.
            // We don't need a separate listener on button if header has one.
        });
    });
}
