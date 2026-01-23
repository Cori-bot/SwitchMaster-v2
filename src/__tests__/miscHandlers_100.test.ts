import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, app, BrowserWindow } from "electron";

// Mocks
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
        quit: vi.fn(),
        relaunch: vi.fn(),
        exit: vi.fn(),
    },
    BrowserWindow: vi.fn(),
}));

vi.mock("../main/accounts", () => ({
    loadAccountsMeta: vi.fn().mockResolvedValue([]),
}));

const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn();

vi.mock("../main/config", () => ({
    getConfig: (...args: any[]) => mockGetConfig(...args),
    saveConfig: (...args: any[]) => mockSaveConfig(...args),
}));

vi.mock("../main/updater", () => ({
    handleUpdateCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../main/logger", () => ({
    devLog: vi.fn(),
    devError: vi.fn(),
}));

describe("miscHandlers - Branches manquantes", () => {
    const registeredHandlers: Record<string, Function> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(registeredHandlers).forEach((k) => delete registeredHandlers[k]);

        (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
            registeredHandlers[channel] = handler;
        });

        mockGetConfig.mockReturnValue({});
        mockSaveConfig.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("handle-quit-choice - branches window", () => {
        it("gère quit avec window null", async () => {
            vi.resetModules();
            const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
                getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(false),
                launchGame: vi.fn(),
            };

            registerMiscHandlers(() => null, mockContext);

            const handler = registeredHandlers["handle-quit-choice"];
            const result = await handler({}, { action: "quit", dontShowAgain: false });

            expect(result).toBe(true);
            expect(app.quit).toHaveBeenCalled();
        });

        it("gère minimize avec window destroyed (ligne 94 win?.hide())", async () => {
            vi.resetModules();
            const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: () => true,
                hide: vi.fn(),
                close: vi.fn(),
            } as unknown as BrowserWindow;

            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
                getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(false),
                launchGame: vi.fn(),
            };

            registerMiscHandlers(() => mockWindow, mockContext);

            const handler = registeredHandlers["handle-quit-choice"];
            const result = await handler({}, { action: "minimize", dontShowAgain: false });

            expect(result).toBe(true);
            // hide est appelé via optional chaining
        });

        it("gère dontShowAgain avec quit et ferme fenêtre non-destroyed", async () => {
            vi.resetModules();
            const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: () => false,
                hide: vi.fn(),
                close: vi.fn(),
            } as unknown as BrowserWindow;

            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
                getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(false),
                launchGame: vi.fn(),
            };

            registerMiscHandlers(() => mockWindow, mockContext);

            const handler = registeredHandlers["handle-quit-choice"];
            const result = await handler({}, { action: "quit", dontShowAgain: true });

            expect(result).toBe(true);
            expect(mockWindow.close).toHaveBeenCalled();
            expect(app.quit).toHaveBeenCalled();
        });

        it("envoie config-updated pour minimize avec dontShowAgain", async () => {
            vi.resetModules();
            const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: () => false,
                hide: vi.fn(),
                close: vi.fn(),
            } as unknown as BrowserWindow;

            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
                getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(false),
                launchGame: vi.fn(),
            };

            registerMiscHandlers(() => mockWindow, mockContext);

            const handler = registeredHandlers["handle-quit-choice"];
            await handler({}, { action: "minimize", dontShowAgain: true });

            // Doit envoyer config-updated car action !== "quit" et fenêtre non détruite
            expect(mockWindow.webContents.send).toHaveBeenCalledWith(
                "config-updated",
                expect.any(Object)
            );
        });
    });

    describe("get-status branches", () => {
        it("retourne status sans enrichissement si status !== Active", async () => {
            vi.resetModules();
            const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
                getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(false),
                launchGame: vi.fn(),
            };

            registerMiscHandlers(() => null, mockContext);

            const handler = registeredHandlers["get-status"];
            const result = await handler({});

            expect(result.status).toBe("Idle");
            expect(result.accountName).toBeUndefined();
        });
    });
});
