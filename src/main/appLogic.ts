import { app, BrowserWindow } from "electron";
import { exec, spawn } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);
import path from "path";
import fs from "fs-extra";
import { getConfig } from "./config";

import { devDebug } from "./logger";

const MONITOR_INTERVAL_MS = 10000;
const GAME_LAUNCH_DELAY_MS = 3000;

export async function monitorRiotProcess(
  mainWindow: BrowserWindow | null,
  onClosed?: () => void,
) {
  setInterval(async () => {
    try {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV',
      );
      if (!stdout.includes("RiotClientServices.exe")) {
        if (onClosed) onClosed();
        if (mainWindow) mainWindow.webContents.send("riot-client-closed");
      }
    } catch (err: unknown) {
      // Ignore errors (typically when tasklist fails or process not found)
      const message = err instanceof Error ? err.message : String(err);
      devDebug("Monitor interval error:", message);
    }
  }, MONITOR_INTERVAL_MS);
}

export async function launchGame(gameId: "league" | "valorant") {
  const config = getConfig();
  let clientPath = config.riotPath;

  // Ensure we use RiotClientServices.exe
  if (!clientPath.endsWith("RiotClientServices.exe")) {
    if (
      (await fs.pathExists(clientPath)) &&
      (await fs.stat(clientPath)).isDirectory()
    ) {
      clientPath = path.join(clientPath, "RiotClientServices.exe");
    } else {
      clientPath = path.join(
        path.dirname(clientPath),
        "RiotClientServices.exe",
      );
    }
  }

  if (!(await fs.pathExists(clientPath))) {
    throw new Error("Executable Riot Client non trouvé à : " + clientPath);
  }

  // Petit délai pour laisser le temps au client de se stabiliser après le login
  await new Promise((resolve) => setTimeout(resolve, GAME_LAUNCH_DELAY_MS));

  let args: string[] = [];
  if (gameId === "valorant") {
    args = ["--launch-product=valorant", "--launch-patchline=live"];
  } else if (gameId === "league") {
    args = ["--launch-product=league_of_legends", "--launch-patchline=live"];
  }

  spawn(clientPath, args, { detached: true, stdio: "ignore" }).unref();
}

export function setAutoStart(enable: boolean) {
  const config = getConfig();
  const settings: Electron.Settings = { openAtLogin: enable };

  if (enable) {
    const args: string[] = [];
    if (!app.isPackaged) {
      settings.path = process.execPath;
      args.push(".");
    }

    if (config.startMinimized) {
      args.push("--minimized");
    }

    if (args.length > 0) {
      settings.args = args;
    }
  }

  app.setLoginItemSettings(settings);
}

export function getAutoStartStatus() {
  const settings = app.getLoginItemSettings();
  return {
    enabled: settings.openAtLogin || false,
    wasOpenedAtLogin: settings.wasOpenedAtLogin || false,
  };
}

export async function getStatus(): Promise<{
  status: string;
  accountId?: string;
  accountName?: string;
}> {
  const config = getConfig();
  try {
    const { stdout } = await execAsync(
      'tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV',
    );
    const isRunning = stdout.includes("RiotClientServices.exe");

    if (isRunning && config.lastAccountId) {
      return { status: "Active", accountId: config.lastAccountId };
    }
    return { status: "Prêt" };
  } catch (error: unknown) {
    return { status: "Prêt" };
  }
}
