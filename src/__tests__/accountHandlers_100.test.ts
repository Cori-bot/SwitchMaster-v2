import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, BrowserWindow } from "electron";

// Mock electron
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

// Mock accounts
const mockLoadAccountsMeta = vi.fn();
const mockSaveAccountsMeta = vi.fn();

vi.mock("../main/accounts", () => ({
  loadAccountsMeta: (...args: any[]) => mockLoadAccountsMeta(...args),
  getAccountCredentials: vi
    .fn()
    .mockResolvedValue({ username: "test", password: "test" }),
  addAccount: vi.fn().mockResolvedValue({ id: "new-id", name: "New" }),
  updateAccount: vi
    .fn()
    .mockResolvedValue({ id: "updated-id", name: "Updated" }),
  deleteAccount: vi.fn().mockResolvedValue(true),
  saveAccountsMeta: (...args: any[]) => mockSaveAccountsMeta(...args),
}));

// Mock statsService
vi.mock("../main/statsService", () => ({
  fetchAccountStats: vi.fn().mockResolvedValue({ rank: "Gold" }),
}));

// Mock validation
vi.mock("../shared/validation", () => ({
  accountSchema: {
    parse: vi.fn((data: any) => data),
  },
}));

describe("accountHandlers - Couverture 100%", () => {
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

    mockLoadAccountsMeta.mockResolvedValue([
      { id: "1", name: "Account1", riotId: "player#NA1", gameType: "valorant" },
    ]);
  });

  afterEach(() => {
    vi.resetModules();
    delete (global as any).refreshTray;
  });

  describe("notifyUpdate", () => {
    it("appelle refreshTray si global.refreshTray existe (lignes 26-27)", async () => {
      vi.resetModules();

      // Setup global.refreshTray
      const mockRefreshTray = vi.fn();
      (global as any).refreshTray = mockRefreshTray;

      const { registerAccountHandlers } =
        await import("../main/ipc/accountHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => false,
      } as unknown as BrowserWindow;

      const mockAccountService = {
        getAccounts: vi.fn().mockResolvedValue([{ id: "1", name: "Account1" }]),
        addAccount: vi.fn().mockResolvedValue({ id: "new-id" }),
      };

      registerAccountHandlers(() => mockWindow, mockAccountService as any);

      // Déclencher notifyUpdate via add-account
      const handler = registeredHandlers["add-account"];
      await handler({}, { name: "Test", username: "user", password: "pass" });

      // refreshTray doit avoir été appelé
      expect(mockRefreshTray).toHaveBeenCalled();
    });

    it("ne crash pas si refreshTray n'existe pas", async () => {
      vi.resetModules();

      // Pas de global.refreshTray
      delete (global as any).refreshTray;

      const { registerAccountHandlers } =
        await import("../main/ipc/accountHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => false,
      } as unknown as BrowserWindow;

      const mockAccountService = {
        getAccounts: vi.fn().mockResolvedValue([{ id: "1", name: "Account1" }]),
        addAccount: vi.fn().mockResolvedValue({ id: "new-id" }),
      };

      registerAccountHandlers(() => mockWindow, mockAccountService as any);

      const handler = registeredHandlers["add-account"];
      // Ne doit pas lever d'exception
      await expect(
        handler({}, { name: "Test", username: "user", password: "pass" }),
      ).resolves.toBeDefined();
    });

    it("utilise getAllWindows si mainWin est null ou destroyed", async () => {
      vi.resetModules();
      const { registerAccountHandlers } =
        await import("../main/ipc/accountHandlers");

      const mockAllWindows = [
        { webContents: { send: vi.fn() }, isDestroyed: () => false },
      ];
      (BrowserWindow.getAllWindows as any).mockReturnValue(mockAllWindows);

      // getMainWindow retourne null
      const mockAccountService = {
        getAccounts: vi.fn().mockResolvedValue([{ id: "1", name: "Account1" }]),
        addAccount: vi.fn().mockResolvedValue({ id: "new-id" }),
        reorderAccounts: vi.fn().mockResolvedValue(true),
      };

      registerAccountHandlers(() => null, mockAccountService as any);

      const handler = registeredHandlers["add-account"];
      await handler({}, { name: "Test", username: "user", password: "pass" });

      // getAllWindows doit être utilisé
      expect(BrowserWindow.getAllWindows).toHaveBeenCalled();
      expect(mockAllWindows[0].webContents.send).toHaveBeenCalledWith(
        "accounts-updated",
        expect.any(Array),
      );
    });

    it("utilise getAllWindows si mainWin est destroyed", async () => {
      vi.resetModules();
      const { registerAccountHandlers } =
        await import("../main/ipc/accountHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => true, // Destroyed
      } as unknown as BrowserWindow;

      const mockAllWindows = [
        { webContents: { send: vi.fn() }, isDestroyed: () => false },
      ];
      (BrowserWindow.getAllWindows as any).mockReturnValue(mockAllWindows);

      const mockAccountService = {
        getAccounts: vi.fn().mockResolvedValue([{ id: "1", name: "Account1" }]),
        addAccount: vi.fn().mockResolvedValue({ id: "new-id" }),
      };

      registerAccountHandlers(() => mockWindow, mockAccountService as any);

      const handler = registeredHandlers["add-account"];
      await handler({}, { name: "Test", username: "user", password: "pass" });

      expect(mockAllWindows[0].webContents.send).toHaveBeenCalledWith(
        "accounts-updated",
        expect.any(Array),
      );
    });
  });

  describe("reorder-accounts coverage", () => {
    it("appelle reorderAccounts sur le service", async () => {
      const { registerAccountHandlers } =
        await import("../main/ipc/accountHandlers");

      const mockAccountService = {
        getAccounts: vi.fn().mockResolvedValue([]),
        reorderAccounts: vi.fn().mockResolvedValue(true),
      };

      registerAccountHandlers(() => null, mockAccountService as any);

      const handler = registeredHandlers["reorder-accounts"];
      await handler({}, ["2", "1"]);

      expect(mockAccountService.reorderAccounts).toHaveBeenCalledWith([
        "2",
        "1",
      ]);
    });
  });
});
