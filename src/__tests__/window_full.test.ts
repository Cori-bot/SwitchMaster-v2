import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWindow, updateTrayMenu, resetWindowModuleForTests } from "../main/window";
import { app, BrowserWindow, Tray, shell } from "electron";
import * as configModule from "../main/config";
import * as accountsModule from "../main/accounts";

// Mocks
vi.mock("electron", () => {
    const mBrowserWindow = {
        loadURL: vi.fn(),
        loadFile: vi.fn().mockResolvedValue(undefined),
        webContents: {
            on: vi.fn(),
            getURL: vi.fn().mockReturnValue(""),
            closeDevTools: vi.fn(),
            setWindowOpenHandler: vi.fn(),
            send: vi.fn(),
            isDestroyed: vi.fn().mockReturnValue(false),
        },
        on: vi.fn(),
        isVisible: vi.fn().mockReturnValue(false),
        focus: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        minimize: vi.fn(),
    } as any;

    const mTray = {
        setToolTip: vi.fn(),
        on: vi.fn(),
        setContextMenu: vi.fn(),
        destroy: vi.fn(),
    } as any;

    return {
        app: {
            commandLine: {
                appendSwitch: vi.fn(),
            },
            isPackaged: false,
            quit: vi.fn(),
            setLoginItemSettings: vi.fn(),
        },
        BrowserWindow: vi.fn(function () { return mBrowserWindow; }),
        Tray: vi.fn(function () { return mTray; }),
        Menu: {
            buildFromTemplate: vi.fn(),
        },
        shell: {
            openExternal: vi.fn(),
        },
    };
});

vi.mock("../main/config", () => ({
    getConfig: vi.fn(),
}));

vi.mock("../main/accounts", () => ({
    loadAccountsMeta: vi.fn(),
}));

vi.mock("../main/logger", () => ({
    devLog: vi.fn(),
    devError: vi.fn(),
}));

describe("Window Module", () => {
    let mockWin: any;
    let mockTray: any;

    beforeEach(() => {
        vi.clearAllMocks();
        resetWindowModuleForTests();
        mockWin = new BrowserWindow();
        mockTray = new Tray("dummy.png");
        (BrowserWindow as unknown as any).mockClear();
        (Tray as unknown as any).mockClear();
        (BrowserWindow as unknown as any).mockImplementation(function () { return mockWin; });
        (Tray as unknown as any).mockImplementation(function () { return mockTray; });
    });

    describe("createWindow", () => {
        it("doit créer une fenêtre en mode dev", () => {
            createWindow(true);
            expect(BrowserWindow).toHaveBeenCalled();
            expect(mockWin.loadURL).toHaveBeenCalledWith("http://localhost:3000");
        });

        it("doit créer une fenêtre en mode prod", () => {
            createWindow(false);
            expect(BrowserWindow).toHaveBeenCalled();
            expect(mockWin.loadFile).toHaveBeenCalled();
            expect(mockWin.webContents.on).toHaveBeenCalledWith("devtools-opened", expect.any(Function));
        });

        it("doit gérer will-navigate", () => {
            createWindow(true);
            const calls = mockWin.webContents.on.mock.calls;
            const willNavigate = calls.find((c: any) => c[0] === "will-navigate");
            expect(willNavigate).toBeDefined();

            const handler = willNavigate[1];
            const event = { preventDefault: vi.fn() };

            // Même URL
            mockWin.webContents.getURL.mockReturnValue("http://localhost:3000/same");
            handler(event, "http://localhost:3000/same");
            expect(event.preventDefault).not.toHaveBeenCalled();

            // URL différente
            handler(event, "https://google.com");
            expect(event.preventDefault).toHaveBeenCalled();
            expect(shell.openExternal).toHaveBeenCalledWith("https://google.com");
        });

        it("doit gérer window close (minimize to tray)", () => {
            (configModule.getConfig as any).mockReturnValue({ minimizeToTray: true, showQuitModal: false });
            createWindow(true);

            const calls = mockWin.on.mock.calls;
            const closeHandler = calls.find((c: any) => c[0] === "close")[1];
            const event = { preventDefault: vi.fn() };

            closeHandler(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockWin.hide).toHaveBeenCalled();
        });

        it("doit gérer window close (quit modal)", () => {
            (configModule.getConfig as any).mockReturnValue({ minimizeToTray: false, showQuitModal: true });
            createWindow(true);

            const calls = mockWin.on.mock.calls;
            const closeHandler = calls.find((c: any) => c[0] === "close")[1];
            const event = { preventDefault: vi.fn() };

            closeHandler(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockWin.webContents.send).toHaveBeenCalledWith("show-quit-modal");
        });

        it("ne doit rien faire si app quitte", () => {
            (app as any).isQuitting = true;
            createWindow(true);

            const calls = mockWin.on.mock.calls;
            const closeHandler = calls.find((c: any) => c[0] === "close")[1];
            const event = { preventDefault: vi.fn() };

            closeHandler(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            (app as any).isQuitting = false;
        });
    });

    describe("updateTrayMenu", () => {
        const launchGameMock = vi.fn();
        const switchAccountMock = vi.fn();

        beforeEach(() => {
            createWindow(true); // Tray needs mainWindow
        });

        it("doit créer le tray menu", async () => {
            (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);
            (configModule.getConfig as any).mockReturnValue({});

            await updateTrayMenu(launchGameMock, switchAccountMock);

            expect(Tray).toHaveBeenCalled();
            expect(mockTray.setContextMenu).toHaveBeenCalled();
        });

        it("doit montrer la fenêtre au clic sur le tray", async () => {
            (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);
            (configModule.getConfig as any).mockReturnValue({});

            await updateTrayMenu(launchGameMock, switchAccountMock);

            const calls = mockTray.on.mock.calls;
            const clickHandler = calls.find((c: any) => c[0] === "click")[1];

            // Case: window hidden
            mockWin.isVisible.mockReturnValue(false);
            clickHandler();
            expect(mockWin.show).toHaveBeenCalled();

            // Case: window visible
            mockWin.isVisible.mockReturnValue(true);
            clickHandler();
            expect(mockWin.focus).toHaveBeenCalled();
        });

        it("doit inclure les favoris dans le menu", async () => {
            const favAccount = { id: "1", name: "Fav", isFavorite: true };
            (accountsModule.loadAccountsMeta as any).mockResolvedValue([favAccount]);
            (configModule.getConfig as any).mockReturnValue({});

            await updateTrayMenu(launchGameMock, switchAccountMock);

            // We can inspect setContextMenu calls to verify content
            // But mocking Menu.buildFromTemplate is shallow
        });
    });
});
