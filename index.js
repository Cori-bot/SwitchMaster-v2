const { app, BrowserWindow, ipcMain, safeStorage, shell, dialog, clipboard, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { v4: uuidv4 } = require('uuid');
const chokidar = require('chokidar');
const crypto = require('crypto');
const { fetchAccountStats } = require('./statsService');
const { spawn, exec } = require('child_process');

// --- Constants & Paths ---
const APP_DATA_PATH = app.getPath('userData');
const ACCOUNTS_FILE = path.join(APP_DATA_PATH, 'accounts.json');
const CONFIG_FILE = path.join(APP_DATA_PATH, 'config.json');
const DEFAULT_RIOT_DATA_PATH = "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
const PRIVATE_SETTINGS_FILE = 'RiotClientPrivateSettings.yaml';

// Ensure User Data Directory Exists
fs.ensureDirSync(APP_DATA_PATH);

let mainWindow;
let tray = null;
let riotDataPath = DEFAULT_RIOT_DATA_PATH;
let appConfig = {
    riotPath: DEFAULT_RIOT_DATA_PATH,
    theme: 'dark',
    showLogs: true,
    minimizeToTray: true,
    showQuitModal: true,
    autoStart: false,
    lastAccountId: null,
    security: {
        enabled: false,
        pinHash: null
    }
};

// ... (keep existing code matches)

// --- Security Functions ---
function hashPin(pin) {
    return crypto.createHash('sha256').update(pin).digest('hex');
}

// ... (at the end of IPC handlers section)

// 8. Security IPC
ipcMain.handle('verify-pin', async (event, pin) => {
    if (!appConfig.security.enabled) return true;

    // Simple SHA256 hash comparison
    const hashed = hashPin(pin);
    return hashed === appConfig.security.pinHash;
});

ipcMain.handle('set-pin', async (event, pin) => {
    const hashed = hashPin(pin);
    appConfig.security = {
        enabled: true,
        pinHash: hashed
    };
    await saveConfig(appConfig);
    return true;
});

ipcMain.handle('disable-pin', async (event) => {
    appConfig.security = {
        enabled: false,
        pinHash: null
    };
    await saveConfig(appConfig);
    return true;
});

ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['jpg', 'png', 'gif', 'jpeg', 'webp'] }
        ]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

// 9. Check Security Enabled
ipcMain.handle('check-security-enabled', () => {
    return appConfig.security && appConfig.security.enabled;
});

let activeAccountId = null;

// --- Helper Functions ---

async function loadConfig() {
    try {
        if (await fs.pathExists(CONFIG_FILE)) {
            const savedConfig = await fs.readJson(CONFIG_FILE);
            appConfig = { ...appConfig, ...savedConfig };
            riotDataPath = appConfig.riotPath;
        }
    } catch (e) {
        console.error("Error loading config:", e);
    }
}

async function saveConfig(newConfig) {
    appConfig = { ...appConfig, ...newConfig };
    riotDataPath = appConfig.riotPath;
    try {
        await fs.outputJson(CONFIG_FILE, appConfig, { spaces: 2 });
    } catch (e) {
        console.error("Error saving config:", e);
    }
}

// Secure Encryption/Decryption
function encryptData(data) {
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(data).toString('base64');
    } else {
        return Buffer.from(data).toString('base64');
    }
}

function decryptData(encryptedData) {
    if (safeStorage.isEncryptionAvailable()) {
        try {
            return safeStorage.decryptString(Buffer.from(encryptedData, 'base64'));
        } catch (e) {
            console.error("Decryption failed:", e);
            return null;
        }
    } else {
        return Buffer.from(encryptedData, 'base64').toString('utf-8');
    }
}

// Load/Save Accounts Metadata
async function loadAccountsMeta() {
    try {
        if (await fs.pathExists(ACCOUNTS_FILE)) {
            return await fs.readJson(ACCOUNTS_FILE);
        }
    } catch (e) {
        console.error("Error loading accounts:", e);
    }
    return [];
}

async function saveAccountsMeta(accounts) {
    try {
        await fs.outputJson(ACCOUNTS_FILE, accounts, { spaces: 2 });
    } catch (e) {
        console.error("Error saving accounts:", e);
    }
}

// --- Main Window ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 600,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        backgroundColor: '#121212',
        frame: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets', 'logo.png')
    });

    mainWindow.loadFile('index.html');

    // Handle window close event
    mainWindow.on('close', (event) => {
        // Allow quit if explicitly requested
        if (app.isQuitting) {
            return;
        }

        if (appConfig.showQuitModal) {
            event.preventDefault();
            mainWindow.webContents.send('show-quit-modal');
        } else {
            if (appConfig.minimizeToTray) {
                event.preventDefault();
                mainWindow.hide();
            }
            // If minimizeToTray is false, allow default quit behavior
        }
    });
}

// --- System Tray ---
async function updateTrayMenu() {
    if (!tray) {
        const iconPath = path.join(__dirname, 'assets', 'logo.png');
        tray = new Tray(iconPath);
        tray.setToolTip('SwitchMaster');

        // Click on tray icon to show window
        tray.on('click', () => {
            if (mainWindow.isVisible()) {
                mainWindow.focus();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        });
    }

    // Build menu items
    const menuItems = [
        {
            label: 'Afficher SwitchMaster',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Lancer League of Legends',
            click: () => launchGame('league')
        },
        {
            label: 'Lancer Valorant',
            click: () => launchGame('valorant')
        }
    ];

    // Add quick connect if there's a last account
    if (appConfig.lastAccountId) {
        try {
            const accounts = await loadAccountsMeta();
            const lastAccount = accounts.find(a => a.id === appConfig.lastAccountId);
            if (lastAccount) {
                menuItems.push(
                    { type: 'separator' },
                    {
                        label: `Connecter: ${lastAccount.name}`,
                        click: async () => {
                            try {
                                // Trigger the switch account handler
                                const result = await ipcMain.emit('switch-account-trigger', lastAccount.id);
                                mainWindow.webContents.send('quick-connect-triggered', lastAccount.id);
                            } catch (err) {
                                console.error('Quick connect error:', err);
                            }
                        }
                    }
                );
            }
        } catch (err) {
            console.error('Error loading accounts for tray menu:', err);
        }
    }

    // Add quit button
    menuItems.push(
        { type: 'separator' },
        {
            label: 'Quitter',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    );

    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

// Auto-start functionality
function setAutoStart(enable) {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath
    });
}

// --- App Lifecycle ---
// --- Process Monitoring ---
function monitorRiotProcess() {
    setInterval(() => {
        if (!activeAccountId) return;

        exec('tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV', (err, stdout) => {
            if (err) return;
            // stdout will contain "No tasks are running" or similar if not found, 
            // or the CSV header + process line if found.
            // Simplest check: does it include the exe name in a data line?
            // "INFO: No tasks are running"

            if (!stdout.includes('RiotClientServices.exe')) {
                console.log('Riot Client closed. Resetting active status.');
                activeAccountId = null;
            }
        });
    }, 5000); // Check every 5 seconds
}

app.whenReady().then(async () => {
    await loadConfig();
    createWindow();
    updateTrayMenu();
    monitorRiotProcess();

    const settingsPath = path.join(riotDataPath, PRIVATE_SETTINGS_FILE);
    if (fs.existsSync(riotDataPath)) {
        chokidar.watch(settingsPath).on('change', () => {
            // Optional: Notify renderer
        });
    }
});

app.on('window-all-closed', () => {
    // Don't quit on window close if minimizing to tray
    if (process.platform !== 'darwin' && !appConfig.minimizeToTray) {
        app.quit();
    }
});

// --- IPC Handlers ---

// 1. Get Accounts
ipcMain.handle('get-accounts', async () => {
    return await loadAccountsMeta();
});

// Get account with decrypted credentials (for editing)
ipcMain.handle('get-account-credentials', async (event, accountId) => {
    const accounts = await loadAccountsMeta();
    const account = accounts.find(a => a.id === accountId);

    if (!account) throw new Error('Account not found.');

    // Decrypt credentials
    const decryptedAccount = {
        ...account,
        username: decryptData(account.username),
        password: decryptData(account.password)
    };

    return decryptedAccount;
});

// 2. Add Account (with credentials)
ipcMain.handle('add-account', async (event, { name, username, password, riotId, gameType, cardImage }) => {
    const id = uuidv4();

    // Encrypt credentials
    const encryptedUsername = encryptData(username);
    const encryptedPassword = encryptData(password);

    const newAccount = {
        id,
        name,
        username: encryptedUsername,
        password: encryptedPassword,
        riotId: riotId || null,
        gameType: gameType || 'valorant',
        cardImage: cardImage || null, // Save the image path
        timestamp: Date.now(),
        stats: null
    };

    const accounts = await loadAccountsMeta();
    accounts.push(newAccount);
    await saveAccountsMeta(accounts);

    return newAccount;
});

// 3. Delete Account
ipcMain.handle('delete-account', async (event, accountId) => {
    let accounts = await loadAccountsMeta();
    accounts = accounts.filter(a => a.id !== accountId);
    await saveAccountsMeta(accounts);
    return true;
});

// 4. Select Riot Path
ipcMain.handle('select-riot-path', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Sélectionner l\'exécutable Riot Client',
        filters: [
            { name: 'Executables', extensions: ['exe'] }
        ],
        properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) {
        return null;
    }
    return filePaths[0];
});

// 4b. Auto Detect Paths
ipcMain.handle('auto-detect-paths', async () => {
    try {
        const psScript = path.join(__dirname, 'assets', 'scripts', 'detect_games.ps1');

        return new Promise((resolve, reject) => {
            const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScript]);
            let output = '';
            let errorOutput = '';

            ps.stdout.on('data', (d) => output += d.toString());
            ps.stderr.on('data', (d) => errorOutput += d.toString());

            ps.on('close', (code) => {
                if (code !== 0) {
                    console.error('Detection PS failed:', errorOutput);
                    resolve(null); // Return null on failure, don't crash
                    return;
                }

                try {
                    const data = JSON.parse(output);
                    // Find Riot Client
                    const riotEntry = data.find(item => item.DisplayName && item.DisplayName.includes('Riot Client'));
                    let riotPath = null;
                    if (riotEntry && riotEntry.InstallLocation) {
                        riotPath = path.join(riotEntry.InstallLocation, 'RiotClientServices.exe');
                        if (fs.existsSync(riotPath)) return resolve({ riotPath });
                    }

                    // Fallback search or just return what we have
                    resolve(null);
                } catch (e) {
                    console.error('JSON Parse error in detection:', e);
                    resolve(null);
                }
            });
        });
    } catch (e) {
        console.error('Auto detect error:', e);
        return null;
    }
});

// 5. Switch Account (with automation)
ipcMain.handle('switch-account', async (event, id) => {
    const accounts = await loadAccountsMeta();
    const account = accounts.find(a => a.id === id);

    if (!account) throw new Error('Account not found.');

    // Decrypt credentials
    const username = decryptData(account.username);
    const password = decryptData(account.password);

    console.log(`Switching to account: ${account.name}`);

    // Kill Riot Processes
    try {
        console.log('Killing existing Riot processes...');
        await new Promise((resolve) => {
            exec('taskkill /F /IM "RiotClientServices.exe" /IM "LeagueClient.exe" /IM "VALORANT.exe"', () => resolve());
        });
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        console.log('Processes cleanup err:', e.message);
    }

    // Launch Riot Client
    let clientPath = appConfig.riotPath || DEFAULT_RIOT_DATA_PATH;
    if (!clientPath.endsWith('.exe')) {
        clientPath = path.join(clientPath, 'RiotClientServices.exe');
    }

    console.log('Launching Riot Client from:', clientPath);
    if (fs.existsSync(clientPath)) {
        const child = spawn(clientPath, [], { detached: true, stdio: 'ignore' });
        child.unref();
    } else {
        throw new Error('Riot Client executable not found at: ' + clientPath);
    }

    // Automation
    try {
        const psScript = path.join(__dirname, 'assets', 'scripts', 'automate_login.ps1');

        // Helper to run PS
        const runPs = (action) => {
            return new Promise((resolve, reject) => {
                const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScript, '-Action', action]);
                let output = '';
                ps.stdout.on('data', (d) => output += d.toString());
                ps.on('close', (code) => {
                    if (code === 0) resolve(output);
                    else reject(new Error(`PS Action ${action} failed`));
                });
            });
        };

        // Wait for window (polling)
        console.log('Waiting for window...');
        let attempts = 0;
        let found = false;
        while (attempts < 30) {
            try {
                const check = await runPs('Check');
                if (check && check.includes('Found')) {
                    found = true;
                    break;
                }
            } catch (e) {/*ignore*/ }
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
        }

        if (!found) throw new Error('Riot Client window not detected.');
        console.log('Window found. Performing Login...');

        clipboard.writeText(username);
        await runPs('PasteTab');
        clipboard.clear();

        await new Promise(r => setTimeout(r, 500));

        clipboard.writeText(password);
        await runPs('PasteEnter');
        clipboard.clear();

    } catch (err) {
        console.error('Automation error:', err);
        throw err;
    }

    activeAccountId = id;
    appConfig.lastAccountId = id;
    await saveConfig(appConfig);
    updateTrayMenu(); // Update tray menu with new last account
    return { success: true };
});

// Helper function to launch game
async function launchGame(gameId) {
    let clientPath = appConfig.riotPath || "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
    if (!clientPath.endsWith('.exe')) {
        clientPath = path.join(clientPath, 'RiotClientServices.exe');
    }

    if (!await fs.pathExists(clientPath)) {
        throw new Error("Riot Client Executable not found.");
    }

    let args = [];
    if (gameId === 'valorant') {
        args = ['--launch-product=valorant', '--launch-patchline=live'];
    } else if (gameId === 'league') {
        args = ['--launch-product=league_of_legends', '--launch-patchline=live'];
    }

    spawn(clientPath, args, { detached: true, stdio: 'ignore' }).unref();
}

// 6. Launch Game
ipcMain.handle('launch-game', async (event, gameId) => {
    await launchGame(gameId);
    return true;
});

// 7. Get Current Status
ipcMain.handle('get-status', async () => {
    if (activeAccountId) {
        return { status: 'Active', accountId: activeAccountId };
    }
    return { status: 'Ready' };
});

// 8. Settings IPC
ipcMain.handle('get-config', () => appConfig);

ipcMain.handle('save-config', async (event, config) => {
    await saveConfig(config);
    return true;
});

// 9. Fetch Account Stats
ipcMain.handle('fetch-account-stats', async (event, accountId) => {
    try {
        const accounts = await loadAccountsMeta();
        const account = accounts.find(a => a.id === accountId);

        if (!account) {
            throw new Error('Account not found');
        }

        if (!account.riotId) {
            throw new Error('Riot ID is required to fetch stats');
        }

        const stats = await fetchAccountStats(account.riotId, account.gameType);

        // Update account with stats
        account.stats = stats;
        await saveAccountsMeta(accounts);

        return stats;
    } catch (error) {
        console.error('Error fetching account stats:', error);
        throw error;
    }
});

ipcMain.handle('update-account-stats', async (event, accountId, stats) => {
    try {
        const accounts = await loadAccountsMeta();
        const account = accounts.find(a => a.id === accountId);

        if (!account) {
            throw new Error('Account not found');
        }

        account.stats = stats;
        await saveAccountsMeta(accounts);

        return true;
    } catch (error) {
        console.error('Error updating account stats:', error);
        throw error;
    }
});

// 10. Handle Quit Modal Choice
ipcMain.handle('handle-quit-choice', async (event, { action, dontShowAgain }) => {
    if (dontShowAgain) {
        appConfig.showQuitModal = false;
        await saveConfig(appConfig);
    }

    if (action === 'quit') {
        app.isQuitting = true;
        app.quit();
    } else if (action === 'minimize') {
        mainWindow.hide();
    }
    // action === 'cancel' does nothing

    return true;
});

// 11. Set Auto-Start
ipcMain.handle('set-auto-start', async (event, enable) => {
    setAutoStart(enable);
    return true;
});
