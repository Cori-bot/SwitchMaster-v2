import { state } from './state.js';

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
    
    // Auto-focus first input if any
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
  }
}

export function initModalListeners() {
  // Global close on overlay click or close button
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal(modal.id);
    };
  });

  document.querySelectorAll(".close-modal, .btn-quit-cancel, .btn-update-later, .close-launch-modal, .close-delete-modal, #btn-close-error").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const modal = btn.closest(".modal-overlay");
      if (modal) closeModal(modal.id);
    };
  });
}

export function showErrorModal(message) {
  const modal = document.getElementById("error-modal");
  const msgEl = document.getElementById("error-modal-message");
  if (modal && msgEl) {
    msgEl.textContent = message || "Une erreur est survenue.";
    openModal("error-modal");
  }
}
