import { describe, it, expect, vi } from "vitest";

vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
});

// Mock electron-updater car il est importé par updater.ts
vi.mock("electron-updater", () => ({
  autoUpdater: {
    on: vi.fn(),
    logger: null,
    autoDownload: false,
  },
  AppUpdater: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("userDataPath"),
    isPackaged: true,
    getVersion: vi.fn().mockReturnValue("1.0.0"),
    commandLine: { appendSwitch: vi.fn() },
  },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
}));

import { setupIpcHandlers } from "../main/ipc";
import * as accountHandlers from "../main/ipc/accountHandlers";
import * as configHandlers from "../main/ipc/configHandlers";
import * as riotHandlers from "../main/ipc/riotHandlers";
import * as securityHandlers from "../main/ipc/securityHandlers";
import * as miscHandlers from "../main/ipc/miscHandlers";
import * as updateHandlers from "../main/ipc/updateHandlers";

vi.mock("../main/ipc/accountHandlers");
vi.mock("../main/ipc/configHandlers");
vi.mock("../main/ipc/riotHandlers");
vi.mock("../main/ipc/securityHandlers");
vi.mock("../main/ipc/miscHandlers");
vi.mock("../main/ipc/updateHandlers");

describe("IPC Registration Coverage", () => {
  it("doit enregistrer tous les groupes de handlers", () => {
    const mockContext = {
      launchGame: vi.fn(),
      setAutoStart: vi.fn(),
      getAutoStartStatus: vi.fn(),
      getStatus: vi.fn(),
      isValorantRunning: vi.fn(),
    };
    
    setupIpcHandlers(null, mockContext);
    
    expect(accountHandlers.registerAccountHandlers).toHaveBeenCalled();
    expect(configHandlers.registerConfigHandlers).toHaveBeenCalled();
    expect(riotHandlers.registerRiotHandlers).toHaveBeenCalled();
    expect(securityHandlers.registerSecurityHandlers).toHaveBeenCalled();
    expect(miscHandlers.registerMiscHandlers).toHaveBeenCalled();
    expect(updateHandlers.registerUpdateHandlers).toHaveBeenCalled();
  });
});
