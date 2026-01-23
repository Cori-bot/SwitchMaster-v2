import { BrowserWindow } from "electron";
import { registerAccountHandlers } from "./ipc/accountHandlers";
import { registerConfigHandlers } from "./ipc/configHandlers";
import { registerRiotHandlers } from "./ipc/riotHandlers";
import { registerSecurityHandlers } from "./ipc/securityHandlers";
import { registerMiscHandlers } from "./ipc/miscHandlers";
import { registerUpdateHandlers } from "./ipc/updateHandlers";

import { IpcContext } from "./ipc/types";
import { SecurityService } from "./services/SecurityService";
import { ConfigService } from "./services/ConfigService";
import { AccountService } from "./services/AccountService";
import { RiotAutomationService } from "./services/RiotAutomationService";
import { SessionService } from "./services/SessionService";
import { SystemService } from "./services/SystemService";
import { StatsService } from "./services/StatsService";

let areHandlersRegistered = false;
let currentMainWindow: BrowserWindow | null = null;

export interface AppServices {
  configService: ConfigService;
  securityService: SecurityService;
  accountService: AccountService;
  riotAutomationService: RiotAutomationService;
  sessionService: SessionService;
  systemService: SystemService;
  statsService: StatsService;
}

export function setupIpcHandlers(
  mainWindow: BrowserWindow | null,
  context: IpcContext,
  services: AppServices,
) {
  if (mainWindow) {
    currentMainWindow = mainWindow;
  }

  if (areHandlersRegistered) return;

  const getWin = () => currentMainWindow;

  registerAccountHandlers(getWin, services.accountService);
  registerConfigHandlers(services.configService);
  registerRiotHandlers(
    getWin,
    context.launchGame,
    context.getStatus,
    services.sessionService,
    services.riotAutomationService,
  );
  registerSecurityHandlers(services.securityService);
  registerMiscHandlers(
    getWin,
    context,
    services.accountService,
    services.configService,
  );
  registerUpdateHandlers(getWin);

  areHandlersRegistered = true;
}

export type { IpcContext };
