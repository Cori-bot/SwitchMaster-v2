
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron BEFORE imports
const mBrowserWindow = {
    loadURL: vi.fn(),
    loadFile: vi.fn().mockResolvedValue(undefined),
    webContents: {
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
        send: vi.fn(),
        getURL: vi.fn().mockReturnValue("http://localhost:3000"),
        isDestroyed: vi.fn().mockReturnValue(false),
        closeDevTools: vi.fn(),
    },
    on: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    isVisible: vi.fn().mockReturnValue(false),
    focus: vi.fn(),
    destroy: vi.fn(),
};

const mTray = {
    setToolTip: vi.fn(),
    on: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: vi.fn(),
};

vi.mock("electron", () => ({
    app: {
        commandLine: { appendSwitch: vi.fn() },
        isPackaged: false,
        getPath: vi.fn().mockReturnValue("userDataPath"),
        quit: vi.fn(),
    },
    BrowserWindow: vi.fn(function () { return mBrowserWindow; }),
    Tray: vi.fn(function () { return mTray; }),
    Menu: { buildFromTemplate: vi.fn((t) => t) },
    shell: { openExternal: vi.fn() },
}));

import { BrowserWindow, Tray } from "electron";
import { createWindow, updateTrayMenu, resetWindowModuleForTests } from "../main/window";
import * as configModule from "../main/config";
import * as accountsModule from "../main/accounts";

vi.mock("../main/config");
vi.mock("../main/accounts");
vi.mock("../main/logger");

describe("Window Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetWindowModuleForTests();
        (configModule.getConfig as any).mockReturnValue({
            showQuitModal: true,
            minimizeToTray: false,
        });
        (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);
    });

    it("should reuse existing Tray instance (Line 119 coverage)", async () => {
        createWindow(true);

        // First call creates tray
        await updateTrayMenu(vi.fn(), vi.fn());
        expect(Tray).toHaveBeenCalledTimes(1);

        // Second call should reuse tray
        await updateTrayMenu(vi.fn(), vi.fn());
        expect(Tray).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should handle close event with isDestroyed check (Lines 95-98)", () => {
        const win = createWindow(false);
        const closeHandler = (win.on as any).mock.calls.find((call: any) => call[0] === "close")[1];

        // Case 1: Not destroyed (Happy path - Enter block)
        (win.webContents.isDestroyed as any).mockReturnValue(false);
        closeHandler({ preventDefault: vi.fn() });
        expect(win.webContents.send).toHaveBeenCalledWith("show-quit-modal");

        vi.clearAllMocks();

        // Case 2: Destroyed (Defensive path - Skip block)
        (win.webContents.isDestroyed as any).mockReturnValue(true);
        closeHandler({ preventDefault: vi.fn() });
        expect(win.webContents.send).not.toHaveBeenCalled();
    });
});
