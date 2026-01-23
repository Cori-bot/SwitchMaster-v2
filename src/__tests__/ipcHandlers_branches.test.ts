import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import path from "path";
import crypto from "crypto";

// Mock electron modules
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
    setLoginItemSettings: vi.fn(),
    quit: vi.fn(),
    relaunch: vi.fn(),
    exit: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

// Mock crypto pour avoir un comportement prédictif
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  const mockedCrypto = {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from("mocked-salt")),
    pbkdf2Sync: vi.fn().mockReturnValue(Buffer.from("mocked-hash")),
    createHmac: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue("mocked-hmac"),
    }),
  };
  return {
    ...mockedCrypto,
    default: mockedCrypto,
  };
});

// Mock dependencies
vi.mock("../main/accounts", () => ({
  loadAccountsMeta: vi.fn().mockResolvedValue([]),
  getAccountCredentials: vi
    .fn()
    .mockResolvedValue({ username: "test", password: "test" }),
}));

// Mock config dynamique
const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn().mockResolvedValue(undefined);

vi.mock("../main/config", () => ({
  getConfig: (...args: any[]) => mockGetConfig(...args),
  saveConfig: (...args: any[]) => mockSaveConfig(...args),
}));

vi.mock("../main/automation", () => ({
  killRiotProcesses: vi.fn().mockResolvedValue(undefined),
  launchRiotClient: vi.fn().mockResolvedValue(undefined),
  performAutomation: vi.fn().mockResolvedValue(undefined),
  autoDetectPaths: vi.fn().mockResolvedValue({ riotPath: "/detected/path" }),
}));

vi.mock("../main/updater", () => ({
  handleUpdateCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../main/logger", () => ({
  devLog: vi.fn(),
  devError: vi.fn(),
}));

describe("IPC Handlers - Full Coverage", () => {
  // Capturer les handlers enregistrés
  const registeredHandlers: Record<string, Function> = {};
  const registeredListeners: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();

    // Config par défaut
    mockGetConfig.mockReturnValue({
      riotPath: "C:\\Riot Games",
      security: { enabled: false },
    });

    // Capturer les appels ipcMain.handle
    (ipcMain.handle as any).mockImplementation(
      (channel: string, handler: Function) => {
        console.log(`[DEBUG] Registering handler for: ${channel}`);
        registeredHandlers[channel] = handler;
      },
    );

    // Capturer les appels ipcMain.on
    (ipcMain.on as any).mockImplementation(
      (channel: string, handler: Function) => {
        registeredListeners[channel] = handler;
      },
    );
  });

  afterEach(() => {
    Object.keys(registeredHandlers).forEach(
      (key) => delete registeredHandlers[key],
    );
    Object.keys(registeredListeners).forEach(
      (key) => delete registeredListeners[key],
    );
  });

  describe("miscHandlers", () => {
    it("doit enregistrer le listener log-to-main", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");
      const { devLog } = await import("../main/logger");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn(() => false),
        hide: vi.fn(),
        close: vi.fn(),
        minimize: vi.fn(),
      } as unknown as BrowserWindow;

      const mockContext = {
        getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
        getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn().mockResolvedValue(false),
        launchGame: vi.fn().mockResolvedValue(undefined),
      };

      registerMiscHandlers(
        () => mockWindow,
        mockContext,
        { getAccounts: vi.fn().mockResolvedValue([]) } as any,
        { getConfig: vi.fn(), saveConfig: vi.fn() } as any,
      );

      // Vérifier que log-to-main a été enregistré
      expect(ipcMain.on).toHaveBeenCalledWith(
        "log-to-main",
        expect.any(Function),
      );

      // Appeler le listener manuellement pour couvrir les lignes 28-29
      const logHandler = registeredListeners["log-to-main"];
      if (logHandler) {
        logHandler({}, { level: "info", args: ["test message"] });
        expect(devLog).toHaveBeenCalledWith("[Renderer INFO]", "test message");
      }
    });

    it("doit gérer check-updates sans window (ligne 53)", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");
      const { handleUpdateCheck } = await import("../main/updater");

      const mockContext = {
        getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
        getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn().mockResolvedValue(false),
        launchGame: vi.fn().mockResolvedValue(undefined),
      };

      // getMainWindow retourne null
      registerMiscHandlers(
        () => null,
        mockContext,
        { getAccounts: vi.fn().mockResolvedValue([]) } as any,
        { getConfig: vi.fn(), saveConfig: vi.fn() } as any,
      );

      // Appeler check-updates
      const handler = registeredHandlers["check-updates"];
      if (handler) {
        const result = await handler({});
        expect(result).toBe(true);
        // handleUpdateCheck ne doit pas être appelé car win est null
        expect(handleUpdateCheck).not.toHaveBeenCalled();
      }
    });
  });

  describe("riotHandlers", () => {
    it("doit déléguer switch-account au SessionService", async () => {
      const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: vi.fn(() => false),
      } as unknown as BrowserWindow;

      const mockLaunchGame = vi.fn();
      const mockGetStatus = vi
        .fn()
        .mockResolvedValue({ status: "Active", accountId: "1" });

      const mockSessionService = {
        switchAccount: vi.fn().mockResolvedValue(true),
      };

      registerRiotHandlers(
        () => mockWindow,
        mockLaunchGame,
        mockGetStatus,
        mockSessionService as any,
        { autoDetectPaths: vi.fn() } as any,
      );

      // Appeler switch-account
      const handler = registeredHandlers["switch-account"];
      expect(handler).toBeDefined();

      if (handler) {
        await handler({}, "account123");

        expect(mockSessionService.switchAccount).toHaveBeenCalledWith(
          "account123",
        );
        expect(mockGetStatus).toHaveBeenCalled();
        expect(mockWindow.webContents.send).toHaveBeenCalledWith(
          "status-updated",
          { status: "Active", accountId: "1" },
        );
      }
    });
  });

  describe("securityHandlers", () => {
    it("doit déléguer verify-pin au service", async () => {
      vi.resetModules();
      const { registerSecurityHandlers } =
        await import("../main/ipc/securityHandlers");

      const mockSecurityService = {
        verifyPin: vi.fn().mockResolvedValue(true),
        setPin: vi.fn(),
        disablePin: vi.fn(),
        isEnabled: vi.fn(),
      };

      registerSecurityHandlers(mockSecurityService as any);

      const handler = registeredHandlers["verify-pin"];
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({}, "1234");
        expect(result).toBe(true);
        expect(mockSecurityService.verifyPin).toHaveBeenCalledWith("1234");
      }
    });

    it("doit déléguer set-pin au service", async () => {
      vi.resetModules();
      const { registerSecurityHandlers } =
        await import("../main/ipc/securityHandlers");

      const mockSecurityService = {
        verifyPin: vi.fn(),
        setPin: vi.fn().mockResolvedValue(true),
        disablePin: vi.fn(),
        isEnabled: vi.fn(),
      };

      registerSecurityHandlers(mockSecurityService as any);

      const handler = registeredHandlers["set-pin"];
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({}, "1234");
        expect(result).toBe(true);
        expect(mockSecurityService.setPin).toHaveBeenCalledWith("1234");
      }
    });

    it("doit déléguer disable-pin au service", async () => {
      vi.resetModules();
      const { registerSecurityHandlers } =
        await import("../main/ipc/securityHandlers");

      const mockSecurityService = {
        verifyPin: vi.fn(),
        setPin: vi.fn(),
        disablePin: vi.fn().mockResolvedValue(true),
        isEnabled: vi.fn(),
      };

      registerSecurityHandlers(mockSecurityService as any);

      const handler = registeredHandlers["disable-pin"];
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({}, "1234");
        expect(result).toBe(true);
        expect(mockSecurityService.disablePin).toHaveBeenCalledWith("1234");
      }
    });

    it("doit déléguer get-security-status au service", async () => {
      vi.resetModules();
      const { registerSecurityHandlers } =
        await import("../main/ipc/securityHandlers");

      const mockSecurityService = {
        verifyPin: vi.fn(),
        setPin: vi.fn(),
        disablePin: vi.fn(),
        isEnabled: vi.fn().mockReturnValue(true),
      };

      registerSecurityHandlers(mockSecurityService as any);

      const handler = registeredHandlers["get-security-status"];
      expect(handler).toBeDefined();

      if (handler) {
        const result = handler({});
        expect(result).toBe(true);
        expect(mockSecurityService.isEnabled).toHaveBeenCalled();
      }
    });
  });
});
