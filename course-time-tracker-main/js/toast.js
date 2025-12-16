const toastContainer = document.getElementById("toast-container");

// Toast icons for different types
const toastIcons = {
  default: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>`,
  warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>`,
};

export function toast(msg, type = "default", ms = 2200) {
  const el = document.createElement("div");

  // Base classes for the toast with relative positioning for progress bar
  let baseClasses =
    "toast relative px-4 py-3 rounded-lg shadow-lg inline-flex items-center gap-3 min-w-[280px] max-w-md";

  // Light and dark mode background + text colors based on type
  const typeClasses = {
    default:
      "bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
    success:
      "bg-green-500 text-white dark:bg-green-600 border border-green-600 dark:border-green-700",
    error:
      "bg-red-500 text-white dark:bg-red-600 border border-red-600 dark:border-red-700",
    warning:
      "bg-amber-400 text-white dark:bg-amber-500 border border-amber-500 dark:border-amber-600",
  };

  el.className = `${baseClasses} ${typeClasses[type] || typeClasses.default}`;
  
  // Add ARIA attributes for accessibility
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

  // Create toast content with icon
  const icon = toastIcons[type] || toastIcons.default;
  el.innerHTML = `
    <div class="flex-shrink-0">
      ${icon}
    </div>
    <div class="flex-1 text-sm font-medium">
      ${msg}
    </div>
    <div class="toast-progress"></div>
  `;

  // Limit max toasts to 3
  while (toastContainer.children.length >= 3) {
    toastContainer.removeChild(toastContainer.firstChild);
  }

  // Append to toast container
  toastContainer.appendChild(el);

  // Auto-dismiss with animation
  setTimeout(() => {
    el.style.animation = "toast-out .2s ease forwards";
    setTimeout(() => el.remove(), 200);
  }, ms);
}

// Expose toast globally for error boundary
if (typeof window !== 'undefined') {
  window.toast = toast;
}
