import { state, constants } from './state.js';
import { devLog, devError, showNotification } from './ui.js';
import { renderAccounts, initAccountModal, validateAccountData } from './accountsUI.js';
import { initSettings, browseRiotPath } from './settingsUI.js';
import { openModal, closeModal, initModalListeners, showErrorModal } from './modals.js';
import { initSecurity, showLockScreen } from './securityUI.js';
import { initMainUI, checkStatus } from './mainUI.js';

const ipcRenderer = window.ipc;

async function init() {
  devLog("Renderer initializing...");
  
  try {
    // Load initial state
    state.accounts = await ipcRenderer.invoke("get-accounts");
    state.appConfig = await ipcRenderer.invoke("get-config");
    
    // Initialize components
    initModalListeners();
    initNavigation();
    initGlobalEvents();
    initSettings();
    initSecurity();
    initMainUI();
    initAccountModal();
    
    // Initial render
    refreshAccounts();

    // Check security
    const securityEnabled = await ipcRenderer.invoke("check-security-enabled");
    if (securityEnabled) {
      showLockScreen("verify");
    }

    // Auto-detect path if missing
    if (!state.appConfig.riotPath) {
      const detected = await ipcRenderer.invoke("auto-detect-paths");
      if (detected && detected.riotPath) {
        state.appConfig.riotPath = detected.riotPath;
        await ipcRenderer.invoke("save-config", state.appConfig);
        initSettings(); // Refresh settings UI
      }
    }

    devLog("Renderer initialized successfully.");
  } catch (err) {
    devError("Failed to initialize renderer:", err);
  }
}

function refreshAccounts() {
  renderAccounts(
    (type) => {
      const modalTitle = document.getElementById("modal-title");
      if (modalTitle) modalTitle.textContent = "Ajouter un Compte";
      document.getElementById("input-edit-id").value = "";
      document.getElementById("input-name").value = "";
      document.getElementById("input-username").value = "";
      document.getElementById("input-password").value = "";
      document.getElementById("input-riot-id").value = "";
      document.getElementById("input-card-image").value = "";
      openModal("add-account-modal");
    },
    handleSwitchAccount,
    handleSettingsAction
  );
  checkStatus();
}

function initNavigation() {
  const navDashboard = document.getElementById("nav-dashboard");
  const navSettings = document.getElementById("nav-settings");
  const viewDashboard = document.getElementById("view-dashboard");
  const viewSettings = document.getElementById("view-settings");
  const btnAddAccount = document.getElementById("btn-add-account");

  const switchView = (view) => {
    if (view === "dashboard") {
      navDashboard.classList.add("active");
      navSettings.classList.remove("active");
      viewDashboard.classList.add("active");
      viewSettings.classList.remove("active");
      viewDashboard.style.display = "block";
      viewSettings.style.display = "none";
      if (btnAddAccount) btnAddAccount.style.display = "flex";
    } else {
      navSettings.classList.add("active");
      navDashboard.classList.remove("active");
      viewSettings.classList.add("active");
      viewDashboard.classList.remove("active");
      viewSettings.style.display = "block";
      viewDashboard.style.display = "none";
      if (btnAddAccount) btnAddAccount.style.display = "none";
    }
  };

  navDashboard.onclick = () => switchView("dashboard");
  navSettings.onclick = () => switchView("settings");
}

function initGlobalEvents() {
  const btnAddAccount = document.getElementById("btn-add-account");
  if (btnAddAccount) {
    btnAddAccount.onclick = () => {
      const modalTitle = document.getElementById("modal-title");
      if (modalTitle) modalTitle.textContent = "Ajouter un Compte";
      document.getElementById("input-edit-id").value = "";
      document.getElementById("input-name").value = "";
      document.getElementById("input-username").value = "";
      document.getElementById("input-password").value = "";
      document.getElementById("input-riot-id").value = "";
      document.getElementById("input-card-image").value = "";
      openModal("add-account-modal");
    };
  }

  const btnBrowsePath = document.getElementById("btn-browse-path");
  if (btnBrowsePath) btnBrowsePath.onclick = browseRiotPath;
  
  const btnSaveAccount = document.getElementById("btn-save-account");
  if (btnSaveAccount) btnSaveAccount.onclick = handleSaveAccount;
  
  // Quick launch
  const launchVal = document.getElementById("launch-val");
  if (launchVal) launchVal.onclick = () => ipcRenderer.invoke("launch-game", "valorant");
  
  const launchLol = document.getElementById("launch-lol");
  if (launchLol) launchLol.onclick = () => ipcRenderer.invoke("launch-game", "league");

  // Refresh event from other modules
  window.addEventListener('accounts-updated', async () => {
    state.accounts = await ipcRenderer.invoke("get-accounts");
    refreshAccounts();
  });
}

async function handleSaveAccount() {
  const data = {
    name: document.getElementById("input-name").value.trim(),
    username: document.getElementById("input-username").value.trim(),
    password: document.getElementById("input-password").value.trim(),
    riotId: document.getElementById("input-riot-id").value.trim(),
    cardImage: document.getElementById("input-card-image").value.trim(),
    gameType: document.querySelector('input[name="game-type"]:checked').value,
  };
  
  if (!validateAccountData(data)) return;

  try {
    const id = document.getElementById("input-edit-id").value;
    if (id) {
      await ipcRenderer.invoke("update-account", { id, ...data });
    } else {
      await ipcRenderer.invoke("add-account", data);
    }
    
    state.accounts = await ipcRenderer.invoke("get-accounts");
    refreshAccounts();
    closeModal("add-account-modal");
    showNotification("Compte enregistré !", "success");
  } catch (err) {
    showErrorModal("Erreur lors de l'enregistrement: " + err.message);
  }
}

async function handleSwitchAccount(id, gameType) {
  const account = state.accounts.find(a => a.id === id);
  if (!account) return;

  state.pendingAccountId = id;
  state.pendingGameType = gameType;
  
  const title = document.getElementById("launch-game-title");
  if (title) title.textContent = account.name;
  
  openModal("launch-game-modal");
}

async function handleSettingsAction(id, action) {
  if (action === "delete") {
    const account = state.accounts.find(a => a.id === id);
    if (account) {
      state.pendingDeleteAccountId = id;
      const title = document.getElementById("delete-account-title");
      if (title) title.textContent = `Supprimer "${account.name}" ?`;
      openModal("delete-account-modal");
    }
  } else if (action === "edit") {
    try {
      const acc = await ipcRenderer.invoke("get-account-credentials", id);
      const modalTitle = document.getElementById("modal-title");
      if (modalTitle) modalTitle.textContent = "Modifier un Compte";
      
      document.getElementById("input-edit-id").value = acc.id;
      document.getElementById("input-name").value = acc.name;
      document.getElementById("input-username").value = acc.username;
      document.getElementById("input-password").value = acc.password;
      document.getElementById("input-riot-id").value = acc.riotId || "";
      document.getElementById("input-card-image").value = acc.cardImage || "";
      
      const radio = document.getElementById(acc.gameType === "league" ? "game-league" : "game-valorant");
      if (radio) radio.checked = true;
      
      openModal("add-account-modal");
    } catch (err) {
      showErrorModal("Erreur lors de la récupération des informations: " + err.message);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
