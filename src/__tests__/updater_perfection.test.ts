import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupUpdater, handleUpdateCheck } from "../main/updater";
import { autoUpdater } from "electron-updater";
import { app, Notification, BrowserWindow } from "electron";

// Robust path mock
vi.mock("path", () => {
    const mockPath = {
        join: vi.fn((...args) => args.join("/")),
        resolve: vi.fn((...args) => args.join("/")),
    };
    return {
        default: mockPath,
        ...mockPath
    };
});

vi.mock("electron", () => {
    const mockNotification = {
        show: vi.fn(),
        on: vi.fn(),
    };
    return {
        app: {
            isPackaged: true,
            relaunch: vi.fn(),
            exit: vi.fn(),
            resourcesPath: "C:/mock",
        },
        Notification: vi.fn().mockImplementation(function () { return mockNotification; }),
        BrowserWindow: vi.fn(),
    };
});

vi.mock("electron-updater", async () => {
    const EventEmitter = await import("events").then(m => m.EventEmitter);
    const emitter = new EventEmitter();
    (emitter as any).logger = { transports: { file: { level: "" } } };
    (emitter as any).checkForUpdates = vi.fn();
    (emitter as any).quitAndInstall = vi.fn();
    return { autoUpdater: emitter };
});

vi.mock("../main/logger", () => ({ devError: vi.fn() }));

describe("Updater Perfect Branches", () => {
    const mockAU = autoUpdater as any;
    const mockNotif = (new (Notification as any)() as any);

    beforeEach(() => {
        vi.clearAllMocks();
        mockAU.removeAllListeners();
    });

    it("covers basics and triggers", async () => {
        const win = {
            webContents: { send: vi.fn() },
            show: vi.fn(),
            focus: vi.fn(),
            on: vi.fn(),
            once: vi.fn(),
        } as unknown as BrowserWindow;

        setupUpdater(win);

        mockAU.emit("update-available", { version: "1.0" });
        const calls = mockNotif.on.mock.calls.filter((c: any[]) => c[0] === "click");
        if (calls.length > 0) calls[0][1]();
        expect(win.show).toHaveBeenCalled();

        mockAU.emit("update-downloaded", { version: "1.0" });
        const calls2 = mockNotif.on.mock.calls.filter((c: any[]) => c[0] === "click");
        if (calls2.length > 1) calls2[1][1]();

        mockAU.emit("checking-for-update");
        mockAU.emit("update-not-available");
        mockAU.emit("download-progress", { percent: 50 });
    });

    it("covers error types", () => {
        const win = {
            webContents: { send: vi.fn() },
            on: vi.fn(),
        } as unknown as BrowserWindow;
        setupUpdater(win);
        mockAU.emit("error", "github");
        mockAU.emit("error", "404");
        mockAU.emit("error", "Invalid Version");
        mockAU.emit("error", { foo: "bar" });
    });

    it("covers checks", async () => {
        const win = {
            webContents: { send: vi.fn() },
            on: vi.fn(),
        } as unknown as BrowserWindow;

        mockAU.checkForUpdates.mockRejectedValueOnce(new Error("Invalid Version"));
        await handleUpdateCheck(win, true);
        mockAU.checkForUpdates.mockRejectedValueOnce(new Error("Fatal"));
        await handleUpdateCheck(win, true);
        mockAU.checkForUpdates.mockRejectedValueOnce(new Error("Fatal"));
        await handleUpdateCheck(win, false);
        await handleUpdateCheck(null, true);
    });
});
