// Confetti celebration animation
export function triggerConfetti(customDuration, customInitialParticleCount) {
    const duration = customDuration || 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const initialParticleCount = customInitialParticleCount || 50;
        const particleCount = initialParticleCount * (timeLeft / duration);

        // Create confetti particles
        createConfettiParticles(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            })
        );
        createConfettiParticles(
            Object.assign({}, defaults, {
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            })
        );
    }, 250);
}

function createConfettiParticles(options) {
    const container = document.body;
    const particleCount = options.particleCount || 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "confetti-particle";

        // Random colors
        const colors = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random size
        const size = Math.random() * 8 + 4;

        // Starting position
        const startX = (options.origin?.x || 0.5) * window.innerWidth;
        const startY = (options.origin?.y || 0) * window.innerHeight;

        // Random velocity
        const velocityX = (Math.random() - 0.5) * (options.startVelocity || 30);
        const velocityY = Math.random() * -(options.startVelocity || 30);

        // Random rotation
        const rotation = Math.random() * 360;
        const rotationSpeed = (Math.random() - 0.5) * 10;

        particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${startX}px;
      top: ${startY}px;
      border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
      pointer-events: none;
      z-index: ${options.zIndex || 9999};
      transform: rotate(${rotation}deg);
      opacity: 1;
    `;

        container.appendChild(particle);

        // Animate particle
        animateParticle(particle, velocityX, velocityY, rotationSpeed);
    }
}

function animateParticle(particle, velocityX, velocityY, rotationSpeed) {
    let x = parseFloat(particle.style.left);
    let y = parseFloat(particle.style.top);
    let rotation = 0;
    let opacity = 1;
    let vy = velocityY;

    const gravity = 0.5;
    const friction = 0.99;

    function update() {
        // Apply physics
        vy += gravity;
        x += velocityX * friction;
        y += vy;
        rotation += rotationSpeed;
        opacity -= 0.01;

        // Update particle
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        particle.style.transform = `rotate(${rotation}deg)`;
        particle.style.opacity = opacity;

        // Remove if off screen or invisible
        if (y > window.innerHeight || opacity <= 0) {
            particle.remove();
        } else {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Check if course is 100% complete and trigger celebration
export function checkCourseCompletion(course) {
    let totalVideos = 0;
    let completedVideos = 0;

    course.sections.forEach((section) => {
        section.videos.forEach((video) => {
            totalVideos++;
            if (video.watched >= video.length) {
                completedVideos++;
            }
        });
    });

    // If all videos are complete and there's at least one video
    if (totalVideos > 0 && completedVideos === totalVideos) {
        return true;
    }

    return false;
}

// Check milestone progress (25%, 50%, 75%, 100%)
export function checkMilestone(course) {
    let totalVideos = 0;
    let completedVideos = 0;

    course.sections.forEach((section) => {
        section.videos.forEach((video) => {
            totalVideos++;
            if (video.watched >= video.length) {
                completedVideos++;
            }
        });
    });

    if (totalVideos === 0) return null;

    const completionPercent = Math.round((completedVideos / totalVideos) * 100);

    // Return milestone if reached
    if (completionPercent === 100) return 100;
    if (completionPercent >= 75 && completionPercent < 100) return 75;
    if (completionPercent >= 50 && completionPercent < 75) return 50;
    if (completionPercent >= 25 && completionPercent < 50) return 25;

    return null;
}

// Trigger milestone celebration with custom confetti
export function celebrateMilestone(milestone) {
    const messages = {
        25: "🎯 Quarter Way There! Keep it up!",
        50: "🌟 Halfway Complete! You're doing great!",
        75: "🚀 Three Quarters Done! Almost there!",
        100: "🎉 Congratulations! You've completed the entire course!"
    };

    const durations = {
        25: 1500,
        50: 2000,
        75: 2500,
        100: 3000
    };

    const particleCounts = {
        25: 30,
        50: 40,
        75: 50,
        100: 60
    };

    // Trigger confetti with custom settings
    triggerConfetti(durations[milestone], particleCounts[milestone]);

    // Show toast message
    setTimeout(async () => {
        const { toast } = await import('./toast.js');
        toast(messages[milestone], "success", 4000);
    }, 300);
}
