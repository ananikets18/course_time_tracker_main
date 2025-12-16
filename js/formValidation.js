// Form validation utility with visual feedback
export function validateInput(input, rules) {
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = "";

    // Required validation
    if (rules.required && !value) {
        isValid = false;
        errorMessage = rules.requiredMessage || "This field is required";
    }

    // Min length validation
    if (isValid && rules.minLength && value.length < rules.minLength) {
        isValid = false;
        errorMessage = rules.minLengthMessage || `Minimum ${rules.minLength} characters required`;
    }

    // Max length validation
    if (isValid && rules.maxLength && value.length > rules.maxLength) {
        isValid = false;
        errorMessage = rules.maxLengthMessage || `Maximum ${rules.maxLength} characters allowed`;
    }

    // Number validation
    if (isValid && rules.number) {
        const num = Number(value);
        if (isNaN(num)) {
            isValid = false;
            errorMessage = "Must be a valid number";
        } else {
            // Min value
            if (rules.min !== undefined && num < rules.min) {
                isValid = false;
                errorMessage = `Must be at least ${rules.min}`;
            }
            // Max value
            if (rules.max !== undefined && num > rules.max) {
                isValid = false;
                errorMessage = `Must be at most ${rules.max}`;
            }
        }
    }

    // Custom validation function
    if (isValid && rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
            isValid = false;
            errorMessage = customResult || "Invalid input";
        }
    }

    // Apply visual feedback
    applyValidationFeedback(input, isValid, errorMessage);

    return { isValid, errorMessage };
}

function applyValidationFeedback(input, isValid, errorMessage) {
    // Remove existing feedback
    const existingError = input.parentElement.querySelector(".validation-error");
    if (existingError) {
        existingError.remove();
    }

    // Remove previous classes
    input.classList.remove(
        "border-green-500",
        "border-red-500",
        "focus:ring-green-500",
        "focus:ring-red-500",
        "shake"
    );

    if (input.value.trim()) {
        if (isValid) {
            // Valid state
            input.classList.add("border-green-500", "focus:ring-green-500");

            // Add checkmark icon
            if (!input.parentElement.querySelector(".validation-icon")) {
                const icon = document.createElement("div");
                icon.className = "validation-icon absolute right-3 top-1/2 -translate-y-1/2 text-green-500";
                icon.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        `;
                input.parentElement.style.position = "relative";
                input.parentElement.appendChild(icon);
            }
        } else {
            // Invalid state
            input.classList.add("border-red-500", "focus:ring-red-500", "shake");

            // Remove checkmark if exists
            const icon = input.parentElement.querySelector(".validation-icon");
            if (icon) icon.remove();

            // Add error message
            if (errorMessage) {
                const errorEl = document.createElement("div");
                errorEl.className = "validation-error text-red-500 text-xs mt-1 flex items-center gap-1";
                errorEl.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>${errorMessage}</span>
        `;
                input.parentElement.appendChild(errorEl);
            }

            // Remove shake class after animation
            setTimeout(() => input.classList.remove("shake"), 300);
        }
    } else {
        // Neutral state (empty)
        const icon = input.parentElement.querySelector(".validation-icon");
        if (icon) icon.remove();
    }
}

// Validate form with all inputs
export function validateForm(formInputs) {
    let allValid = true;
    const results = {};

    formInputs.forEach(({ input, rules }) => {
        const result = validateInput(input, rules);
        results[input.id] = result;
        if (!result.isValid) {
            allValid = false;
        }
    });

    return { allValid, results };
}

// Add real-time validation to input
export function addRealtimeValidation(input, rules) {
    // Validate on blur
    input.addEventListener("blur", () => {
        validateInput(input, rules);
    });

    // Validate on input (with debounce)
    let timeout;
    input.addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            validateInput(input, rules);
        }, 300);
    });
}
