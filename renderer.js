const { ipcRenderer } = require('electron');

// DOM Elements
const accountsList = document.getElementById('accounts-list');
const btnAddAccount = document.getElementById('btn-add-account');
const modalAddAccount = document.getElementById('add-account-modal');
const modalTitle = document.getElementById('modal-title');
const btnSaveAccount = document.getElementById('btn-save-account');
const btnCloseModal = document.querySelectorAll('.close-modal');
const inputEditId = document.getElementById('input-edit-id');

const inputName = document.getElementById('input-name');
const inputUsername = document.getElementById('input-username');
const inputPassword = document.getElementById('input-password');
const inputRiotId = document.getElementById('input-riot-id');
const inputCardImage = document.getElementById('input-card-image');
const btnBrowseImage = document.getElementById('btn-browse-image');

const logsContainer = document.getElementById('logs-container');
const logsPanel = document.querySelector('.logs-panel');
const btnClearLogs = document.getElementById('clear-logs');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const btnLaunchVal = document.getElementById('launch-val');
const btnLaunchLoL = document.getElementById('launch-lol');

// Settings Elements
const settingLogs = document.getElementById('setting-logs');
const settingRiotPath = document.getElementById('setting-riot-path');
const settingShowQuitModal = document.getElementById('setting-show-quit-modal');
const settingMinimizeToTray = document.getElementById('setting-minimize-to-tray');
const settingAutoStart = document.getElementById('setting-auto-start');

// Navigation Elements
const navDashboard = document.getElementById('nav-dashboard');
const navSettings = document.getElementById('nav-settings');
const viewDashboard = document.getElementById('view-dashboard');
const viewSettings = document.getElementById('view-settings');

// Launch Modal Elements
const modalLaunchGame = document.getElementById('launch-game-modal');
const btnConfirmLaunch = document.getElementById('btn-confirm-launch');
const btnCloseLaunchModal = document.querySelectorAll('.close-launch-modal');
let pendingGameType = null;
let pendingAccountId = null;

// Delete Account Modal Elements
const modalDeleteAccount = document.getElementById('delete-account-modal');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCloseDeleteModal = document.querySelectorAll('.close-delete-modal');
const deleteAccountTitle = document.getElementById('delete-account-title');
let pendingDeleteAccountId = null;

// Error Modal Elements
const modalError = document.getElementById('error-modal');
const btnCloseError = document.getElementById('btn-close-error');

// Quit Modal Elements
const modalQuit = document.getElementById('quit-modal');
const btnQuitApp = document.getElementById('btn-quit-app');
const btnQuitMinimize = document.getElementById('btn-quit-minimize');
const btnQuitCancel = document.getElementById('btn-quit-cancel');
const quitDontShowAgain = document.getElementById('quit-dont-show-again');

// Security Elements
const lockScreen = document.getElementById('lock-screen');
const lockPinDisplay = document.getElementById('lock-pin-display');
const pinButtons = document.querySelectorAll('.pin-btn');
const lockError = document.getElementById('lock-error');
const pinDeleteBtn = document.getElementById('pin-delete');

const settingSecurityEnable = document.getElementById('setting-security-enable');
const securityConfigArea = document.getElementById('security-config-area');
const btnChangePin = document.getElementById('btn-change-pin');

// State
let accounts = [];
let appConfig = {};
let currentPinInput = "";
let isSettingPin = false;
let confirmPin = "";

// --- Logging ---
function log(message) {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = `[${time}] ${message}`;
    logsContainer.appendChild(div);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// --- Notifications ---
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;

    let icon = '';
    if (type === 'success') icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${getComputedStyle(document.documentElement).getPropertyValue('--success')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    `;
    else if (type === 'error') icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4655" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    `;
    else icon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${getComputedStyle(document.documentElement).getPropertyValue('--primary')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    `;

    toast.innerHTML = `
        ${icon}
        <span class="notification-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('closing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// XSS Protection
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- UI Rendering ---
function renderAccounts() {
    accountsList.innerHTML = '';

    if (accounts.length === 0) {
        accountsList.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">Aucun compte sauvegardé. Ajoutez un compte pour commencer.</div>';
        return;
    }

    accounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'account-card';

        // Apply background image if exists
        if (acc.cardImage) {
            // Use linear gradient to darken image for readability
            // Path needs to be CSS escaped effectively, but simple replace usually works for paths. 
            // Better to use CSS.escape if we were passing weird chars, but here replace is okay for quotes.
            const safePath = acc.cardImage.replace(/\\/g, '/').replace(/'/g, "\\'");
            card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url('${safePath}')`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            card.classList.add('has-bg');
        }

        const gameTypeLabel = acc.gameType === 'league' ? 'League of Legends' : 'Valorant';

        let rankHTML = '';
        if (acc.stats && acc.stats.rank) {
            const isUnranked = acc.stats.rank === 'Unranked';
            rankHTML = `
                <div class="rank-section">
                    <div class="rank-current">
                        <div class="rank-header">Rank Actuel</div>
                        <div class="rank-display">
                            <img src="${acc.stats.rankIcon}" alt="${escapeHtml(acc.stats.rank)}" class="rank-icon" onerror="this.style.display='none'">
                            <span class="rank-name">${escapeHtml(acc.stats.rank)}</span>
                        </div>
                    </div>
                    ${isUnranked && acc.stats.peakRank && acc.stats.peakRank !== 'Unranked' ? `
                    <div class="rank-peak">
                        <div class="rank-header">Peak Rank</div>
                        <div class="rank-display">
                            <img src="${acc.stats.peakRankIcon}" alt="${escapeHtml(acc.stats.peakRank)}" class="rank-icon" onerror="this.style.display='none'">
                            <span class="rank-name">${escapeHtml(acc.stats.peakRank)}</span>
                        </div>
                    </div>
                    ` : ''}
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
        card.innerHTML = `
            <div class="card-content" style="position: relative; z-index: 2;">
                <div class="card-top-section" style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px;">
                    <div class="card-info" style="flex: 1;">
                        <div class="account-name">${escapeHtml(acc.name)}</div>
                        ${acc.riotId ? `<div class="account-riot-id" style="font-size: 12px; color: var(--text-muted); opacity: 0.8; margin-top: 4px;">${escapeHtml(acc.riotId)}</div>` : ''}
                    </div>
                    <div class="card-right-side" style="display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                        <div class="card-display-image">
                            <img src="assets/${acc.gameType === 'league' ? 'league' : 'valorant'}.png" alt="${escapeHtml(acc.gameType)}">
                        </div>
                    </div>
                </div>

                ${rankHTML}

                <div class="card-actions" style="display: flex; gap: 8px; position: relative;">
                    <button class="btn-switch" data-id="${acc.id}" data-game="${acc.gameType}" style="flex: 1;">CONNECTER</button>
                    <div class="settings-wrapper" style="position: relative;">
                        <button class="btn-settings" data-id="${acc.id}" title="Paramètres du compte">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <div class="settings-menu" data-id="${acc.id}" style="display: none;">
                            <button class="menu-item" data-action="edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Modifier le compte
                            </button>
                            <button class="menu-item menu-item-danger" data-action="delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Supprimer le compte
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        addDragHandlers(card, acc.id);
        accountsList.appendChild(card);
    });

    addAccountCardListeners();
}

function addAccountCardListeners() {
    document.querySelectorAll('.btn-switch').forEach(btn => {
        btn.addEventListener('click', (e) => switchAccount(e.target.dataset.id, e.target.dataset.game));
    });

    document.querySelectorAll('.btn-settings').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = e.currentTarget.nextElementSibling;
            document.querySelectorAll('.settings-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = e.currentTarget.closest('.settings-menu');
            const accountId = menu.dataset.id;
            const action = e.currentTarget.dataset.action;
            menu.style.display = 'none';

            if (action === 'edit') openEditModal(accountId);
            else if (action === 'delete') deleteAccount(accountId);
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.settings-wrapper')) {
            document.querySelectorAll('.settings-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
}

// --- Actions ---
async function loadAccounts() {
    try {
        accounts = await ipcRenderer.invoke('get-accounts');
        renderAccounts();
        log('Accounts loaded.');
        checkStatus();
        for (const acc of accounts) {
            if (acc.riotId && (!acc.stats || !acc.stats.rank)) {
                loadAccountStats(acc.id).catch(err => {
                    console.log(`Could not load stats for ${acc.name}:`, err.message);
                });
            }
        }
    } catch (err) {
        log(`Error loading accounts: ${err.message}`);
    }
}

async function loadAccountStats(accountId) {
    try {
        const stats = await ipcRenderer.invoke('fetch-account-stats', accountId);
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            account.stats = stats;
            renderAccounts();
        }
    } catch (err) {
        console.error('Error loading account stats:', err);
    }
}

async function openEditModal(id) {
    try {
        const account = await ipcRenderer.invoke('get-account-credentials', id);
        if (!account) return;

        modalTitle.textContent = "Modifier un Compte";
        inputEditId.value = account.id;
        inputName.value = account.name;
        inputUsername.value = account.username || '';
        inputPassword.value = account.password || '';
        inputRiotId.value = account.riotId || '';
        inputCardImage.value = account.cardImage || '';

        document.querySelector(`input[name="game-type"][value="${account.gameType || 'valorant'}"]`).checked = true;
        modalAddAccount.classList.add('show');
        inputName.focus();
    } catch (err) {
        alert(`Erreur: ${err.message}`);
    }
}

async function deleteAccount(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    pendingDeleteAccountId = id;
    if (deleteAccountTitle) deleteAccountTitle.textContent = `Supprimer "${account.name}" ?`;
    modalDeleteAccount.classList.add('show');
}

async function performDelete(id) {
    try {
        await ipcRenderer.invoke('delete-account', id);
        log('Compte supprimé.');
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
    const gameType = document.querySelector('input[name="game-type"]:checked')?.value || 'valorant';

    if (!name || !username || !password) {
        alert('Nom, Username et Mot de passe sont requis.');
        return;
    }

    if (!riotId) {
        showErrorModal('Le Riot ID est obligatoire.');
        return;
    }

    if (!riotId.includes('#')) {
        showErrorModal('Format de Riot ID invalide. Format attendu: Username#TAG');
        return;
    }

    try {
        if (id) {
            // Edit existing (In-place update)
            log(`Modification du compte "${name}"...`);
            await ipcRenderer.invoke('update-account', {
                id,
                name,
                username,
                password,
                riotId,
                gameType,
                cardImage
            });
        } else {
            // Add new
            log('Ajout du compte...');
            await ipcRenderer.invoke('add-account', {
                name,
                username,
                password,
                riotId,
                gameType,
                cardImage
            });
        }

        log(id ? `✓ Compte modifié.` : `✓ Compte ajouté.`);
        closeModal();
        loadAccounts();
    } catch (err) {
        alert(`Erreur: ${err.message}`);
    }
}

// --- Drag and Drop Logic ---
let dragSrcEl = null;

function addDragHandlers(card, id) {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', (e) => {
        dragSrcEl = card;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        card.classList.add('dragging');
    });

    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        document.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    });

    card.addEventListener('dragenter', (e) => {
        // Find closest card to style
        const targetCard = e.target.closest('.account-card');
        if (targetCard && targetCard !== dragSrcEl) {
            targetCard.classList.add('drag-over');
        }
    });

    card.addEventListener('dragleave', (e) => {
        const targetCard = e.target.closest('.account-card');
        if (targetCard) {
            targetCard.classList.remove('drag-over');
        }
    });

    card.addEventListener('drop', handleDrop);
}

async function handleDrop(e) {
    e.stopPropagation();
    const targetCard = e.target.closest('.account-card');

    if (dragSrcEl !== targetCard) {
        // Reorder in DOM
        const container = accountsList;
        // Get all cards as array
        const cards = [...container.querySelectorAll('.account-card')];
        const srcIndex = cards.indexOf(dragSrcEl);
        const targetIndex = cards.indexOf(targetCard);

        if (srcIndex < targetIndex) {
            targetCard.after(dragSrcEl);
        } else {
            targetCard.before(dragSrcEl);
        }

        // Reorder data array
        const reorderedIds = [...container.querySelectorAll('.account-card')].map(c => {
            // We need to extract ID. 
            // We can find the ID from the "Settings" button inside the card which has data-id
            return c.querySelector('.btn-settings').dataset.id;
        });

        // Save new order
        try {
            await ipcRenderer.invoke('reorder-accounts', reorderedIds);

            // Sync local state without full reload to avoid jitter
            const newAccountsOrder = [];
            for (const id of reorderedIds) {
                const acc = accounts.find(a => a.id === id);
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
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    pendingAccountId = id;
    pendingGameType = gameType;
    const title = document.getElementById('launch-game-title');
    if (title) title.textContent = account.name;
    modalLaunchGame.classList.add('show');
}

async function performSwitch(id, gameType, shouldLaunch) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    try {
        log(`🔄 Connexion à ${account.name}...`);
        await ipcRenderer.invoke('switch-account', id);
        log(`✓ Login terminé.`);

        if (shouldLaunch) {
            log(`🚀 Lancement du jeu...`);
            await ipcRenderer.invoke('launch-game', gameType);
        }

        checkStatus();
    } catch (err) {
        alert(`Erreur: ${err.message}`);
    }
}

// --- Listeners ---

// Browse Image
if (btnBrowseImage) {
    btnBrowseImage.addEventListener('click', async () => {
        const path = await ipcRenderer.invoke('select-image');
        if (path) inputCardImage.value = path;
    });
}

// Modal Buttons
btnConfirmLaunch.addEventListener('click', () => {
    if (pendingAccountId && pendingGameType) {
        modalLaunchGame.classList.remove('show');
        performSwitch(pendingAccountId, pendingGameType, true);
        pendingAccountId = null;
        pendingGameType = null;
    }
});

btnCloseLaunchModal.forEach(btn => {
    btn.onclick = (e) => {
        e.preventDefault();
        modalLaunchGame.classList.remove('show');
        if (pendingAccountId && pendingGameType) {
            performSwitch(pendingAccountId, pendingGameType, false);
            pendingAccountId = null;
            pendingGameType = null;
        }
    };
});

btnConfirmDelete.addEventListener('click', () => {
    if (pendingDeleteAccountId) {
        modalDeleteAccount.classList.remove('show');
        performDelete(pendingDeleteAccountId);
        pendingDeleteAccountId = null;
    }
});

btnCloseDeleteModal.forEach(btn => {
    btn.addEventListener('click', () => {
        modalDeleteAccount.classList.remove('show');
        pendingDeleteAccountId = null;
    });
});

modalDeleteAccount.addEventListener('click', (e) => {
    if (e.target === modalDeleteAccount) {
        modalDeleteAccount.classList.remove('show');
        pendingDeleteAccountId = null;
    }
});

function showErrorModal(message) {
    const errorMessage = document.getElementById('error-modal-message');
    if (errorMessage && modalError) {
        errorMessage.textContent = message || 'Erreur.';
        modalError.classList.add('show');
    }
}

function closeErrorModal() {
    if (modalError) modalError.classList.remove('show');
}

if (btnCloseError) btnCloseError.addEventListener('click', closeErrorModal);
if (modalError) modalError.addEventListener('click', (e) => {
    if (e.target === modalError) closeErrorModal();
});

async function checkStatus() {
    try {
        const res = await ipcRenderer.invoke('get-status');
        if (res.status === 'Active' && res.accountId) {
            const acc = accounts.find(a => a.id === res.accountId);
            if (acc) {
                statusText.textContent = `Active: ${acc.name}`;
                statusDot.classList.add('active');
                document.querySelectorAll('.account-card').forEach(card => card.classList.remove('active-account'));
                const btn = document.querySelector(`.btn-switch[data-id="${acc.id}"]`);
                if (btn) btn.closest('.account-card').classList.add('active-account');
                return;
            }
        }
        statusText.textContent = res.status;
        statusDot.classList.add('active');
        document.querySelectorAll('.account-card').forEach(card => card.classList.remove('active-account'));
    } catch (err) {
        console.error(err);
    }
}

// --- Settings ---
async function loadSettings() {
    try {
        appConfig = await ipcRenderer.invoke('get-config');
        settingLogs.checked = appConfig.showLogs !== false;
        settingShowQuitModal.checked = appConfig.showQuitModal === true || appConfig.showQuitModal === undefined;
        settingMinimizeToTray.checked = appConfig.minimizeToTray === true || appConfig.minimizeToTray === undefined;
        settingAutoStart.checked = appConfig.autoStart === true;

        if (appConfig.security && appConfig.security.enabled) {
            settingSecurityEnable.checked = true;
            securityConfigArea.style.display = 'block';
        } else {
            settingSecurityEnable.checked = false;
            securityConfigArea.style.display = 'none';
        }

        let currentPath = appConfig.riotPath || "";
        if (!currentPath) {
            const detected = await ipcRenderer.invoke('auto-detect-paths');
            if (detected && detected.riotPath) {
                currentPath = detected.riotPath;
                appConfig.riotPath = currentPath;
                await ipcRenderer.invoke('save-config', appConfig);
            }
        }
        settingRiotPath.value = currentPath.replace(/\\\\/g, '\\');
        toggleLogs(appConfig.showLogs !== false);
    } catch (err) {
        console.error("Error loading settings:", err);
    }
}

async function saveSettings() {
    const newConfig = {
        theme: 'dark',
        showLogs: settingLogs.checked,
        riotPath: settingRiotPath.value.trim(),
        showQuitModal: settingShowQuitModal.checked,
        minimizeToTray: settingMinimizeToTray.checked,
        autoStart: settingAutoStart.checked
    };
    await ipcRenderer.invoke('save-config', newConfig);
    await ipcRenderer.invoke('set-auto-start', settingAutoStart.checked);
    showNotification('Paramètres sauvegardés !', 'success');
}

settingLogs.addEventListener('change', () => {
    toggleLogs(settingLogs.checked);
    saveSettings();
});

settingRiotPath.addEventListener('input', () => {
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(saveSettings, 500);
});

// Settings: Security
settingSecurityEnable.addEventListener('change', async (e) => {
    if (settingSecurityEnable.checked) {
        showLockScreen('set');
    } else {
        await ipcRenderer.invoke('disable-pin');
        showNotification('Code PIN désactivé', 'info');
        securityConfigArea.style.display = 'none';
    }
});

btnChangePin.addEventListener('click', () => showLockScreen('set'));

// Security Functions
async function checkSecurity() {
    const isEnabled = await ipcRenderer.invoke('check-security-enabled');
    if (isEnabled) showLockScreen('verify');
}

function showLockScreen(mode = 'verify') {
    currentPinInput = "";
    updatePinDisplay();
    lockScreen.style.display = 'flex';
    lockError.classList.remove('show');
    const title = lockScreen.querySelector('h2');
    const desc = lockScreen.querySelector('p');
    if (mode === 'verify') {
        title.textContent = "Verrouillé";
        desc.textContent = "Entrez votre code PIN pour accéder à SwitchMaster";
        isSettingPin = false;
    } else if (mode === 'set') {
        title.textContent = "Définir un Code PIN";
        desc.textContent = "Entrez un nouveau code PIN à 4 chiffres";
        isSettingPin = true;
        confirmPin = "";
    }
}

function updatePinDisplay() {
    const dots = lockPinDisplay.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
        if (index < currentPinInput.length) dot.classList.add('filled');
        else dot.classList.remove('filled');
    });
}

function handlePinInput(value) {
    if (currentPinInput.length < 4) {
        currentPinInput += value;
        updatePinDisplay();
    }
    if (currentPinInput.length === 4) setTimeout(processPin, 100);
}

async function processPin() {
    if (isSettingPin) {
        if (!confirmPin) {
            confirmPin = currentPinInput;
            currentPinInput = "";
            updatePinDisplay();
            lockScreen.querySelector('h2').textContent = "Confirmer le PIN";
            lockScreen.querySelector('p').textContent = "Entrez le code à nouveau pour confirmer";
        } else {
            if (currentPinInput === confirmPin) {
                await ipcRenderer.invoke('set-pin', currentPinInput);
                lockScreen.style.display = 'none';
                showNotification('Code PIN activé !', 'success');
                settingSecurityEnable.checked = true;
                securityConfigArea.style.display = 'block';
                isSettingPin = false;
                confirmPin = "";
            } else {
                showError("Les codes ne correspondent pas");
                currentPinInput = "";
                confirmPin = "";
                setTimeout(() => {
                    lockScreen.querySelector('h2').textContent = "Définir un Code PIN";
                    lockScreen.querySelector('p').textContent = "Entrez un nouveau code PIN à 4 chiffres";
                    updatePinDisplay();
                }, 1000);
            }
        }
    } else {
        const isValid = await ipcRenderer.invoke('verify-pin', currentPinInput);
        if (isValid) {
            lockScreen.style.display = 'none';
        } else {
            showError("Code incorrect");
            currentPinInput = "";
            updatePinDisplay();
        }
    }
}

function showError(msg) {
    lockError.textContent = msg;
    lockError.classList.add('show');
    const content = lockScreen.querySelector('.lock-content');
    content.classList.add('shake');
    setTimeout(() => {
        content.classList.remove('shake');
        lockError.classList.remove('show');
    }, 1000);
}

pinButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (val !== null) handlePinInput(val);
    });
});

if (pinDeleteBtn) {
    pinDeleteBtn.addEventListener('click', () => {
        currentPinInput = currentPinInput.slice(0, -1);
        updatePinDisplay();
    });
}

// Navigation
function switchView(viewName) {
    const currentView = navDashboard.classList.contains('active') ? viewDashboard : viewSettings;
    const targetView = viewName === 'dashboard' ? viewDashboard : viewSettings;

    if (viewName === 'dashboard' && navDashboard.classList.contains('active')) return;
    if (viewName === 'settings' && navSettings.classList.contains('active')) return;

    currentView.classList.remove('fade-in');
    currentView.classList.add('fade-out');

    setTimeout(() => {
        currentView.style.display = 'none';
        currentView.classList.remove('fade-out');
        targetView.style.display = 'block';
        targetView.classList.add('fade-in');

        if (viewName === 'dashboard') {
            navDashboard.classList.add('active');
            navSettings.classList.remove('active');
            btnAddAccount.style.display = 'flex';
        } else {
            navDashboard.classList.remove('active');
            navSettings.classList.add('active');
            btnAddAccount.style.display = 'none';
        }
    }, 200);
}

navDashboard.addEventListener('click', () => switchView('dashboard'));
navSettings.addEventListener('click', () => switchView('settings'));

// Initialize
function closeModal() {
    modalAddAccount.classList.remove('show');
}
function toggleLogs(show) {
    if (show) logsPanel.style.display = 'flex';
    else logsPanel.style.display = 'none';
}

btnAddAccount.addEventListener('click', () => {
    modalTitle.textContent = "Ajouter un Compte";
    inputEditId.value = '';
    inputName.value = '';
    inputUsername.value = '';
    inputPassword.value = '';
    inputRiotId.value = '';
    inputCardImage.value = '';
    modalAddAccount.classList.add('show');
    inputName.focus();
});

btnSaveAccount.addEventListener('click', saveAccount);

btnCloseModal.forEach(btn => {
    btn.addEventListener('click', closeModal);
});

modalAddAccount.addEventListener('click', (e) => {
    if (e.target === modalAddAccount) closeModal();
});

const passwordToggle = document.getElementById('toggle-password');
if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
        const type = inputPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        inputPassword.setAttribute('type', type);
        passwordToggle.querySelector('.eye-icon').style.display = type === 'password' ? 'block' : 'none';
        passwordToggle.querySelector('.eye-off-icon').style.display = type === 'password' ? 'none' : 'block';
    });
}

// Launch settings auto-save
settingShowQuitModal.addEventListener('change', saveSettings);
settingMinimizeToTray.addEventListener('change', saveSettings);
settingAutoStart.addEventListener('change', saveSettings);

// Boot
loadSettings();
checkSecurity();
loadAccounts();
log('Application started.');
