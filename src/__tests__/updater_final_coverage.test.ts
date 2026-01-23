
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { app, Notification } from "electron";
import { setupUpdater, handleUpdateCheck, simulateUpdateCheck } from "../main/updater";

// Mock Electron
const mockNotification = {
    show: vi.fn(),
    on: vi.fn(),
};

vi.mock("electron", () => ({
    app: {
        isPackaged: true,
        relaunch: vi.fn(),
        exit: vi.fn(),
    },
    Notification: vi.fn().mockImplementation(function () { return mockNotification; }),
    BrowserWindow: vi.fn(),
}));

// Hoist mockEmitter
const { mockEmitter } = vi.hoisted(() => {
    const EventEmitter = require("events").EventEmitter;
    const emitter = new EventEmitter();
    (emitter as any).logger = { transports: { file: { level: "" } } };
    (emitter as any).autoDownload = false;
    (emitter as any).checkForUpdates = vi.fn();
    // We do NOT mock removeAllListeners recursively here to avoid stack overflow
    return { mockEmitter: emitter };
});

vi.mock("electron-updater", () => ({
    autoUpdater: mockEmitter,
    AppUpdater: vi.fn(),
}));

vi.mock("electron-log", () => ({ default: { transports: { file: { level: "" } } } }));
vi.mock("../main/logger", () => ({ devError: vi.fn() }));

describe("Updater Final Coverage (Null MainWindow & Randomness & Edges)", () => {
    let mockWindow: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEmitter.removeAllListeners();
        (app as any).isPackaged = true; // Default to prod
        Object.defineProperty(process, "resourcesPath", {
            value: "C:\\Mock\\Resources",
            configurable: true
        });
        mockWindow = {
            webContents: { send: vi.fn() },
            show: vi.fn(),
            focus: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Null MainWindow Handling", () => {
        it("setupUpdater should not crash when mainWindow is null", () => {
            setupUpdater(null);

            // Trigger all events
            mockEmitter.emit("checking-for-update");
            mockEmitter.emit("update-available", { version: "1.0", releaseNotes: "notes" });
            mockEmitter.emit("update-not-available");
            mockEmitter.emit("error", new Error("test error"));
            mockEmitter.emit("download-progress", { percent: 50, transferred: 100, total: 200 });
            mockEmitter.emit("update-downloaded", { version: "1.0" });

            // If we got here without throwing, it passes.
            // We can also verify notification was shown (since it doesn't depend on mainWindow)
            expect(Notification).toHaveBeenCalledTimes(2);
        });

        it("Notification click causing show/focus on null mainWindow should be safe", () => {
            setupUpdater(null);
            mockEmitter.emit("update-available", { version: "1.0" });

            const clickCallback = (mockNotification.on as any).mock.calls.find((call: any[]) => call[0] === "click")[1];
            expect(() => clickCallback()).not.toThrow();
        });

        it("Notification click (update-downloaded) handling for null mainWindow", () => {
            setupUpdater(null);
            mockEmitter.emit("update-downloaded", { version: "1.0" });

            const clickCallback = (mockNotification.on as any).mock.calls.find((call: any[]) => call[0] === "click")[1];
            expect(() => clickCallback()).not.toThrow();
        });

        it("handleUpdateCheck should be safe with null mainWindow", async () => {
            // Prod mode
            await handleUpdateCheck(null, true);
            expect(mockEmitter.checkForUpdates).toHaveBeenCalled();

            // Error case
            mockEmitter.checkForUpdates.mockRejectedValueOnce(new Error("Test Error"));
            await handleUpdateCheck(null, true);
            // Should not throw and catch block handles it gracefully
        });
    });

    describe("Edge Cases Coverage (Strings & Manual/Auto)", () => {
        it("should handle error without message property (String(err) coverage)", async () => {
            // Line 150 coverage: throwing a string instead of an Error object
            mockEmitter.checkForUpdates.mockRejectedValueOnce("String Error");

            await handleUpdateCheck(mockWindow, true);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
                status: "error",
                details: "String Error"
            }));
        });

        it("should handle 'Invalid Version' in automatic mode (Line 156 false branch)", async () => {
            // Line 156 coverage: isManual = false
            mockEmitter.checkForUpdates.mockRejectedValueOnce(new Error("Invalid Version"));

            await handleUpdateCheck(mockWindow, false);

            // Should NOT send update-status not-available (because that is inside the manual check block)
            // It sends "checking" initially
            expect(mockWindow.webContents.send).toHaveBeenCalledWith("update-status", { status: "checking", isManual: false });

            // And no error or not-available status after rejection
            expect(mockWindow.webContents.send).toHaveBeenCalledTimes(1);
        });
    });

    describe("Dev Simulation Coverage (Randomness)", () => {
        const originalNodeEnv = process.env.NODE_ENV;

        beforeEach(() => {
            (app as any).isPackaged = false; // Dev mode
            process.env.NODE_ENV = "development";
        });

        afterEach(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });

        it("simulateUpdateCheck forces available update (random > 0.5)", async () => {
            vi.spyOn(Math, "random").mockReturnValue(0.6); // > 0.5 => Available

            await simulateUpdateCheck(mockWindow, true);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
                status: "available",
                version: "9.9.9",
                isManual: true
            }));
        });

        it("simulateUpdateCheck forces not-available (random <= 0.5)", async () => {
            vi.spyOn(Math, "random").mockReturnValue(0.4); // <= 0.5 => Not Available

            await simulateUpdateCheck(mockWindow, true);

            expect(mockWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
                status: "not-available",
                isManual: true
            }));
        });
    });
});


