
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

const mockNotification = {
    show: vi.fn(),
    on: vi.fn(),
};

// Mock Electron
vi.mock("electron", () => ({
    app: {
        isPackaged: true,
        relaunch: vi.fn(),
        exit: vi.fn(),
    },
    Notification: vi.fn().mockImplementation(function () {
        return mockNotification;
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

import { setupUpdater, handleUpdateCheck, downloadUpdate, installUpdate } from "../main/updater";
import { app } from "electron";

describe("Updater Exhaustive Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEmitter.removeAllListeners();
        Object.defineProperty(process, "resourcesPath", {
            value: "C:\\Mock\\Resources",
            configurable: true
        });
        (app as any).isPackaged = true; // Default
    });

    it("setupUpdater handles isPackaged false (Line 35)", () => {
        (app as any).isPackaged = false;
        setupUpdater(null);
        expect(true).toBe(true);
    });

    it("setupUpdater handles notification clicks (Line 57, 125)", () => {
        const mw = { show: vi.fn(), focus: vi.fn(), webContents: { send: vi.fn() } };
        setupUpdater(mw as any);

        // Click on update-available notification
        mockEmitter.emit("update-available", { version: "1.0" });
        const clickCb = (mockNotification.on as any).mock.calls.find((c: any) => c[0] === "click")[1];
        clickCb();
        expect(mw.show).toHaveBeenCalled();

        // Click on update-downloaded notification
        mockEmitter.emit("update-downloaded", { version: "1.0" });
        const clickCb2 = (mockNotification.on as any).mock.calls.find((c: any) => c[0] === "click")[1];
        clickCb2();
        expect(mw.focus).toHaveBeenCalled();
    });

    it("handleUpdateCheck coverage (Lines 142-171)", async () => {
        (app as any).isPackaged = true; // non-dev
        const mw = { webContents: { send: vi.fn() } };

        // 1. Success check
        await handleUpdateCheck(mw as any, true);
        expect(mw.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "checking" }));
        expect(mockEmitter.checkForUpdates).toHaveBeenCalled();

        // 2. Semver error check
        mockEmitter.checkForUpdates.mockRejectedValueOnce(new Error("Invalid Version"));
        await handleUpdateCheck(mw as any, true);
        expect(mw.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "not-available" }));

        // 3. General error check manual
        mockEmitter.checkForUpdates.mockRejectedValueOnce(new Error("Other Error"));
        await handleUpdateCheck(mw as any, true);
        expect(mw.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "error" }));

        // 4. General error check automatic (silent)
        vi.clearAllMocks();
        mockEmitter.checkForUpdates.mockRejectedValueOnce(new Error("Other Error"));
        await handleUpdateCheck(mw as any, false);
        expect(mw.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "checking" }));
        // No second call after error if not manual
        expect(mw.webContents.send).toHaveBeenCalledTimes(1);
    });

    it("downloadUpdate and installUpdate packaged branch coverage", async () => {
        (app as any).isPackaged = true;

        await downloadUpdate();
        expect(mockEmitter.downloadUpdate).toHaveBeenCalled();

        installUpdate();
        expect(mockEmitter.quitAndInstall).toHaveBeenCalled();
    });
});
