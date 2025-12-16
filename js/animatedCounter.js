// Animated counter utility
export function animateCounter(element, targetValue, duration = 1000, suffix = "") {
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        element.textContent = currentValue + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = targetValue + suffix;
        }
    }

    requestAnimationFrame(update);
}

// Animate percentage with symbol
export function animatePercentage(element, targetPercent, duration = 1000) {
    animateCounter(element, targetPercent, duration, "%");
}

// Animate time in minutes
export function animateTime(element, targetMinutes, duration = 1000) {
    animateCounter(element, targetMinutes, duration, "m");
}
