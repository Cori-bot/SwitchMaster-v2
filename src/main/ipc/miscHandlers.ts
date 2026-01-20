import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { loadAccountsMeta } from "../accounts";
import { saveConfig, getConfig } from "../config";
import { safeHandle } from "./utils";
import { IpcContext } from "./types";
import { handleUpdateCheck } from "../updater";
import { devLog, devError } from "../logger";


export function registerMiscHandlers(
  getMainWindow: () => BrowserWindow | null,
  context: IpcContext,
) {
  safeHandle("select-account-image", async () => {
    const win = getMainWindow();
    if (!win) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["jpg", "png", "gif", "jpeg", "webp"] },
      ],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.removeAllListeners("log-to-main");
  ipcMain.on("log-to-main", (_e, { level, args }) => {
    const prefix = `[Renderer ${level.toUpperCase()}]`;
    devLog(`${prefix}`, ...args);
  });

  safeHandle("get-status", async () => {
    const statusInfo = await context.getStatus();
    if (statusInfo.status === "Active" && statusInfo.accountId) {
      const accounts = await loadAccountsMeta();
      const acc = accounts.find((a) => a.id === statusInfo.accountId);
      if (acc) {
        statusInfo.accountName = acc.name;
      }
    }
    return statusInfo;
  });

  safeHandle("get-auto-start", () => context.getAutoStartStatus());
  safeHandle("set-auto-start", (_e, enable) => {
    context.setAutoStart(enable as boolean);
    return true;
  });

  safeHandle("check-updates", async () => {
    const win = getMainWindow();
    if (win) {
      await handleUpdateCheck(win, true);
    }
    return true;
  });

  safeHandle("handle-quit-choice", async (_e, dataRaw: any) => {
    const { action, dontShowAgain } = dataRaw as {
      action: "quit" | "minimize";
      dontShowAgain: boolean;
    };

    if (action === "quit") {
      (app as any).isQuitting = true;
      (global as any).isQuitting = true;
    }

    const win = getMainWindow();
    if (dontShowAgain) {
      const config = getConfig();
      const newConfig = {
        ...config,
        showQuitModal: false,
        minimizeToTray: action === "minimize",
      };

      try {
        await saveConfig(newConfig);
        if (action !== "quit" && win && !win.isDestroyed()) {
          void win.webContents.send("config-updated", newConfig);
        }
      } catch (err) {
        devError("Failed to save config during quit choice:", err);
      }
    }

    if (action === "quit") {
      if (win && !win.isDestroyed()) {
        win.close();
      }
      app.quit();
    } else {
      win?.hide();
    }
    return true;
  });

  safeHandle("close-app", () => {
    app.quit();
  });

  safeHandle("minimize-app", () => {
    getMainWindow()?.minimize();
  });

  safeHandle("restart-app", () => {
    app.relaunch();
    app.exit();
  });



  safeHandle("is-valorant-running", () => context.isValorantRunning());
}
