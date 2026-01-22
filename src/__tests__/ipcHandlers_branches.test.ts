import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, dialog, app, BrowserWindow } from "electron";
import path from "path";

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

// Mock dependencies
vi.mock("../main/accounts", () => ({
    loadAccountsMeta: vi.fn().mockResolvedValue([]),
    getAccountCredentials: vi.fn().mockResolvedValue({ username: "test", password: "test" }),
}));

vi.mock("../main/config", () => ({
    getConfig: vi.fn(() => ({
        riotPath: "C:\\Riot Games",
        security: { enabled: false },
    })),
    saveConfig: vi.fn().mockResolvedValue(undefined),
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

        // Capturer les appels ipcMain.handle
        (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
            registeredHandlers[channel] = handler;
        });

        // Capturer les appels ipcMain.on
        (ipcMain.on as any).mockImplementation((channel: string, handler: Function) => {
            registeredListeners[channel] = handler;
        });
    });

    afterEach(() => {
        Object.keys(registeredHandlers).forEach(key => delete registeredHandlers[key]);
        Object.keys(registeredListeners).forEach(key => delete registeredListeners[key]);
    });

    describe("miscHandlers - lignes 28-29", () => {
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

            registerMiscHandlers(() => mockWindow, mockContext);

            // Vérifier que log-to-main a été enregistré
            expect(ipcMain.on).toHaveBeenCalledWith("log-to-main", expect.any(Function));

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
            registerMiscHandlers(() => null, mockContext);

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

    describe("riotHandlers - lignes 34-40", () => {
        it("doit ajouter le .exe si le chemin n'en contient pas (lignes 34-35)", async () => {
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");
            const { launchRiotClient } = await import("../main/automation");

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: vi.fn(() => false),
            } as unknown as BrowserWindow;

            const mockLaunchGame = vi.fn();
            const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active", accountId: "1" });

            registerRiotHandlers(() => mockWindow, mockLaunchGame, mockGetStatus);

            // Appeler switch-account
            const handler = registeredHandlers["switch-account"];
            if (handler) {
                await handler({}, "account123");

                // Vérifier que le chemin avec .exe a été passé
                expect(launchRiotClient).toHaveBeenCalledWith(
                    path.join("C:\\Riot Games", "RiotClientServices.exe")
                );
            }
        });
    });
});
