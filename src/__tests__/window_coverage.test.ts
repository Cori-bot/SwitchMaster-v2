
import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, BrowserWindow, Tray, Menu } from "electron";
import * as configModule from "../main/config";
import * as accountsModule from "../main/accounts";

// Mock Electron
const mWin = {
    loadURL: vi.fn(),
    on: vi.fn(),
    webContents: {
        setWindowOpenHandler: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false),
    },
    hide: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    isVisible: vi.fn().mockReturnValue(true),
};

vi.hoisted(() => {
    (process as any).resourcesPath = "C:\\Resources";
});

vi.mock("electron", () => {
    const mockApp = {
        isPackaged: false,
        on: vi.fn(),
        getPath: vi.fn(() => "mock-path"),
        getAppPath: vi.fn(() => "mock-app-path"),
        commandLine: { appendSwitch: vi.fn() },
    };
    const mockTray = vi.fn().mockImplementation(function () {
        return {
            setToolTip: vi.fn(),
            on: vi.fn(),
            setContextMenu: vi.fn(),
        };
    });
    const mockBrowserWindow = vi.fn().mockImplementation(function () {
        return mWin;
    });

    return {
        app: mockApp,
        BrowserWindow: mockBrowserWindow,
        Tray: mockTray,
        Menu: {
            buildFromTemplate: vi.fn().mockReturnValue({}),
        },
        shell: { openExternal: vi.fn() },
        default: {
            app: mockApp,
            BrowserWindow: mockBrowserWindow,
            Tray: mockTray,
            Menu: { buildFromTemplate: vi.fn() },
            shell: { openExternal: vi.fn() },
        }
    };
});

vi.mock("../main/config", () => ({
    getConfig: vi.fn(),
    getPaths: vi.fn(() => ({})),
}));

vi.mock("../main/accounts", () => ({
    loadAccountsMeta: vi.fn(),
    saveAccountsMeta: vi.fn(),
}));

describe("Window Exhaustive Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("creation handles minimizeToTray without showQuitModal (Line 98)", async () => {
        const { createWindow } = await import("../main/window");
        (configModule.getConfig as any).mockReturnValue({
            showQuitModal: false,
            minimizeToTray: true,
        });
        const win = createWindow(true);

        const closeHandler = (win.on as any).mock.calls.find((c: any) => c[0] === "close")[1];
        const event = { preventDefault: vi.fn() };
        closeHandler(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(win.hide).toHaveBeenCalled();
    });

    it("updateTrayMenu and tray interaction coverage", async () => {
        const { createWindow, updateTrayMenu } = await import("../main/window");
        (app as any).isPackaged = true;
        (configModule.getConfig as any).mockReturnValue({ lastAccountId: "ghost" });
        (accountsModule.loadAccountsMeta as any).mockResolvedValue([
            { id: "1", name: "Fav", isFavorite: true }
        ]);

        createWindow(true); // Initialize mainWindow
        await updateTrayMenu(vi.fn(), vi.fn());
        expect(Tray).toHaveBeenCalled();

        const trayInstance = (Tray as any).mock.results[0].value;
        const clickHandler = trayInstance.on.mock.calls.find((c: any) => c[0] === "click")[1];

        // Case visible
        mWin.isVisible.mockReturnValue(true);
        clickHandler();
        expect(mWin.focus).toHaveBeenCalled();

        // Case hidden
        mWin.isVisible.mockReturnValue(false);
        clickHandler();
        expect(mWin.show).toHaveBeenCalled();
    });
});
