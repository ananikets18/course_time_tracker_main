export const todayDate = () => new Date().toISOString().split("T")[0];

export const minutesToSeconds = (min) => Math.round(min * 60);

export const secondsToMinutesLabel = (sec) => Math.round(sec / 60) + "m";

export const formatShortDate = (iso) => iso; // yyyy-mm-dd (localize later)

export function lastNDates(n = 7) {
  const arr = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(d.toISOString().split("T")[0]);
  }
  return arr;
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length (default: 200)
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, maxLength = 200) {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and limit length
  let sanitized = input.trim().substring(0, maxLength);
  
  // Escape HTML special characters to prevent XSS
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  sanitized = sanitized.replace(/[&<>"'\/]/g, (char) => escapeMap[char]);
  
  return sanitized;
}

/**
 * Validate numeric input
 * @param {number} value - The number to validate
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 999999)
 * @returns {object} { isValid: boolean, value: number, error: string }
 */
export function validateNumber(value, min = 0, max = 999999) {
  const num = Number(value);
  
  if (isNaN(num)) {
    return { isValid: false, value: 0, error: 'Please enter a valid number' };
  }
  
  if (num < min) {
    return { isValid: false, value: num, error: `Value must be at least ${min}` };
  }
  
  if (num > max) {
    return { isValid: false, value: num, error: `Value must not exceed ${max}` };
  }
  
  return { isValid: true, value: num, error: null };
}

/**
 * Error boundary wrapper for async operations
 * @param {Function} fn - Async function to wrap
 * @param {string} errorMessage - User-friendly error message
 * @param {Function} onError - Optional error callback
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorBoundary(fn, errorMessage = "An error occurred", onError = null) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      console.error(`Error in ${fn.name || 'operation'}:`, error);
      
      // Import toast dynamically to avoid circular dependencies
      if (typeof window !== 'undefined' && window.toast) {
        window.toast(errorMessage, "error");
      }
      
      if (onError) {
        onError(error);
      }
      
      throw error; // Re-throw for caller to handle if needed
    }
  };
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Debounce function - delays execution until after wait time has elapsed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
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

/**
 * Throttle function - limits execution to once per wait time
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, wait = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}
