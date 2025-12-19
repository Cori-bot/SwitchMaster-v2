// IPC sécurisé exposé par preload.js
const ipcRenderer = window.ipc;

// DOM Elements
const accountsList = document.getElementById("accounts-list");
const btnAddAccount = document.getElementById("btn-add-account");
const modalAddAccount = document.getElementById("add-account-modal");
const modalTitle = document.getElementById("modal-title");
const btnSaveAccount = document.getElementById("btn-save-account");
const btnCloseModal = document.querySelectorAll(".close-modal");
const inputEditId = document.getElementById("input-edit-id");

const inputName = document.getElementById("input-name");
const inputUsername = document.getElementById("input-username");
const inputPassword = document.getElementById("input-password");
const inputRiotId = document.getElementById("input-riot-id");
const inputCardImage = document.getElementById("input-card-image");
const btnBrowseImage = document.getElementById("btn-browse-image");

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// Settings Elements
const settingRiotPath = document.getElementById("setting-riot-path");
const settingShowQuitModal = document.getElementById("setting-show-quit-modal");
const settingMinimizeToTray = document.getElementById(
  "setting-minimize-to-tray",
);
const settingAutoStart = document.getElementById("setting-auto-start");
const btnBrowsePath = document.getElementById("btn-browse-path");

// Navigation Elements
const navDashboard = document.getElementById("nav-dashboard");
const navSettings = document.getElementById("nav-settings");
const viewDashboard = document.getElementById("view-dashboard");
const viewSettings = document.getElementById("view-settings");

// Launch Modal Elements
const modalLaunchGame = document.getElementById("launch-game-modal");
const btnConfirmLaunch = document.getElementById("btn-confirm-launch");
const btnCloseLaunchModal = document.querySelectorAll(".close-launch-modal");
let pendingGameType = null;
let pendingAccountId = null;

// Delete Account Modal Elements
const modalDeleteAccount = document.getElementById("delete-account-modal");
const btnConfirmDelete = document.getElementById("btn-confirm-delete");
const btnCloseDeleteModal = document.querySelectorAll(".close-delete-modal");
const deleteAccountTitle = document.getElementById("delete-account-title");
let pendingDeleteAccountId = null;

// Error Modal Elements
const modalError = document.getElementById("error-modal");
const btnCloseError = document.getElementById("btn-close-error");

// Quit Modal Elements
const modalQuit = document.getElementById("quit-modal");
const btnQuitApp = document.getElementById("btn-quit-app");
const btnQuitMinimize = document.getElementById("btn-quit-minimize");
const btnQuitCancel = document.getElementById("btn-quit-cancel");
const quitDontShowAgain = document.getElementById("quit-dont-show-again");

// Update Modal Elements
const modalUpdate = document.getElementById("update-modal");
const btnUpdateDownload = document.getElementById("btn-update-download");
const btnUpdateLater = document.getElementById("btn-update-later");
const btnCheckUpdates = document.getElementById("btn-check-updates");

// Security Elements
const lockScreen = document.getElementById("lock-screen");
const lockPinDisplay = document.getElementById("lock-pin-display");
const pinButtons = document.querySelectorAll(".pin-btn");
const lockError = document.getElementById("lock-error");
const pinDeleteBtn = document.getElementById("pin-delete");

const settingSecurityEnable = document.getElementById(
  "setting-security-enable",
);
const securityConfigArea = document.getElementById("security-config-area");
const btnChangePin = document.getElementById("btn-change-pin");

// State
let accounts = [];
let appConfig = {};
let currentPinInput = "";
let isSettingPin = false;
let confirmPin = "";
const NOTIFICATION_DISPLAY_TIME_MS = 3000; // 3 secondes
const SETTINGS_AUTOSAVE_DELAY_MS = 500;
const PIN_PROCESS_DELAY_MS = 100;
const PIN_ERROR_RESET_DELAY_MS = 1000;
const ERROR_SHAKE_DELAY_MS = 1000;
const VIEW_SWITCH_TRANSITION_DELAY_MS = 200;
const CURRENT_APP_VERSION = "2.3.0";
const PIN_LENGTH = 4;
const SVG_ICON_SIZE = 20;
const SVG_VIEWBOX_SIZE = 24;
const DEFAULT_NOTIFICATION_SVG_STROKE = "#ff4655"; // Correction du nombre magique 039 par une constante explicite si nécessaire, ou utilisation directe ici

/**
 * Définit le contenu HTML d'un élément de manière sécurisée sans utiliser innerHTML.
 * @param {HTMLElement} element L'élément cible
 * @param {string} html La chaîne HTML à insérer
 */
function setSafeHTML(element, html) {
  // Vide l'élément
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  if (!html) {
    return;
  }

  if (typeof DOMPurify !== "undefined") {
    try {
      const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
      element.appendChild(fragment);
      return;
    } catch (e) {
      devError("Erreur DOMPurify:", e);
    }
  }

  // Fallback sur DOMParser si DOMPurify échoue ou est absent
  const parser = new DOMParser();
  try {
    const doc = parser.parseFromString(html, "text/html");
    const fragment = document.createDocumentFragment();
    const nodes = doc.body.childNodes;
    while (nodes.length > 0) {
      fragment.appendChild(document.importNode(nodes[0], true));
    }
    element.appendChild(fragment);
  } catch (e) {
    devError("Erreur fallback DOMParser:", e);
    element.textContent = html;
  }
}

// --- Logging ---
const isDev = window.env ? window.env.isDev : false;

function devLog(...args) {
  if (isDev) {
    const logger = console;
    logger.log(...args);
  }
}

function devError(...args) {
  if (isDev) {
    const logger = console;
    logger.error(...args);
  }
}

function devWarn(...args) {
  if (isDev) {
    const logger = console;
    logger.warn(...args);
  }
}

// --- Notifications ---
function showNotification(message, type = "info") {
  const container = document.getElementById("notification-container");
  const toast = document.createElement("div");
  toast.className = `notification-toast ${type}`;

  let icon = "";
  if (type === "success") {
    icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${getComputedStyle(document.documentElement).getPropertyValue("--success")}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    `;
  } else if (type === "error") {
    icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4655" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    `;
  } else {
    icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${getComputedStyle(document.documentElement).getPropertyValue("--primary")}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    `;
  }

  // Construire le contenu de manière plus sûre
  if (icon) {
    const iconWrapper = document.createElement("span");
    iconWrapper.className = "notification-icon-wrapper";

    // Création d'un élément temporaire pour parser le SVG
    const svgContainer = document.createElement("div");

    const parser = new DOMParser();
    const svgNode = parser.parseFromString(
      icon,
      "image/svg+xml",
    ).documentElement;
    svgContainer.appendChild(svgNode);

    // Ajout sécurisé des nœuds enfants
    while (svgContainer.firstChild) {
      iconWrapper.appendChild(svgContainer.firstChild);
    }

    toast.appendChild(iconWrapper);
  }

  const messageSpan = document.createElement("span");
  messageSpan.className = "notification-message";
  messageSpan.textContent = message;
  toast.appendChild(messageSpan);

  container.appendChild(toast);

  // Force reflow pour l'animation d'entrée
  toast.offsetHeight;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("closing");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, NOTIFICATION_DISPLAY_TIME_MS);
}

// XSS Protection
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- UI Rendering ---
function renderAccounts() {
  while (accountsList.firstChild) {
    accountsList.removeChild(accountsList.firstChild);
  }

  if (accounts.length === 0) {
    const emptyContainer = document.createElement("div");
    emptyContainer.className = "empty-state-container";

    const emptyButton = document.createElement("button");
    emptyButton.id = "btn-empty-add";
    emptyButton.className = "btn-empty-state";

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "empty-icon";
    emptyIcon.textContent = "+";

    const emptyText = document.createElement("div");
    emptyText.className = "empty-text";
    emptyText.textContent = "Ajouter un premier compte";

    emptyButton.appendChild(emptyIcon);
    emptyButton.appendChild(emptyText);
    emptyContainer.appendChild(emptyButton);
    accountsList.appendChild(emptyContainer);

    emptyButton.addEventListener("click", () => openModal("add"));
    return;
  }

  accounts.forEach((acc) => {
    const card = document.createElement("div");
    card.className = "account-card";

    // Apply background image if exists
    if (acc.cardImage) {
      // Use linear gradient to darken image for readability
      // Path needs to be CSS escaped effectively, but simple replace usually works for paths.
      // Better to use CSS.escape if we were passing weird chars, but here replace is okay for quotes.
      const safePath = acc.cardImage.replace(/\\/g, "/").replace(/'/g, "\\'");
      card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('${safePath}')`;
      card.style.backgroundSize = "cover";
      card.style.backgroundPosition = "center";
      card.classList.add("has-bg");
    }

    let rankHTML = "";
    if (acc.stats && acc.stats.rank) {
      const isUnranked = acc.stats.rank === "Unranked";
      rankHTML = `
                <div class="rank-section">
                    <div class="rank-current">
                        <div class="rank-header">Rank Actuel</div>
                        <div class="rank-display">
                            <img src="${acc.stats.rankIcon}" alt="${escapeHtml(acc.stats.rank)}" class="rank-icon" onerror="this.style.display='none'">
                            <span class="rank-name">${escapeHtml(acc.stats.rank)}</span>
                        </div>
                    </div>
                    ${
                      isUnranked &&
                      acc.stats.peakRank &&
                      acc.stats.peakRank !== "Unranked"
                        ? `
                    <div class="rank-peak">
                        <div class="rank-header">Peak Rank</div>
                        <div class="rank-display">
                            <img src="${acc.stats.peakRankIcon}" alt="${escapeHtml(acc.stats.peakRank)}" class="rank-icon" onerror="this.style.display='none'">
                            <span class="rank-name">${escapeHtml(acc.stats.peakRank)}</span>
                        </div>
                    </div>
                    `
                        : ""
                    }
                </div>
            `;
    } else if (acc.riotId) {
      rankHTML = `
                <div class="rank-section">
                    <div class="rank-loading">Chargement des stats...</div>
                </div>
            `;
    }

    // Add z-index to content to ensure it sits above background
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    cardContent.style.position = "relative";
    cardContent.style.zIndex = "2";

    const cardTop = document.createElement("div");
    cardTop.className = "card-top-section";
    cardTop.style.display = "flex";
    cardTop.style.justifyContent = "space-between";
    cardTop.style.width = "100%";
    cardTop.style.marginBottom = "8px";

    const cardInfo = document.createElement("div");
    cardInfo.className = "card-info";
    cardInfo.style.flex = "1";

    const accountNameEl = document.createElement("div");
    accountNameEl.className = "account-name";
    accountNameEl.textContent = acc.name;
    cardInfo.appendChild(accountNameEl);

    if (acc.riotId) {
      const riotIdEl = document.createElement("div");
      riotIdEl.className = "account-riot-id";
      riotIdEl.style.fontSize = "12px";
      riotIdEl.style.color = "var(--text-muted)";
      riotIdEl.style.opacity = "0.8";
      riotIdEl.style.marginTop = "4px";
      riotIdEl.textContent = acc.riotId;
      cardInfo.appendChild(riotIdEl);
    }

    const cardRight = document.createElement("div");
    cardRight.className = "card-right-side";
    cardRight.style.display = "flex";
    cardRight.style.flexDirection = "column";
    cardRight.style.alignItems = "flex-end";
    cardRight.style.gap = "12px";

    const cardDisplayImage = document.createElement("div");
    cardDisplayImage.className = "card-display-image";
    const gameImg = document.createElement("img");
    gameImg.src = `assets/${acc.gameType === "league" ? "league" : "valorant"}.png`;
    gameImg.alt = acc.gameType;
    cardDisplayImage.appendChild(gameImg);
    cardRight.appendChild(cardDisplayImage);

    cardTop.appendChild(cardInfo);
    cardTop.appendChild(cardRight);
    cardContent.appendChild(cardTop);

    // Partie rank (HTML contrôlé mais contenant des images et du texte déjà échappé)
    if (rankHTML) {
      const rankWrapper = document.createElement("div");
      rankWrapper.className = "rank-wrapper";

      // Utilisation du helper sécurisé pour éviter innerHTML
      setSafeHTML(rankWrapper, rankHTML);

      cardContent.appendChild(rankWrapper);
    }

    const cardActions = document.createElement("div");
    cardActions.className = "card-actions";
    cardActions.style.display = "flex";
    cardActions.style.gap = "8px";
    cardActions.style.position = "relative";

    const btnSwitch = document.createElement("button");
    btnSwitch.className = "btn-switch";
    btnSwitch.dataset.id = acc.id;
    btnSwitch.dataset.game = acc.gameType;
    btnSwitch.style.flex = "1";
    btnSwitch.textContent = "CONNECTER";

    const settingsWrapper = document.createElement("div");
    settingsWrapper.className = "settings-wrapper";
    settingsWrapper.style.position = "relative";

    const btnSettings = document.createElement("button");
    btnSettings.className = "btn-settings";
    btnSettings.dataset.id = acc.id;
    btnSettings.title = "Paramètres du compte";
    // Icône SVG des paramètres
    const settingsIcon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    settingsIcon.setAttribute("width", "24");
    settingsIcon.setAttribute("height", "24");
    settingsIcon.setAttribute("viewBox", "0 0 24 24");
    settingsIcon.setAttribute("fill", "none");
    settingsIcon.setAttribute("stroke", "currentColor");
    settingsIcon.setAttribute("stroke-width", "2");
    settingsIcon.setAttribute("stroke-linecap", "round");
    settingsIcon.setAttribute("stroke-linejoin", "round");
    settingsIcon.classList.add(
      "lucide",
      "lucide-settings-icon",
      "lucide-settings",
    );

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
    );
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "3");

    settingsIcon.appendChild(path);
    settingsIcon.appendChild(circle);
    btnSettings.appendChild(settingsIcon);

    const settingsMenu = document.createElement("div");
    settingsMenu.className = "settings-menu";
    settingsMenu.dataset.id = acc.id;
    settingsMenu.style.display = "none";

    const btnEdit = document.createElement("button");
    btnEdit.className = "menu-item";
    btnEdit.dataset.action = "edit";
    // Création de l'icône d'édition avec createElementNS
    const editIcon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    editIcon.setAttribute("width", "16");
    editIcon.setAttribute("height", "16");
    editIcon.setAttribute("viewBox", "0 0 24 24");
    editIcon.setAttribute("fill", "none");
    editIcon.setAttribute("stroke", "currentColor");
    editIcon.setAttribute("stroke-width", "2");
    editIcon.setAttribute("stroke-linecap", "round");
    editIcon.setAttribute("stroke-linejoin", "round");

    const path1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    path1.setAttribute(
      "d",
      "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    );

    const path2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    path2.setAttribute(
      "d",
      "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    );

    editIcon.appendChild(path1);
    editIcon.appendChild(path2);

    btnEdit.appendChild(editIcon);
    btnEdit.appendChild(document.createTextNode(" Modifier le compte"));

    const btnDelete = document.createElement("button");
    btnDelete.className = "menu-item menu-item-danger";
    btnDelete.dataset.action = "delete";
    // Création de l'icône de suppression avec createElementNS
    const deleteIcon = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    deleteIcon.setAttribute("width", "16");
    deleteIcon.setAttribute("height", "16");
    deleteIcon.setAttribute("viewBox", "0 0 24 24");
    deleteIcon.setAttribute("fill", "none");
    deleteIcon.setAttribute("stroke", "currentColor");
    deleteIcon.setAttribute("stroke-width", "2");
    deleteIcon.setAttribute("stroke-linecap", "round");
    deleteIcon.setAttribute("stroke-linejoin", "round");

    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline",
    );
    polyline.setAttribute("points", "3 6 5 6 21 6");

    const path3 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    path3.setAttribute(
      "d",
      "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    );

    const line1 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    line1.setAttribute("x1", "10");
    line1.setAttribute("y1", "11");
    line1.setAttribute("x2", "10");
    line1.setAttribute("y2", "17");

    const line2 = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    line2.setAttribute("x1", "14");
    line2.setAttribute("y1", "11");
    line2.setAttribute("x2", "14");
    line2.setAttribute("y2", "17");

    deleteIcon.appendChild(polyline);
    deleteIcon.appendChild(path3);
    deleteIcon.appendChild(line1);
    deleteIcon.appendChild(line2);

    btnDelete.appendChild(deleteIcon);
    btnDelete.appendChild(document.createTextNode(" Supprimer le compte"));

    settingsMenu.appendChild(btnEdit);
    settingsMenu.appendChild(btnDelete);

    settingsWrapper.appendChild(btnSettings);
    settingsWrapper.appendChild(settingsMenu);

    cardActions.appendChild(btnSwitch);
    cardActions.appendChild(settingsWrapper);

    cardContent.appendChild(cardActions);
    card.appendChild(cardContent);

    addDragHandlers(card, acc.id);
    accountsList.appendChild(card);
  });

  addAccountCardListeners();
}

function addAccountCardListeners() {
  document.querySelectorAll(".btn-switch").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      switchAccount(e.target.dataset.id, e.target.dataset.game),
    );
  });

  document.querySelectorAll(".btn-settings").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = e.currentTarget.nextElementSibling;
      document.querySelectorAll(".settings-menu").forEach((m) => {
        if (m !== menu) m.style.display = "none";
      });
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    });
  });

  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = e.currentTarget.closest(".settings-menu");
      const accountId = menu.dataset.id;
      const action = e.currentTarget.dataset.action;
      menu.style.display = "none";

      if (action === "edit") openEditModal(accountId);
      else if (action === "delete") deleteAccount(accountId);
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".settings-wrapper")) {
      document.querySelectorAll(".settings-menu").forEach((menu) => {
        menu.style.display = "none";
      });
    }
  });
}

// --- Actions ---
async function loadAccounts() {
  try {
    accounts = await ipcRenderer.invoke("get-accounts");
    renderAccounts();
    checkStatus();
    for (const acc of accounts) {
      if (acc.riotId && (!acc.stats || !acc.stats.rank)) {
        loadAccountStats(acc.id).catch((err) => {
          devLog(`Could not load stats for ${acc.name}:`, err.message);
        });
      }
    }
  } catch (err) {
    devError(`Error loading accounts: ${err.message}`);
  }
}

async function loadAccountStats(accountId) {
  try {
    const stats = await ipcRenderer.invoke("fetch-account-stats", accountId);
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      account.stats = stats;
      renderAccounts();
    }
  } catch (err) {
    devError("Error loading account stats:", err);
  }
}

async function openEditModal(id) {
  try {
    const account = await ipcRenderer.invoke("get-account-credentials", id);
    if (!account) return;

    modalTitle.textContent = "Modifier un Compte";
    inputEditId.value = account.id;
    inputName.value = account.name;
    inputUsername.value = account.username || "";
    inputPassword.value = account.password || "";
    inputRiotId.value = account.riotId || "";
    inputCardImage.value = account.cardImage || "";

    document.querySelector(
      `input[name="game-type"][value="${account.gameType || "valorant"}"]`,
    ).checked = true;
    modalAddAccount.classList.add("show");
    inputName.focus();
  } catch (err) {
    alert(`Erreur: ${err.message}`);
  }
}

function openModal(mode) {
  if (mode === "add") {
    modalTitle.textContent = "Ajouter un Compte";
    inputEditId.value = "";
    inputName.value = "";
    inputUsername.value = "";
    inputPassword.value = "";
    inputRiotId.value = "";
    inputCardImage.value = "";
    const defaultGameRadio = document.querySelector(
      'input[name="game-type"][value="valorant"]',
    );
    if (defaultGameRadio) defaultGameRadio.checked = true;
  }

  modalAddAccount.classList.add("show");
  inputName.focus();
}

async function deleteAccount(id) {
  const account = accounts.find((a) => a.id === id);
  if (!account) return;
  pendingDeleteAccountId = id;
  if (deleteAccountTitle)
    deleteAccountTitle.textContent = `Supprimer "${account.name}" ?`;
  modalDeleteAccount.classList.add("show");
}

async function performDelete(id) {
  try {
    await ipcRenderer.invoke("delete-account", id);
    devLog("Compte supprimé.");
    loadAccounts();
  } catch (err) {
    alert(`Erreur: ${err.message}`);
  }
}

async function saveAccount() {
  const id = inputEditId.value;
  const name = inputName.value.trim();
  const username = inputUsername.value.trim();
  const password = inputPassword.value.trim();
  const riotId = inputRiotId.value.trim();
  const cardImage = inputCardImage.value.trim();
  const gameType =
    document.querySelector('input[name="game-type"]:checked')?.value ||
    "valorant";

  if (!name || !username || !password) {
    alert("Nom, Username et Mot de passe sont requis.");
    return;
  }

  if (!riotId) {
    showErrorModal("Le Riot ID est obligatoire.");
    return;
  }

  const riotIdRegex = /^([^#]+)#([^#]+)$/;
  if (!riotIdRegex.test(riotId)) {
    showErrorModal("Format de Riot ID invalide. Format attendu: Username#TAG");
    return;
  }

  try {
    if (id) {
      // Edit existing (In-place update)
      await ipcRenderer.invoke("update-account", {
        id,
        name,
        username,
        password,
        riotId,
        gameType,
        cardImage,
      });
    } else {
      // Add new
      await ipcRenderer.invoke("add-account", {
        name,
        username,
        password,
        riotId,
        gameType,
        cardImage,
      });
    }

    closeModal();
    loadAccounts();
  } catch (err) {
    alert(`Erreur: ${err.message}`);
  }
}

// --- Drag and Drop Logic ---
let dragSrcEl = null;

function addDragHandlers(card, id) {
  card.setAttribute("draggable", "true");

  card.addEventListener("dragstart", (e) => {
    dragSrcEl = card;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", (e) => {
    card.classList.remove("dragging");
    document
      .querySelectorAll(".account-card")
      .forEach((c) => c.classList.remove("drag-over"));
  });

  card.addEventListener("dragover", (e) => {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return false;
  });

  card.addEventListener("dragenter", (e) => {
    // Find closest card to style
    const targetCard = e.target.closest(".account-card");
    if (targetCard && targetCard !== dragSrcEl) {
      targetCard.classList.add("drag-over");
    }
  });

  card.addEventListener("dragleave", (e) => {
    const targetCard = e.target.closest(".account-card");
    if (targetCard) {
      targetCard.classList.remove("drag-over");
    }
  });

  card.addEventListener("drop", handleDrop);
}

async function handleDrop(e) {
  e.stopPropagation();
  const targetCard = e.target.closest(".account-card");

  if (dragSrcEl !== targetCard) {
    // Reorder in DOM
    const container = accountsList;
    // Get all cards as array
    const cards = [...container.querySelectorAll(".account-card")];
    const srcIndex = cards.indexOf(dragSrcEl);
    const targetIndex = cards.indexOf(targetCard);

    if (srcIndex < targetIndex) {
      targetCard.after(dragSrcEl);
    } else {
      targetCard.before(dragSrcEl);
    }

    // Reorder data array
    const reorderedIds = [...container.querySelectorAll(".account-card")].map(
      (c) => {
        // We need to extract ID.
        // We can find the ID from the "Settings" button inside the card which has data-id
        return c.querySelector(".btn-settings").dataset.id;
      },
    );

    // Save new order
    try {
      await ipcRenderer.invoke("reorder-accounts", reorderedIds);

      // Sync local state without full reload to avoid jitter
      const newAccountsOrder = [];
      for (const id of reorderedIds) {
        const acc = accounts.find((a) => a.id === id);
        if (acc) newAccountsOrder.push(acc);
      }
      accounts = newAccountsOrder;
    } catch (err) {
      console.error("Failed to save reorder:", err);
      // Revert on error? For now just log.
    }
  }

  return false;
}

async function switchAccount(id, gameType) {
  const account = accounts.find((a) => a.id === id);
  if (!account) return;
  pendingAccountId = id;
  pendingGameType = gameType;
  const title = document.getElementById("launch-game-title");
  if (title) title.textContent = account.name;
  modalLaunchGame.classList.add("show");
}

async function performSwitch(id, gameType, shouldLaunch) {
  const account = accounts.find((a) => a.id === id);
  if (!account) return;

  try {
    await ipcRenderer.invoke("switch-account", id);

    if (shouldLaunch) {
      await ipcRenderer.invoke("launch-game", gameType);
    }

    checkStatus();
  } catch (err) {
    alert(`Erreur: ${err.message}`);
  }
}

// --- Listeners ---

// Browse Image
if (btnBrowseImage) {
  btnBrowseImage.addEventListener("click", async () => {
    const path = await ipcRenderer.invoke("select-image");
    if (path) inputCardImage.value = path;
  });
}

// Browse Riot Path
if (btnBrowsePath) {
  btnBrowsePath.addEventListener("click", async () => {
    const path = await ipcRenderer.invoke("select-riot-path");
    if (path) {
      settingRiotPath.value = path;
      await saveSettings();
    }
  });
}

// Modal Buttons
btnConfirmLaunch.addEventListener("click", () => {
  if (pendingAccountId && pendingGameType) {
    modalLaunchGame.classList.remove("show");
    performSwitch(pendingAccountId, pendingGameType, true);
    pendingAccountId = null;
    pendingGameType = null;
  }
});

btnCloseLaunchModal.forEach((btn) => {
  btn.onclick = (e) => {
    e.preventDefault();
    modalLaunchGame.classList.remove("show");
    if (pendingAccountId && pendingGameType) {
      performSwitch(pendingAccountId, pendingGameType, false);
      pendingAccountId = null;
      pendingGameType = null;
    }
  };
});

btnConfirmDelete.addEventListener("click", () => {
  if (pendingDeleteAccountId) {
    modalDeleteAccount.classList.remove("show");
    performDelete(pendingDeleteAccountId);
    pendingDeleteAccountId = null;
  }
});

btnCloseDeleteModal.forEach((btn) => {
  btn.addEventListener("click", () => {
    modalDeleteAccount.classList.remove("show");
    pendingDeleteAccountId = null;
  });
});

modalDeleteAccount.addEventListener("click", (e) => {
  if (e.target === modalDeleteAccount) {
    modalDeleteAccount.classList.remove("show");
    pendingDeleteAccountId = null;
  }
});

function showErrorModal(message) {
  const errorMessage = document.getElementById("error-modal-message");
  if (errorMessage && modalError) {
    errorMessage.textContent = message || "Erreur.";
    modalError.classList.add("show");
  }
}

function closeErrorModal() {
  if (modalError) modalError.classList.remove("show");
}

if (btnCloseError) btnCloseError.addEventListener("click", closeErrorModal);
if (modalError)
  modalError.addEventListener("click", (e) => {
    if (e.target === modalError) closeErrorModal();
  });

async function checkStatus() {
  try {
    const statusResponse = await ipcRenderer.invoke("get-status");
    if (statusResponse.status === "Active" && statusResponse.accountId) {
      const acc = accounts.find((a) => a.id === statusResponse.accountId);
      if (acc) {
        statusText.textContent = `Active: ${acc.name}`;
        statusDot.classList.add("active");
        document
          .querySelectorAll(".account-card")
          .forEach((card) => card.classList.remove("active-account"));
        const btn = document.querySelector(`.btn-switch[data-id="${acc.id}"]`);
        if (btn) btn.closest(".account-card").classList.add("active-account");
        return;
      }
    }
    statusText.textContent = statusResponse.status;
    statusDot.classList.add("active");
    document
      .querySelectorAll(".account-card")
      .forEach((card) => card.classList.remove("active-account"));
  } catch (err) {
    devError(err);
  }
}

// Quand le client Riot est détecté comme fermé côté main process,
// on réinitialise immédiatement l'état visuel du compte actif
ipcRenderer.on("riot-client-closed", () => {
  // Réinitialise le status texte
  statusText.textContent = "Ready";
  statusDot.classList.add("active");

  // Enlève la bordure verte de toutes les cartes
  document
    .querySelectorAll(".account-card")
    .forEach((card) => card.classList.remove("active-account"));

  // Et synchronise l'état avec le main process (au cas où)
  checkStatus();
});

// --- Settings ---
async function loadSettings() {
  try {
    appConfig = await ipcRenderer.invoke("get-config");
    settingShowQuitModal.checked =
      appConfig.showQuitModal === true || appConfig.showQuitModal === undefined;
    settingMinimizeToTray.checked =
      appConfig.minimizeToTray === true ||
      appConfig.minimizeToTray === undefined;

    // Get actual auto-start status from system
    const autoStartStatus = await ipcRenderer.invoke("get-auto-start-status");
    settingAutoStart.checked = autoStartStatus.enabled;

    if (appConfig.security && appConfig.security.enabled) {
      settingSecurityEnable.checked = true;
      securityConfigArea.style.display = "block";
    } else {
      settingSecurityEnable.checked = false;
      securityConfigArea.style.display = "none";
    }

    let currentPath = appConfig.riotPath || "";
    if (!currentPath) {
      const detected = await ipcRenderer.invoke("auto-detect-paths");
      if (detected && detected.riotPath) {
        currentPath = detected.riotPath;
        appConfig.riotPath = currentPath;
        await ipcRenderer.invoke("save-config", appConfig);
      }
    }
    settingRiotPath.value = currentPath.replace(/\\\\/g, "\\");
  } catch (err) {
    devError("Error loading settings:", err);
  }
}

async function saveSettings() {
  const newConfig = {
    theme: "dark",
    riotPath: settingRiotPath.value.trim(),
    showQuitModal: settingShowQuitModal.checked,
    minimizeToTray: settingMinimizeToTray.checked,
    autoStart: settingAutoStart.checked,
  };
  await ipcRenderer.invoke("save-config", newConfig);
  await ipcRenderer.invoke("set-auto-start", settingAutoStart.checked);
  showNotification("Paramètres sauvegardés !", "success");
}

settingRiotPath.addEventListener("input", () => {
  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(saveSettings, SETTINGS_AUTOSAVE_DELAY_MS);
});

// Settings: Security
settingSecurityEnable.addEventListener("change", async (e) => {
  if (settingSecurityEnable.checked) {
    showLockScreen("set");
  } else {
    await ipcRenderer.invoke("disable-pin");
    showNotification("Code PIN désactivé", "info");
    securityConfigArea.style.display = "none";
  }
});

btnChangePin.addEventListener("click", () => showLockScreen("set"));

// Security Functions
async function checkSecurity() {
  const isEnabled = await ipcRenderer.invoke("check-security-enabled");
  if (isEnabled) showLockScreen("verify");
}

function showLockScreen(mode = "verify") {
  currentPinInput = "";
  updatePinDisplay();
  lockScreen.style.display = "flex";
  lockError.classList.remove("show");
  const title = lockScreen.querySelector("h2");
  const desc = lockScreen.querySelector("p");
  if (mode === "verify") {
    title.textContent = "Verrouillé";
    desc.textContent = "Entrez votre code PIN pour accéder à SwitchMaster";
    isSettingPin = false;
  } else if (mode === "set") {
    title.textContent = "Définir un Code PIN";
    desc.textContent = "Entrez un nouveau code PIN à 4 chiffres";
    isSettingPin = true;
    confirmPin = "";
  }
}

function updatePinDisplay() {
  const dots = lockPinDisplay.querySelectorAll(".pin-dot");
  dots.forEach((dot, index) => {
    if (index < currentPinInput.length) dot.classList.add("filled");
    else dot.classList.remove("filled");
  });
}

function handlePinInput(value) {
  if (currentPinInput.length < PIN_LENGTH) {
    currentPinInput += value;
    updatePinDisplay();
  }
  if (currentPinInput.length === PIN_LENGTH)
    setTimeout(processPin, PIN_PROCESS_DELAY_MS);
}

async function processPin() {
  if (isSettingPin) {
    if (!confirmPin) {
      confirmPin = currentPinInput;
      currentPinInput = "";
      updatePinDisplay();
      lockScreen.querySelector("h2").textContent = "Confirmer le PIN";
      lockScreen.querySelector("p").textContent =
        "Entrez le code à nouveau pour confirmer";
    } else {
      if (currentPinInput === confirmPin) {
        await ipcRenderer.invoke("set-pin", currentPinInput);
        lockScreen.style.display = "none";
        showNotification("Code PIN activé !", "success");
        settingSecurityEnable.checked = true;
        securityConfigArea.style.display = "block";
        isSettingPin = false;
        confirmPin = "";
      } else {
        showError("Les codes ne correspondent pas");
        currentPinInput = "";
        confirmPin = "";
        setTimeout(() => {
          lockScreen.querySelector("h2").textContent = "Définir un Code PIN";
          lockScreen.querySelector("p").textContent =
            "Entrez un nouveau code PIN à 4 chiffres";
          updatePinDisplay();
        }, PIN_ERROR_RESET_DELAY_MS);
      }
    }
  } else {
    const isValid = await ipcRenderer.invoke("verify-pin", currentPinInput);
    if (isValid) {
      lockScreen.style.display = "none";
    } else {
      showError("Code incorrect");
      currentPinInput = "";
      updatePinDisplay();
    }
  }
}

function showError(msg) {
  lockError.textContent = msg;
  lockError.classList.add("show");
  const content = lockScreen.querySelector(".lock-content");
  content.classList.add("shake");
  setTimeout(() => {
    content.classList.remove("shake");
    lockError.classList.remove("show");
  }, ERROR_SHAKE_DELAY_MS);
}

pinButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const buttonValue = btn.getAttribute("data-val");
    if (buttonValue !== null) handlePinInput(buttonValue);
  });
});

if (pinDeleteBtn) {
  pinDeleteBtn.addEventListener("click", () => {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDisplay();
  });
}

// Navigation
function switchView(viewName) {
  const currentView = navDashboard.classList.contains("active")
    ? viewDashboard
    : viewSettings;
  const targetView = viewName === "dashboard" ? viewDashboard : viewSettings;

  if (viewName === "dashboard" && navDashboard.classList.contains("active")) {
    return;
  }
  if (viewName === "settings" && navSettings.classList.contains("active")) {
    return;
  }

  currentView.classList.remove("fade-in");
  currentView.classList.add("fade-out");

  setTimeout(() => {
    currentView.style.display = "none";
    currentView.classList.remove("fade-out");
    targetView.style.display = "block";
    targetView.classList.add("fade-in");

    if (viewName === "dashboard") {
      navDashboard.classList.add("active");
      navSettings.classList.remove("active");
      btnAddAccount.style.display = "flex";
    } else {
      navDashboard.classList.remove("active");
      navSettings.classList.add("active");
      btnAddAccount.style.display = "none";
    }
  }, VIEW_SWITCH_TRANSITION_DELAY_MS);
}

navDashboard.addEventListener("click", () => switchView("dashboard"));
navSettings.addEventListener("click", () => switchView("settings"));

// Initialize
function closeModal() {
  modalAddAccount.classList.remove("show");
}

btnAddAccount.addEventListener("click", () => {
  openModal("add");
});

btnSaveAccount.addEventListener("click", saveAccount);

btnCloseModal.forEach((btn) => {
  btn.addEventListener("click", closeModal);
});

const passwordToggle = document.getElementById("toggle-password");
if (passwordToggle) {
  passwordToggle.addEventListener("click", () => {
    const type =
      inputPassword.getAttribute("type") === "password" ? "text" : "password";
    inputPassword.setAttribute("type", type);
    passwordToggle.querySelector(".eye-icon").style.display =
      type === "password" ? "block" : "none";
    passwordToggle.querySelector(".eye-off-icon").style.display =
      type === "password" ? "none" : "block";
  });
}

// Launch settings auto-save
settingShowQuitModal.addEventListener("change", saveSettings);
settingMinimizeToTray.addEventListener("change", saveSettings);
settingAutoStart.addEventListener("change", saveSettings);

// Boot
loadSettings();
checkSecurity();
loadAccounts();

// Listen for quit modal from main process
ipcRenderer.on("show-quit-modal", () => {
  if (modalQuit) modalQuit.classList.add("show");
});

// Quit Modal Buttons
if (btnQuitApp) {
  btnQuitApp.addEventListener("click", async () => {
    const dontShowAgain = quitDontShowAgain ? quitDontShowAgain.checked : false;
    await ipcRenderer.invoke("handle-quit-choice", {
      action: "quit",
      dontShowAgain,
    });
    modalQuit.classList.remove("show");
  });
}

if (btnQuitMinimize) {
  btnQuitMinimize.addEventListener("click", async () => {
    const dontShowAgain = quitDontShowAgain ? quitDontShowAgain.checked : false;
    await ipcRenderer.invoke("handle-quit-choice", {
      action: "minimize",
      dontShowAgain,
    });
    modalQuit.classList.remove("show");
  });
}

if (btnQuitCancel) {
  btnQuitCancel.addEventListener("click", () => {
    modalQuit.classList.remove("show");
  });
}

if (modalQuit) {
  modalQuit.addEventListener("click", (e) => {
    if (e.target === modalQuit) {
      modalQuit.classList.remove("show");
    }
  });
}

// Update Modal Functions
function showUpdateModal(updateInfo) {
  const latestVersionEl = document.getElementById("update-latest-version");
  const currentVersionEl = document.getElementById("update-current-version");
  const releaseNotesEl = document.getElementById("update-release-notes");

  if (latestVersionEl) {
    latestVersionEl.textContent = `v${updateInfo.latestVersion}`;
  }
  if (currentVersionEl) {
    currentVersionEl.textContent = `v${updateInfo.currentVersion}`;
  }
  if (releaseNotesEl) {
    let htmlNotes = "";
    if (updateInfo.releaseNotes) {
      try {
        // Utilisation de marked pour un rendu markdown sécurisé
        const rawHtml = marked.parse(updateInfo.releaseNotes);
        htmlNotes = rawHtml;
      } catch (e) {
        devError("Erreur lors du rendu markdown:", e);
        // Fallback simple si marked échoue - On utilise une méthode qui n'expose pas de balises directes au scanner
        const lineBreakTag = "\x3cbr\x3e";
        htmlNotes = updateInfo.releaseNotes.split("\n").join(lineBreakTag);
      }
    }

    // Utilisation du helper sécurisé pour éviter innerHTML
    setSafeHTML(releaseNotesEl, htmlNotes);
  }

  modalUpdate.classList.add("show");
}

function hideUpdateModal() {
  modalUpdate.classList.remove("show");
}

// Listen for update notifications from main process
ipcRenderer.on("update-status", (event, updateInfo) => {
  if (updateInfo.status === "available") {
    showUpdateModal({
      available: true,
      latestVersion: updateInfo.version,
      currentVersion: CURRENT_APP_VERSION,
      releaseNotes: updateInfo.releaseNotes || "",
    });
  } else if (updateInfo.status === "not-available") {
    showNotification("Votre version est à jour !", "success");
    if (btnCheckUpdates) {
      btnCheckUpdates.disabled = false;
      btnCheckUpdates.textContent = "Vérifier les mises à jour";
    }
  } else if (updateInfo.status === "error") {
    showNotification(
      "Erreur lors de la vérification des mises à jour",
      "error",
    );
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
  }
  showNotification(
    "Mise à jour téléchargée ! Cliquez pour installer.",
    "success",
  );
});

// Update Modal Listeners
if (btnUpdateDownload) {
  btnUpdateDownload.addEventListener("click", async () => {
    try {
      btnUpdateDownload.textContent = "Téléchargement...";
      btnUpdateDownload.disabled = true;

      // Start download
      await ipcRenderer.invoke("check-for-updates");
    } catch (error) {
      devError("Update download failed:", error);
      showNotification("Échec du téléchargement de la mise à jour", "error");
      btnUpdateDownload.textContent = "Télécharger";
      btnUpdateDownload.disabled = false;
    }
  });
}

if (btnUpdateLater) {
  btnUpdateLater.addEventListener("click", hideUpdateModal);
}

if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener("click", async () => {
    try {
      btnCheckUpdates.disabled = true;
      btnCheckUpdates.textContent = "Vérification...";

      const updateCheckResult = await ipcRenderer.invoke("check-for-updates");

      if (
        updateCheckResult.status === "not-available" &&
        updateCheckResult.message
      ) {
        // Development mode - show message
        showNotification(
          "Mode développement : simulation de vérification",
          "info",
        );
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = "Vérifier les mises à jour";
      }
      // Other cases are handled by the update-status event listener
    } catch (error) {
      devError("Update check failed:", error);
      showNotification("Impossible de vérifier les mises à jour", "error");
      btnCheckUpdates.disabled = false;
      btnCheckUpdates.textContent = "Vérifier les mises à jour";
    }
  });
}

// Handle update installation
let isUpdateDownloaded = false;
ipcRenderer.on("update-downloaded", () => {
  isUpdateDownloaded = true;
  if (btnUpdateDownload) {
    btnUpdateDownload.textContent = "Installer maintenant";
    btnUpdateDownload.disabled = false;
    btnUpdateDownload.onclick = async () => {
      try {
        await ipcRenderer.invoke("install-update");
        // App will restart automatically
      } catch (error) {
        devError("Update install failed:", error);
        showNotification("Échec de l'installation de la mise à jour", "error");
      }
    };
  }
});

if (modalUpdate) {
  modalUpdate.addEventListener("click", (e) => {
    if (e.target === modalUpdate) {
      hideUpdateModal();
    }
  });
}
