import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
    (process as any).resourcesPath = "C:\\Resources";
});

const { mockWin, handlers } = vi.hoisted(() => {
    const m = {
        minimize: vi.fn(),
        hide: vi.fn(),
        close: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: { send: vi.fn() }
    };
    return {
        mockWin: m,
        handlers: {} as Record<string, Function>
    };
});

// Mock Electron
vi.mock("electron", () => {
    function MockBW() { return mockWin; }
    (MockBW as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

    return {
        app: {
            getPath: vi.fn().mockReturnValue("userDataPath"),
            isPackaged: true,
            getVersion: vi.fn().mockReturnValue("1.0.0"),
            quit: vi.fn(),
            relaunch: vi.fn(),
            exit: vi.fn(),
        },
        ipcMain: {
            handle: vi.fn(),
            on: vi.fn(),
            removeAllListeners: vi.fn()
        },
        BrowserWindow: MockBW,
        dialog: {
            showOpenDialog: vi.fn()
        },
        shell: { openExternal: vi.fn() },
    };
});

// Mock utils pour capturer les handlers
vi.mock("../main/ipc/utils", () => ({
    safeHandle: vi.fn((name, fn) => { handlers[name] = fn; }),
    safeOn: vi.fn((name, fn) => { handlers[name] = fn; }),
}));

vi.mock("../main/accounts", () => ({
    loadAccountsMeta: vi.fn().mockResolvedValue([]),
}));

vi.mock("../main/config", () => ({
    getConfig: vi.fn().mockReturnValue({}),
    saveConfig: vi.fn(),
}));

vi.mock("../main/updater", () => ({
    handleUpdateCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../main/logger");

import { registerMiscHandlers } from "../main/ipc/miscHandlers";
import { dialog, app } from "electron";
import * as accountsModule from "../main/accounts";
import * as configModule from "../main/config";

describe("MiscHandlers Extended Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWin.isDestroyed.mockReturnValue(false);
    });

    describe("select-account-image", () => {
        it("doit retourner null si dialog est annulé", async () => {
            (dialog.showOpenDialog as any).mockResolvedValue({ canceled: true, filePaths: [] });

            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };
            registerMiscHandlers(() => mockWin as any, mockContext as any);

            const result = await handlers["select-account-image"]();
            expect(result).toBeNull();
        });

        it("doit retourner le chemin si dialog réussit", async () => {
            (dialog.showOpenDialog as any).mockResolvedValue({ canceled: false, filePaths: ["/path/to/image.png"] });

            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };
            registerMiscHandlers(() => mockWin as any, mockContext as any);

            const result = await handlers["select-account-image"]();
            expect(result).toBe("/path/to/image.png");
        });

        it("doit retourner null si pas de fenêtre principale", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };
            registerMiscHandlers(() => null, mockContext as any);

            const result = await handlers["select-account-image"]();
            expect(result).toBeNull();
        });
    });

    describe("get-status", () => {
        it("doit enrichir le statut avec le nom du compte si trouvé", async () => {
            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Active", accountId: "acc-1" }),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            (accountsModule.loadAccountsMeta as any).mockResolvedValue([
                { id: "acc-1", name: "MonCompte" }
            ]);

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            const result = await handlers["get-status"]();
            expect(result.accountName).toBe("MonCompte");
        });

        it("doit retourner le statut sans nom si compte non trouvé", async () => {
            const mockContext = {
                getStatus: vi.fn().mockResolvedValue({ status: "Active", accountId: "acc-unknown" }),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            const result = await handlers["get-status"]();
            expect(result.accountName).toBeUndefined();
        });
    });

    describe("check-updates", () => {
        it("ne doit rien faire si pas de fenêtre principale", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => null, mockContext as any);

            const result = await handlers["check-updates"]();
            expect(result).toBe(true);
        });
    });

    describe("handle-quit-choice", () => {
        it("doit gérer saveConfig error gracieusement", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            (configModule.saveConfig as any).mockRejectedValue(new Error("Save failed"));

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            // Ne doit pas throw
            const result = await handlers["handle-quit-choice"](null, { action: "minimize", dontShowAgain: true });
            expect(result).toBe(true);
        });

        it("doit cacher la fenêtre en mode minimize", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            await handlers["handle-quit-choice"](null, { action: "minimize", dontShowAgain: false });
            expect(mockWin.hide).toHaveBeenCalled();
        });

        it("doit quitter l'app en mode quit", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            await handlers["handle-quit-choice"](null, { action: "quit", dontShowAgain: false });
            expect(app.quit).toHaveBeenCalled();
        });
    });

    describe("close-app", () => {
        it("doit appeler app.quit", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            handlers["close-app"]();
            expect(app.quit).toHaveBeenCalled();
        });
    });

    describe("minimize-app", () => {
        it("doit minimiser la fenêtre", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            handlers["minimize-app"]();
            expect(mockWin.minimize).toHaveBeenCalled();
        });
    });

    describe("restart-app", () => {
        it("doit relancer et quitter l'app", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn()
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            handlers["restart-app"]();
            expect(app.relaunch).toHaveBeenCalled();
            expect(app.exit).toHaveBeenCalled();
        });
    });

    describe("is-valorant-running", () => {
        it("doit appeler context.isValorantRunning", async () => {
            const mockContext = {
                getStatus: vi.fn(),
                getAutoStartStatus: vi.fn(),
                setAutoStart: vi.fn(),
                isValorantRunning: vi.fn().mockResolvedValue(true)
            };

            registerMiscHandlers(() => mockWin as any, mockContext as any);

            const result = await handlers["is-valorant-running"]();
            expect(mockContext.isValorantRunning).toHaveBeenCalled();
        });
    });
});
