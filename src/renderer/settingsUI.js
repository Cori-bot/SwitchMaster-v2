import { state } from './state.js';

const ipcRenderer = window.ipc;

export function initSettings() {
  const settingRiotPath = document.getElementById("setting-riot-path");
  const settingShowQuitModal = document.getElementById("setting-show-quit-modal");
  const settingMinimizeToTray = document.getElementById("setting-minimize-to-tray");
  const settingAutoStart = document.getElementById("setting-auto-start");
  const settingSecurityEnable = document.getElementById("setting-security-enable");
  const securityConfigArea = document.getElementById("security-config-area");

  if (settingRiotPath) settingRiotPath.value = state.appConfig.riotPath || "";
  if (settingShowQuitModal) settingShowQuitModal.checked = state.appConfig.showQuitModal;
  if (settingMinimizeToTray) settingMinimizeToTray.checked = state.appConfig.minimizeToTray;
  if (settingAutoStart) settingAutoStart.checked = state.appConfig.autoStart;
  
  if (settingSecurityEnable) {
    const isSecurityEnabled = state.appConfig.security && state.appConfig.security.enabled;
    settingSecurityEnable.checked = isSecurityEnabled;
    if (securityConfigArea) securityConfigArea.style.display = isSecurityEnabled ? "block" : "none";
  }

  if (settingShowQuitModal) settingShowQuitModal.onchange = (e) => saveConfig({ showQuitModal: e.target.checked });
  if (settingMinimizeToTray) settingMinimizeToTray.onchange = (e) => saveConfig({ minimizeToTray: e.target.checked });
  if (settingAutoStart) settingAutoStart.onchange = (e) => {
    saveConfig({ autoStart: e.target.checked });
    ipcRenderer.invoke("set-auto-start", e.target.checked);
  };

  if (settingRiotPath) {
    let saveTimeout;
    settingRiotPath.oninput = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveConfig({ riotPath: settingRiotPath.value.trim() });
      }, 500);
    };
  }
}

async function saveConfig(patch) {
  state.appConfig = { ...state.appConfig, ...patch };
  await ipcRenderer.invoke("save-config", state.appConfig);
}

export async function browseRiotPath() {
  const path = await ipcRenderer.invoke("select-riot-path");
  if (path) {
    await saveConfig({ riotPath: path });
    document.getElementById("setting-riot-path").textContent = path;
  }
}
