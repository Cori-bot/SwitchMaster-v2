import { state, constants } from './state.js';
import { showNotification } from './ui.js';

const ipcRenderer = window.ipc;

export function initSecurity() {
  const settingSecurityEnable = document.getElementById("setting-security-enable");
  const securityConfigArea = document.getElementById("security-config-area");
  const btnChangePin = document.getElementById("btn-change-pin");
  const pinButtons = document.querySelectorAll(".pin-btn:not(.empty):not(.delete)");
  const pinDeleteBtn = document.getElementById("pin-delete");

  settingSecurityEnable.onchange = async (e) => {
    if (e.target.checked) {
      showLockScreen("set");
    } else {
      await ipcRenderer.invoke("disable-pin");
      showNotification("Code PIN désactivé", "info");
      securityConfigArea.style.display = "none";
    }
  };

  btnChangePin.onclick = () => showLockScreen("set");

  pinButtons.forEach(btn => {
    btn.onclick = () => handlePinInput(btn.dataset.val);
  });

  pinDeleteBtn.onclick = () => {
    if (state.currentPinInput.length > 0) {
      state.currentPinInput = state.currentPinInput.slice(0, -1);
      updatePinDisplay();
    }
  };
}

export function showLockScreen(mode = "verify") {
  const lockScreen = document.getElementById("lock-screen");
  const lockError = document.getElementById("lock-error");
  const title = lockScreen.querySelector("h2");
  const desc = lockScreen.querySelector("p");

  state.currentPinInput = "";
  updatePinDisplay();
  
  lockScreen.style.display = "flex";
  lockError.classList.remove("show");

  if (mode === "verify") {
    title.textContent = "Verrouillé";
    desc.textContent = "Entrez votre code PIN pour accéder à SwitchMaster";
    state.isSettingPin = false;
  } else if (mode === "set") {
    title.textContent = "Définir un Code PIN";
    desc.textContent = "Entrez un nouveau code PIN à 4 chiffres";
    state.isSettingPin = true;
    state.confirmPin = "";
  }
}

export function updatePinDisplay() {
  const dots = document.querySelectorAll("#lock-pin-display .pin-dot");
  dots.forEach((dot, index) => {
    if (index < state.currentPinInput.length) {
      dot.classList.add("filled");
    } else {
      dot.classList.remove("filled");
    }
  });
}

export function handlePinInput(value) {
  if (state.currentPinInput.length < constants.PIN_LENGTH) {
    state.currentPinInput += value;
    updatePinDisplay();
  }
  if (state.currentPinInput.length === constants.PIN_LENGTH) {
    setTimeout(processPin, constants.PIN_PROCESS_DELAY_MS);
  }
}

async function processPin() {
  const lockScreen = document.getElementById("lock-screen");
  const lockError = document.getElementById("lock-error");
  const securityConfigArea = document.getElementById("security-config-area");
  const settingSecurityEnable = document.getElementById("setting-security-enable");

  if (state.isSettingPin) {
    if (!state.confirmPin) {
      state.confirmPin = state.currentPinInput;
      state.currentPinInput = "";
      updatePinDisplay();
      lockScreen.querySelector("h2").textContent = "Confirmer le PIN";
      lockScreen.querySelector("p").textContent = "Entrez le code à nouveau pour confirmer";
    } else {
      if (state.currentPinInput === state.confirmPin) {
        await ipcRenderer.invoke("set-pin", state.currentPinInput);
        lockScreen.style.display = "none";
        showNotification("Code PIN activé !", "success");
        settingSecurityEnable.checked = true;
        securityConfigArea.style.display = "block";
        state.isSettingPin = false;
        state.confirmPin = "";
      } else {
        lockError.textContent = "Les codes PIN ne correspondent pas";
        lockError.classList.add("show");
        state.currentPinInput = "";
        state.confirmPin = "";
        setTimeout(() => {
          showLockScreen("set");
        }, constants.PIN_ERROR_RESET_DELAY_MS);
      }
    }
  } else {
    const success = await ipcRenderer.invoke("verify-pin", state.currentPinInput);
    if (success) {
      lockScreen.style.display = "none";
      showNotification("Accès autorisé", "success");
    } else {
      lockError.textContent = "Code PIN incorrect";
      lockError.classList.add("show");
      state.currentPinInput = "";
      updatePinDisplay();
      const content = lockScreen.querySelector(".lock-content");
      content.classList.add("shake");
      setTimeout(() => {
        content.classList.remove("shake");
      }, constants.ERROR_SHAKE_DELAY_MS);
    }
  }
}
