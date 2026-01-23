import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, dialog, BrowserWindow } from "electron";

// Mock electron
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

describe("riotHandlers - Couverture 100%", () => {
  const registeredHandlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(registeredHandlers).forEach(
      (k) => delete registeredHandlers[k],
    );

    (ipcMain.handle as any).mockImplementation(
      (channel: string, handler: Function) => {
        registeredHandlers[channel] = handler;
      },
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("select-riot-path", () => {
    it("retourne null quand l'utilisateur annule le dialog", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      (dialog.showOpenDialog as any).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      registerRiotHandlers(() => null, vi.fn(), vi.fn(), {} as any, {} as any);

      const handler = registeredHandlers["select-riot-path"];
      const result = await handler({});
      expect(result).toBe(null);
    });

    it("retourne le chemin quand l'utilisateur sélectionne un fichier", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      (dialog.showOpenDialog as any).mockResolvedValue({
        canceled: false,
        filePaths: ["C:\\Path\\To\\RiotClientServices.exe"],
      });

      registerRiotHandlers(() => null, vi.fn(), vi.fn(), {} as any, {} as any);

      const handler = registeredHandlers["select-riot-path"];
      const result = await handler({});
      expect(result).toBe("C:\\Path\\To\\RiotClientServices.exe");
    });
  });

  describe("switch-account", () => {
    it("appelle switchAccount sur le service", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      const mockSessionService = {
        switchAccount: vi.fn().mockResolvedValue(true),
      };
      const mockAutomationService = {
        autoDetectPaths: vi.fn(),
      };

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => false,
      } as unknown as BrowserWindow;

      const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });

      registerRiotHandlers(
        () => mockWindow,
        vi.fn(),
        mockGetStatus,
        mockSessionService as any,
        mockAutomationService as any,
      );

      const handler = registeredHandlers["switch-account"];
      await handler({}, "account-id-123");

      expect(mockSessionService.switchAccount).toHaveBeenCalledWith(
        "account-id-123",
      );
    });

    it("ne notifie pas si la fenêtre est destroyed", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => true,
      } as unknown as BrowserWindow;

      const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });
      const mockSessionService = {
        switchAccount: vi.fn().mockResolvedValue(true),
      };

      registerRiotHandlers(
        () => mockWindow,
        vi.fn(),
        mockGetStatus,
        mockSessionService as any,
        {} as any,
      );

      const handler = registeredHandlers["switch-account"];
      await handler({}, "account-id-123");

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it("ne notifie pas si la fenêtre est null", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });
      const mockSessionService = {
        switchAccount: vi.fn().mockResolvedValue(true),
      };

      registerRiotHandlers(
        () => null,
        vi.fn(),
        mockGetStatus,
        mockSessionService as any,
        {} as any,
      );

      const handler = registeredHandlers["switch-account"];
      const result = await handler({}, "account-id-123");

      expect(result).toEqual({ success: true, id: "account-id-123" });
    });
  });
});
