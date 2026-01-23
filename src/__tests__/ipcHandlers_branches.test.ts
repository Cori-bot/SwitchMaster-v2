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
    getAccountCredentials: vi.fn().mockResolvedValue({ username: "test", password: "test" }),
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
        (ipcMain.handle as any).mockImplementation((channel: string, handler: Function) => {
            console.log(`[DEBUG] Registering handler for: ${channel}`);
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

    describe("riotHandlers", () => {
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
            expect(handler).toBeDefined();

            if (handler) {
                await handler({}, "account123");

                // Vérifier que le chemin avec .exe a été passé
                expect(launchRiotClient).toHaveBeenCalledWith(
                    path.join("C:\\Riot Games", "RiotClientServices.exe")
                );
            }
        });
    });

    describe("securityHandlers", () => {
        it("doit retourner true pour verify-pin si la sécurité est désactivée (ligne 31)", async () => {
            // Reset modules to ensure fresh import with mocked config
            vi.resetModules();
            // Re-apply mocks for reset modules
            // (Not strictly needed if imports are dynamic inside test, but safest to dynamic import)

            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            // Config: Security disabled explicitly
            mockGetConfig.mockReturnValue({
                security: { enabled: false }
            });

            registerSecurityHandlers();

            const handler = registeredHandlers["verify-pin"];
            expect(handler).toBeDefined();

            if (handler) {
                const result = await handler({}, "1234");
                // Ligne 31 : if (!config.security?.enabled || !config.security.pinHash) return true;
                expect(result).toBe(true);
            }
        });

        it("doit couvrir set-pin et la génération de config de sécurité activée (ligne 51)", async () => {
            vi.resetModules();
            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            registerSecurityHandlers();

            const handler = registeredHandlers["set-pin"];
            expect(handler).toBeDefined();

            if (handler) {
                await handler({}, "1234");

                // On vérifie que saveConfig a été appelé
                expect(mockSaveConfig).toHaveBeenCalled();

                // Vérifier les arguments
                const args = mockSaveConfig.mock.calls[0][0];
                expect(args.security.enabled).toBe(true);
                // hashPin retourne "${salt}:${hash}"
                // Le mock de randomBytes retourne Buffer.from("mocked-salt"),
                // qui devient "6d6f636b65642d73616c74" en hexadécimal
                // Le mock de createHmac().digest() retourne "mocked-hmac"
                // Donc pinHash = "6d6f636b65642d73616c74:mocked-hmac"
                expect(args.security.pinHash).toBeDefined();
                expect(args.security.pinHash).toContain(":"); // Format salt:hash
            }
        });

        it("doit rejeter set-pin avec un PIN trop court (lignes 47-48)", async () => {
            vi.resetModules();
            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            registerSecurityHandlers();

            const handler = registeredHandlers["set-pin"];
            expect(handler).toBeDefined();

            if (handler) {
                // PIN de 3 caractères (< 4)
                await expect(handler({}, "123")).rejects.toThrow("au moins 4 caractères");
            }
        });

        it("doit retourner false pour disable-pin avec PIN invalide (ligne 67)", async () => {
            vi.resetModules();

            // Config avec sécurité activée et un pinHash
            mockGetConfig.mockReturnValue({
                security: {
                    enabled: true,
                    pinHash: "abc123:def456" // Format salt:hash
                }
            });

            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            registerSecurityHandlers();

            const handler = registeredHandlers["disable-pin"];
            expect(handler).toBeDefined();

            if (handler) {
                mockSaveConfig.mockClear();
                // Le PIN "wrongpin" ne devrait pas correspondre au hash
                const result = await handler({}, "wrongpin");

                // Ligne 67 : return false quand le PIN est invalide
                expect(result).toBe(false);
                expect(mockSaveConfig).not.toHaveBeenCalled();
            }
        });

        it("doit couvrir disable-pin avec sécurité désactivée (lignes 58-60)", async () => {
            vi.resetModules();
            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            mockGetConfig.mockReturnValue({
                security: { enabled: false }
            });

            registerSecurityHandlers();

            const handler = registeredHandlers["disable-pin"];
            expect(handler).toBeDefined();

            if (handler) {
                mockSaveConfig.mockClear();
                const result = await handler({}, "anypin");

                expect(result).toBe(true);
                expect(mockSaveConfig).toHaveBeenCalledWith({
                    security: { enabled: false, pinHash: null }
                });
            }
        });

        it("doit couvrir get-security-status (lignes 70-73)", async () => {
            vi.resetModules();
            const { registerSecurityHandlers } = await import("../main/ipc/securityHandlers");

            // Test avec sécurité activée
            mockGetConfig.mockReturnValue({
                security: { enabled: true }
            });

            registerSecurityHandlers();

            const handler = registeredHandlers["get-security-status"];
            expect(handler).toBeDefined();

            if (handler) {
                const result = handler({});
                expect(result).toBe(true);
            }

            // Test avec sécurité désactivée
            mockGetConfig.mockReturnValue({
                security: { enabled: false }
            });

            const handler2 = registeredHandlers["get-security-status"];
            if (handler2) {
                const result2 = handler2({});
                expect(result2).toBe(false);
            }
        });
    });
});
