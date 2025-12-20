import { state, constants } from './state.js';
import { devLog, devError } from './ui.js';
import { openModal, closeModal } from './modals.js';

const ipcRenderer = window.ipc;

export function initMainUI() {
  setupQuitModal();
  setupUpdateModal();
  setupLaunchModal();
  setupDeleteModal();
  
  ipcRenderer.on("riot-client-closed", () => {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");
    if (statusText) statusText.textContent = "Ready";
    if (statusDot) statusDot.classList.add("active");
    resetActiveAccountUI();
    checkStatus();
  });

  ipcRenderer.on("show-quit-modal", () => {
    openModal("quit-modal");
  });
}

function setupLaunchModal() {
  const btnConfirmLaunch = document.getElementById("btn-confirm-launch");
  if (btnConfirmLaunch) {
    btnConfirmLaunch.onclick = async () => {
      if (state.pendingAccountId) {
        closeModal("launch-game-modal");
        await performSwitch(state.pendingAccountId, state.pendingGameType, true);
        state.pendingAccountId = null;
        state.pendingGameType = null;
      }
    };
  }

  document.querySelectorAll(".close-launch-modal").forEach(btn => {
    btn.onclick = async () => {
      closeModal("launch-game-modal");
      if (state.pendingAccountId) {
        await performSwitch(state.pendingAccountId, state.pendingGameType, false);
        state.pendingAccountId = null;
        state.pendingGameType = null;
      }
    };
  });
}

async function performSwitch(id, gameType, shouldLaunch) {
  try {
    await ipcRenderer.invoke("switch-account", id);
    if (shouldLaunch) {
      await ipcRenderer.invoke("launch-game", gameType);
    }
    checkStatus();
  } catch (err) {
    devError("Switch failed:", err);
  }
}

function setupDeleteModal() {
  const btnConfirmDelete = document.getElementById("btn-confirm-delete");
  if (btnConfirmDelete) {
    btnConfirmDelete.onclick = async () => {
      if (state.pendingDeleteAccountId) {
        await ipcRenderer.invoke("delete-account", state.pendingDeleteAccountId);
        state.pendingDeleteAccountId = null;
        closeModal("delete-account-modal");
        // We'll need to trigger a refresh - this is usually done by the caller or via a global refresh
        window.dispatchEvent(new CustomEvent('accounts-updated'));
      }
    };
  }
}

export async function checkStatus() {
  devLog("checkStatus called");
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  
  if (!statusText || !statusDot) return;

  try {
    const statusResponse = await ipcRenderer.invoke("get-status");
    const isActive = statusResponse && statusResponse.status === "Active" && statusResponse.accountId;

    if (!isActive) {
      applyDefaultStatus(statusResponse);
      return;
    }

    const acc = state.accounts.find((a) => a.id === statusResponse.accountId);
    if (!acc) {
      applyDefaultStatus(statusResponse);
      return;
    }

    applyActiveAccountStatus(acc);
  } catch (err) {
    devError("Error in checkStatus:", err);
  }
}

function applyDefaultStatus(statusResponse) {
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  
  if (statusText) statusText.textContent = (statusResponse && statusResponse.status) || "Unknown";
  if (statusDot) statusDot.classList.add("active");
  resetActiveAccountUI();
}

function applyActiveAccountStatus(acc) {
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  
  if (statusText) statusText.textContent = `Active: ${acc.name}`;
  if (statusDot) statusDot.classList.add("active");
  
  resetActiveAccountUI();
  const card = document.querySelector(`.btn-switch[data-id="${acc.id}"]`)?.closest(".account-card");
  if (card) card.classList.add("active-account");
}

function resetActiveAccountUI() {
  document.querySelectorAll(".account-card").forEach(card => card.classList.remove("active-account"));
}

function setupQuitModal() {
  const btnQuitApp = document.getElementById("btn-quit-app");
  const btnQuitMinimize = document.getElementById("btn-quit-minimize");
  const btnQuitCancel = document.getElementById("btn-quit-cancel");
  const quitDontShowAgain = document.getElementById("quit-dont-show-again");

  if (btnQuitApp) {
    btnQuitApp.onclick = async () => {
      const dontShowAgain = quitDontShowAgain ? quitDontShowAgain.checked : false;
      await ipcRenderer.invoke("handle-quit-choice", {
        action: "quit",
        dontShowAgain,
      });
      closeModal("quit-modal");
    };
  }

  if (btnQuitMinimize) {
    btnQuitMinimize.onclick = async () => {
      const dontShowAgain = quitDontShowAgain ? quitDontShowAgain.checked : false;
      await ipcRenderer.invoke("handle-quit-choice", {
        action: "minimize",
        dontShowAgain,
      });
      closeModal("quit-modal");
    };
  }

  if (btnQuitCancel) {
    btnQuitCancel.onclick = () => closeModal("quit-modal");
  }
}

function setupUpdateModal() {
  const btnUpdateDownload = document.getElementById("btn-update-download");
  const btnUpdateLater = document.getElementById("btn-update-later");
  const btnCheckUpdates = document.getElementById("btn-check-updates");

  ipcRenderer.on("update-status", (event, updateInfo) => {
    if (updateInfo.status === "available") {
      showUpdateModal({
        available: true,
        latestVersion: updateInfo.version,
        currentVersion: constants.CURRENT_APP_VERSION,
        releaseNotes: updateInfo.releaseNotes || "",
      });
    } else if (updateInfo.status === "not-available") {
      import('./ui.js').then(({ showNotification }) => {
        showNotification("Votre version est à jour !", "success");
      });
      if (btnCheckUpdates) {
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = "Vérifier les mises à jour";
      }
    } else if (updateInfo.status === "error") {
      import('./ui.js').then(({ showNotification }) => {
        showNotification("Erreur lors de la vérification des mises à jour", "error");
      });
      if (btnCheckUpdates) {
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = "Vérifier les mises à jour";
      }
    }
  });

  ipcRenderer.on("update-progress", (event, progress) => {
    if (btnUpdateDownload) {
      btnUpdateDownload.textContent = `Téléchargement... ${progress.percent}%`;
      btnUpdateDownload.disabled = true;
    }
  });

  ipcRenderer.on("update-downloaded", () => {
    if (btnUpdateDownload) {
      btnUpdateDownload.textContent = "Installer maintenant";
      btnUpdateDownload.disabled = false;
      btnUpdateDownload.onclick = async () => {
        try {
          await ipcRenderer.invoke("install-update");
        } catch (error) {
          devError("Update install failed:", error);
        }
      };
    }
    import('./ui.js').then(({ showNotification }) => {
      showNotification("Mise à jour téléchargée ! Cliquez pour installer.", "success");
    });
  });

  if (btnUpdateDownload) {
    btnUpdateDownload.onclick = async () => {
      try {
        btnUpdateDownload.textContent = "Téléchargement...";
        btnUpdateDownload.disabled = true;
        await ipcRenderer.invoke("check-for-updates");
      } catch (error) {
        devError("Update download failed:", error);
        btnUpdateDownload.textContent = "Télécharger";
        btnUpdateDownload.disabled = false;
      }
    };
  }

  if (btnUpdateLater) {
    btnUpdateLater.onclick = () => closeModal("update-modal");
  }

  if (btnCheckUpdates) {
    btnCheckUpdates.onclick = async () => {
      try {
        btnCheckUpdates.disabled = true;
        btnCheckUpdates.textContent = "Vérification...";
        await ipcRenderer.invoke("check-for-updates");
      } catch (error) {
        devError("Update check failed:", error);
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = "Vérifier les mises à jour";
      }
    };
  }
}

function showUpdateModal(updateInfo) {
  const latestVersionEl = document.getElementById("update-latest-version");
  const currentVersionEl = document.getElementById("update-current-version");
  const releaseNotesEl = document.getElementById("update-release-notes");

  if (latestVersionEl) latestVersionEl.textContent = `v${updateInfo.latestVersion}`;
  if (currentVersionEl) currentVersionEl.textContent = `v${updateInfo.currentVersion}`;
  
  if (releaseNotesEl) {
    let htmlNotes = "";
    if (updateInfo.releaseNotes) {
      try {
        htmlNotes = window.marked.parse(updateInfo.releaseNotes);
      } catch (e) {
        htmlNotes = updateInfo.releaseNotes.split("\n").join("<br>");
      }
    }
    import('./ui.js').then(({ setSafeHTML }) => {
      setSafeHTML(releaseNotesEl, htmlNotes);
    });
  }

  openModal("update-modal");
}
