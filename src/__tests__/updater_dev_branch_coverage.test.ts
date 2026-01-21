
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks
const { mockEmitter } = vi.hoisted(() => {
    const emitter = new (require("events").EventEmitter)();
    (emitter as any).logger = { transports: { file: { level: "" } } };
    (emitter as any).autoDownload = false;
    (emitter as any).checkForUpdates = vi.fn();
    (emitter as any).downloadUpdate = vi.fn();
    (emitter as any).quitAndInstall = vi.fn();
    (emitter as any).on = vi.fn((e, cb) => emitter.addListener(e, cb));
    return { mockEmitter: emitter };
});

// Mock Electron with isPackaged = false to force isDev = true
vi.mock("electron", () => ({
    app: {
        isPackaged: false,
        relaunch: vi.fn(),
        exit: vi.fn(),
    },
    Notification: vi.fn().mockImplementation(function () {
        return { show: vi.fn(), on: vi.fn() };
    }),
    BrowserWindow: vi.fn(),
}));

vi.mock("electron-updater", () => {
    return {
        autoUpdater: mockEmitter,
        AppUpdater: vi.fn(),
    };
});

vi.mock("electron-log", () => ({ default: { transports: { file: { level: "" } } } }));
vi.mock("../main/logger", () => ({ devError: vi.fn() }));

import { downloadUpdate, installUpdate, handleUpdateCheck } from "../main/updater";
import { app } from "electron";

describe("Updater Dev Branch Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("downloadUpdate and installUpdate dev branch coverage", async () => {
        await downloadUpdate();
        expect(mockEmitter.downloadUpdate).not.toHaveBeenCalled();

        installUpdate();
        expect(app.relaunch).toHaveBeenCalled();
        expect(app.exit).toHaveBeenCalled();
    });

    it("handleUpdateCheck uses simulateUpdateCheck in dev (Line 138)", async () => {
        const mw = { webContents: { send: vi.fn() } };
        // This should hit Line 138-139
        await handleUpdateCheck(mw as any, true);

        // checking status should be sent immediately by simulateUpdateCheck
        expect(mw.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "checking" }));

        // Should not call real checkForUpdates
        expect(mockEmitter.checkForUpdates).not.toHaveBeenCalled();
    });
});
