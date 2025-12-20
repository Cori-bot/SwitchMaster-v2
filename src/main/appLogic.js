const { app, ipcMain } = require("electron");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs-extra");

const { getConfig } = require("./config");

async function monitorRiotProcess(mainWindow, onClosed) {
  setInterval(async () => {
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV');
      if (!stdout.includes("RiotClientServices.exe")) {
        if (onClosed) onClosed();
        if (mainWindow) mainWindow.webContents.send("riot-client-closed");
      }
    } catch (err) {
      // Ignore errors
    }
  }, 10000);
}

async function launchGame(gameId) {
  const config = getConfig();
  let clientPath = config.riotPath;
  
  if (gameId === "valorant") {
    clientPath = path.join(path.dirname(clientPath), "VALORANT.exe");
  } else if (gameId === "league") {
    clientPath = path.join(path.dirname(clientPath), "RiotClientServices.exe");
  }

  if (!(await fs.pathExists(clientPath))) {
    throw new Error("Executable not found at: " + clientPath);
  }

  // Wait for client to be ready if needed
  await new Promise(resolve => setTimeout(resolve, 10000));

  let args = [];
  if (gameId === "valorant") {
    args = ["--launch-product=valorant", "--launch-patchline=live"];
  } else if (gameId === "league") {
    args = ["--launch-product=league_of_legends", "--launch-patchline=live"];
  }

  spawn(clientPath, args, { detached: true, stdio: "ignore" }).unref();
}

function setAutoStart(enable) {
  const settings = { openAtLogin: enable };
  if (!app.isPackaged) {
    settings.path = process.execPath;
    settings.args = ["."];
  }
  app.setLoginItemSettings(settings);
}

function getAutoStartStatus() {
  const settings = app.getLoginItemSettings();
  return {
    enabled: settings.openAtLogin || false,
    wasOpenedAtLogin: settings.wasOpenedAtLogin || false,
  };
}

module.exports = {
  monitorRiotProcess,
  launchGame,
  setAutoStart,
  getAutoStartStatus,
};
