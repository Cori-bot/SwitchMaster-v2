import { BrowserWindow } from "electron";
import { registerAccountHandlers } from "./ipc/accountHandlers";
import { registerConfigHandlers } from "./ipc/configHandlers";
import { registerRiotHandlers } from "./ipc/riotHandlers";
import { registerSecurityHandlers } from "./ipc/securityHandlers";
import { registerMiscHandlers } from "./ipc/miscHandlers";
import { registerUpdateHandlers } from "./ipc/updateHandlers";
import { IpcContext } from "./ipc/types";

let areHandlersRegistered = false;
let currentMainWindow: BrowserWindow | null = null;

export function setupIpcHandlers(
  mainWindow: BrowserWindow | null,
  context: IpcContext,
) {
  if (mainWindow) {
    currentMainWindow = mainWindow;
  }

  if (areHandlersRegistered) return;

  const getWin = () => currentMainWindow;

  registerAccountHandlers();
  registerConfigHandlers();
  registerRiotHandlers(context.launchGame);
  registerSecurityHandlers();
  registerMiscHandlers(getWin, context);
  registerUpdateHandlers(getWin);

  areHandlersRegistered = true;
}

export type { IpcContext };
