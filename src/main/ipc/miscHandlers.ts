import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { loadAccountsMeta } from "../accounts";
import { saveConfig } from "../config";
import { safeHandle } from "./utils";
import { IpcContext } from "./types";
import { handleUpdateCheck } from "../updater";
import { devLog } from "../logger";

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

    const win = getMainWindow();
    if (dontShowAgain && win) {
      const config = require("../config").getConfig();
      const newConfig = {
        ...config,
        showQuitModal: false,
        minimizeToTray: action === "minimize",
      };
      await saveConfig(newConfig);
      void win.webContents.send("config-updated", newConfig);
    }

    if (action === "quit") {
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
}
