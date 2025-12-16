// Button loading state utility
export function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        // Store original content
        button.dataset.originalContent = button.innerHTML;

        // Add loading class
        button.classList.add("btn-loading");
        button.disabled = true;

        // Add spinner
        button.innerHTML = `
      <span class="button-text">${button.dataset.originalContent}</span>
      <span class="button-spinner absolute inset-0 flex items-center justify-center">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </span>
    `;
    } else {
        // Remove loading class
        button.classList.remove("btn-loading");
        button.disabled = false;

        // Restore original content
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            delete button.dataset.originalContent;
        }
    }
}

// Simulate async operation with loading state
export async function withLoading(button, asyncFn) {
    setButtonLoading(button, true);

    try {
        await asyncFn();
    } finally {
        setButtonLoading(button, false);
    }
}
