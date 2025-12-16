const modalOverlay = document.getElementById("modal-overlay");
const modal = document.getElementById("modal");
let previousActiveElement = null;

export function openModal(contentHtml) {
  // Store currently focused element
  previousActiveElement = document.activeElement;
  
  modal.innerHTML = contentHtml;
  modalOverlay.classList.remove("hidden");
  
  // Set ARIA attributes
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  
  requestAnimationFrame(() => {
    modal.classList.add("scale-100");
    
    // Focus first input or button in modal
    const firstInput = modal.querySelector('input, textarea, select, button');
    if (firstInput) {
      firstInput.focus();
    }
  });
}

export function closeModal() {
  modalOverlay.classList.add("hidden");
  modal.innerHTML = "";
  modal.removeAttribute('role');
  modal.removeAttribute('aria-modal');
  
  // Restore focus to previously focused element
  if (previousActiveElement) {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
}

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
