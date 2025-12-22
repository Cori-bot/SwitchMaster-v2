import { BrowserWindow } from "electron";
import { registerAccountHandlers } from "./ipc/accountHandlers";
import { registerConfigHandlers } from "./ipc/configHandlers";
import { registerRiotHandlers } from "./ipc/riotHandlers";
import { registerSecurityHandlers } from "./ipc/securityHandlers";
import { registerMiscHandlers } from "./ipc/miscHandlers";
import { registerUpdateHandlers } from "./ipc/updateHandlers";
import { IpcContext } from "./ipc/types";

let areHandlersRegistered = false;

export function setupIpcHandlers(
  mainWindow: BrowserWindow | null,
  context: IpcContext,
) {
  if (!areHandlersRegistered) {
    registerAccountHandlers();
    registerConfigHandlers();
    registerRiotHandlers(context.launchGame);
    registerSecurityHandlers();
    areHandlersRegistered = true;
  }

  if (mainWindow) {
    registerMiscHandlers(mainWindow, context);
    registerUpdateHandlers(mainWindow);
  }
}

export type { IpcContext };
