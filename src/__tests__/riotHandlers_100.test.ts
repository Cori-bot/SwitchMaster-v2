import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, dialog, BrowserWindow } from "electron";
import path from "path";

// Mock electron
vi.mock("electron", () => ({
    ipcMain: {
        handle: vi.fn(),
        removeHandler: vi.fn(),
    },
    dialog: {
        showOpenDialog: vi.fn(),
    },
    BrowserWindow: vi.fn(),
}));

// Mock config
const mockGetConfig = vi.fn();
const mockSaveConfig = vi.fn().mockResolvedValue(undefined);

vi.mock("../main/config", () => ({
    getConfig: (...args: any[]) => mockGetConfig(...args),
    saveConfig: (...args: any[]) => mockSaveConfig(...args),
}));

// Mock accounts
vi.mock("../main/accounts", () => ({
    getAccountCredentials: vi.fn().mockResolvedValue({
        username: "testuser",
        password: "testpass",
    }),
}));

// Mock automation
vi.mock("../main/automation", () => ({
    killRiotProcesses: vi.fn().mockResolvedValue(undefined),
    launchRiotClient: vi.fn().mockResolvedValue(undefined),
    performAutomation: vi.fn().mockResolvedValue(undefined),
    autoDetectPaths: vi.fn().mockResolvedValue({ riotPath: "/detected" }),
}));

describe("riotHandlers - Couverture 100%", () => {
    const registeredHandlers: Record<string, Function> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(registeredHandlers).forEach((k) => delete registeredHandlers[k]);

        (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
            registeredHandlers[channel] = handler;
        });

        mockGetConfig.mockReturnValue({
            riotPath: "C:\\Riot Games\\RiotClientServices.exe",
        });
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe("select-riot-path", () => {
        it("retourne null quand l'utilisateur annule le dialog", async () => {
            vi.resetModules();
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

            (dialog.showOpenDialog as any).mockResolvedValue({
                canceled: true,
                filePaths: [],
            });

            registerRiotHandlers(() => null, vi.fn(), vi.fn());

            const handler = registeredHandlers["select-riot-path"];
            expect(handler).toBeDefined();

            const result = await handler({});
            expect(result).toBe(null);
        });

        it("retourne le chemin quand l'utilisateur sélectionne un fichier", async () => {
            vi.resetModules();
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

            (dialog.showOpenDialog as any).mockResolvedValue({
                canceled: false,
                filePaths: ["C:\\Path\\To\\RiotClientServices.exe"],
            });

            registerRiotHandlers(() => null, vi.fn(), vi.fn());

            const handler = registeredHandlers["select-riot-path"];
            const result = await handler({});
            expect(result).toBe("C:\\Path\\To\\RiotClientServices.exe");
        });
    });

    describe("switch-account", () => {
        it("utilise le chemin .exe directement s'il existe déjà", async () => {
            vi.resetModules();
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");
            const { launchRiotClient } = await import("../main/automation");

            // Config avec chemin .exe
            mockGetConfig.mockReturnValue({
                riotPath: "C:\\Riot\\RiotClientServices.exe",
            });

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: () => false,
            } as unknown as BrowserWindow;

            const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });

            registerRiotHandlers(() => mockWindow, vi.fn(), mockGetStatus);

            const handler = registeredHandlers["switch-account"];
            await handler({}, "account-id-123");

            // Le chemin doit être utilisé tel quel (pas de join avec .exe)
            expect(launchRiotClient).toHaveBeenCalledWith("C:\\Riot\\RiotClientServices.exe");
        });

        it("ne notifie pas si la fenêtre est destroyed", async () => {
            vi.resetModules();
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

            mockGetConfig.mockReturnValue({
                riotPath: "C:\\Riot\\RiotClientServices.exe",
            });

            const mockWindow = {
                webContents: { send: vi.fn() },
                isDestroyed: () => true, // Fenêtre détruite
            } as unknown as BrowserWindow;

            const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });

            registerRiotHandlers(() => mockWindow, vi.fn(), mockGetStatus);

            const handler = registeredHandlers["switch-account"];
            const result = await handler({}, "account-id-123");

            // Ne doit pas envoyer de notification car isDestroyed = true
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
            expect(result).toEqual({ success: true, id: "account-id-123" });
        });

        it("ne notifie pas si la fenêtre est null", async () => {
            vi.resetModules();
            const { registerRiotHandlers } = await import("../main/ipc/riotHandlers");

            mockGetConfig.mockReturnValue({
                riotPath: "C:\\Riot\\RiotClientServices.exe",
            });

            const mockGetStatus = vi.fn().mockResolvedValue({ status: "Active" });

            // getWin retourne null
            registerRiotHandlers(() => null, vi.fn(), mockGetStatus);

            const handler = registeredHandlers["switch-account"];
            const result = await handler({}, "account-id-123");

            // Succès sans notification car win est null
            expect(result).toEqual({ success: true, id: "account-id-123" });
        });
    });
});
