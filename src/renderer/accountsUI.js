import { state } from './state.js';
import { devLog, devError, setSafeHTML, escapeHtml, showNotification } from './ui.js';

const ipcRenderer = window.ipc;
const accountsList = document.getElementById("accounts-list");

export function renderAccounts(onOpenModal, onSwitchAccount, onSettingsAction) {
  devLog("renderAccounts started");
  try {
    while (accountsList.firstChild) accountsList.removeChild(accountsList.firstChild);

    if (state.accounts.length === 0) {
      renderEmptyState(onOpenModal);
      return;
    }

    state.accounts.forEach((acc) => {
      const card = createAccountCard(acc, onSwitchAccount, onSettingsAction);
      addDragHandlers(card, acc.id);
      accountsList.appendChild(card);
      
      // Load stats if missing
      if (acc.riotId && (!acc.stats || !acc.stats.rank)) {
        loadAccountStats(acc.id, () => renderAccounts(onOpenModal, onSwitchAccount, onSettingsAction));
      }
    });
  } catch (err) {
    devError("Error in renderAccounts:", err);
  }
}

async function loadAccountStats(accountId, callback) {
  try {
    const stats = await ipcRenderer.invoke("fetch-account-stats", accountId);
    const account = state.accounts.find((a) => a.id === accountId);
    if (account) {
      account.stats = stats;
      if (callback) callback();
    }
  } catch (err) {
    devError("Error loading account stats:", err);
  }
}

function renderEmptyState(onOpenModal) {
  const container = document.createElement("div");
  container.className = "empty-state-container";
  container.innerHTML = `
    <button class="btn-empty-state">
      <div class="empty-icon">+</div>
      <div class="empty-text">Ajouter un premier compte</div>
    </button>
  `;
  container.querySelector('button').onclick = () => onOpenModal("add");
  accountsList.appendChild(container);
}

function createAccountCard(acc, onSwitchAccount, onSettingsAction) {
  const card = document.createElement("div");
  card.className = "account-card";
  
  if (acc.cardImage) {
    const safePath = acc.cardImage.replace(/\\/g, "/").replace(/'/g, "\\'");
    card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('${safePath}')`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.classList.add("has-bg");
  }

  const content = document.createElement("div");
  content.className = "card-content";
  
  // Top Section
  const top = document.createElement("div");
  top.className = "card-top-section";
  top.innerHTML = `
    <div class="card-info">
      <div class="account-name">${escapeHtml(acc.name)}</div>
      ${acc.riotId ? `<div class="account-riot-id">${escapeHtml(acc.riotId)}</div>` : ''}
    </div>
    <div class="card-right-side">
      <div class="card-display-image">
        <img src="assets/${acc.gameType === "league" ? "league" : "valorant"}.png" alt="${acc.gameType}">
      </div>
    </div>
  `;
  content.appendChild(top);

  // Rank Section
  if (acc.stats && acc.stats.rank) {
    const rankWrapper = document.createElement("div");
    rankWrapper.className = "rank-wrapper";
    setSafeHTML(rankWrapper, getRankHTML(acc));
    content.appendChild(rankWrapper);
  } else if (acc.riotId) {
    const rankWrapper = document.createElement("div");
    rankWrapper.className = "rank-wrapper";
    rankWrapper.innerHTML = `<div class="rank-section"><div class="rank-loading">Chargement des stats...</div></div>`;
    content.appendChild(rankWrapper);
  }

  // Actions
  const actions = document.createElement("div");
  actions.className = "card-actions";
  
  const btnSwitch = document.createElement("button");
  btnSwitch.className = "btn-switch";
  btnSwitch.dataset.id = acc.id; // Added for checkStatus
  btnSwitch.textContent = "CONNECTER";
  btnSwitch.onclick = () => onSwitchAccount(acc.id, acc.gameType);
  
  const settingsWrapper = document.createElement("div");
  settingsWrapper.className = "settings-wrapper";
  settingsWrapper.innerHTML = `
    <button class="btn-settings" title="Paramètres du compte">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
    <div class="settings-menu" style="display: none;">
      <div class="menu-item" data-action="edit">Modifier</div>
      <div class="menu-item delete" data-action="delete">Supprimer</div>
    </div>
  `;
  
  const btnSettings = settingsWrapper.querySelector('.btn-settings');
  const menu = settingsWrapper.querySelector('.settings-menu');
  btnSettings.onclick = (e) => {
    e.stopPropagation();
    const isVisible = menu.style.display === 'block';
    document.querySelectorAll('.settings-menu').forEach(m => m.style.display = 'none');
    menu.style.display = isVisible ? 'none' : 'block';
  };
  
  menu.querySelectorAll('.menu-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = 'none';
      onSettingsAction(acc.id, item.dataset.action);
    };
  });

  actions.appendChild(btnSwitch);
  actions.appendChild(settingsWrapper);
  content.appendChild(actions);
  card.appendChild(content);
  return card;
}

function getRankHTML(acc) {
  const isUnranked = acc.stats.rank === "Unranked";
  return `
    <div class="rank-section">
      <div class="rank-current">
        <div class="rank-header">Rank Actuel</div>
        <div class="rank-display">
          <img src="${acc.stats.rankIcon}" alt="${escapeHtml(acc.stats.rank)}" class="rank-icon" onerror="this.style.display='none'">
          <span class="rank-name">${escapeHtml(acc.stats.rank)}</span>
        </div>
      </div>
      ${isUnranked && acc.stats.peakRank && acc.stats.peakRank !== "Unranked" ? `
        <div class="rank-peak">
          <div class="rank-header">Peak Rank</div>
          <div class="rank-display">
            <img src="${acc.stats.peakRankIcon}" alt="${escapeHtml(acc.stats.peakRank)}" class="rank-icon" onerror="this.style.display='none'">
            <span class="rank-name">${escapeHtml(acc.stats.peakRank)}</span>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

// Drag and Drop
let dragSrcEl = null;

function addDragHandlers(card, id) {
  card.setAttribute("draggable", "true");

  card.addEventListener("dragstart", (e) => {
    dragSrcEl = card;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    document.querySelectorAll(".account-card").forEach(c => c.classList.remove("drag-over"));
  });

  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return false;
  });

  card.addEventListener("dragenter", (e) => {
    const targetCard = e.target.closest(".account-card");
    if (targetCard && targetCard !== dragSrcEl) {
      targetCard.classList.add("drag-over");
    }
  });

  card.addEventListener("dragleave", (e) => {
    const targetCard = e.target.closest(".account-card");
    if (targetCard) targetCard.classList.remove("drag-over");
  });

  card.addEventListener("drop", handleDrop);
}

async function handleDrop(e) {
  e.stopPropagation();
  const targetCard = e.target.closest(".account-card");

  if (dragSrcEl !== targetCard) {
    const cards = [...accountsList.querySelectorAll(".account-card")];
    const srcIndex = cards.indexOf(dragSrcEl);
    const targetIndex = cards.indexOf(targetCard);

    if (srcIndex < targetIndex) {
      targetCard.after(dragSrcEl);
    } else {
      targetCard.before(dragSrcEl);
    }

    const reorderedIds = [...accountsList.querySelectorAll(".account-card")].map(c => {
      return c.querySelector(".btn-switch").dataset.id;
    });

    try {
      await ipcRenderer.invoke("reorder-accounts", reorderedIds);
      state.accounts = reorderedIds.map(id => state.accounts.find(a => a.id === id)).filter(Boolean);
    } catch (err) {
      devError("Failed to save reorder:", err);
    }
  }
  return false;
}

// Modal logic helpers
export function initAccountModal() {
  const btnBrowseImage = document.getElementById("btn-browse-image");
  const inputCardImage = document.getElementById("input-card-image");
  const passwordToggle = document.querySelector(".password-toggle");
  const inputPassword = document.getElementById("input-password");

  if (btnBrowseImage) {
    btnBrowseImage.onclick = async () => {
      const path = await ipcRenderer.invoke("select-image");
      if (path) inputCardImage.value = path;
    };
  }

  if (passwordToggle) {
    passwordToggle.onclick = () => {
      const isPassword = inputPassword.type === "password";
      inputPassword.type = isPassword ? "text" : "password";
      passwordToggle.innerHTML = isPassword ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    };
  }
}

export function validateAccountData(data) {
  if (!data.name || !data.username || !data.password) {
    showNotification("Nom, Username et Mot de passe sont requis.", "error");
    return false;
  }
  if (!data.riotId) {
    showNotification("Le Riot ID est obligatoire.", "error");
    return false;
  }
  const riotIdRegex = /^([^#]+)#([^#]+)$/;
  if (!riotIdRegex.test(data.riotId)) {
    showNotification("Format de Riot ID invalide. Format attendu: Username#TAG", "error");
    return false;
  }
  return true;
}
