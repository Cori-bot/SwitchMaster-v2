import { describe, it, expect, vi, beforeEach } from "vitest";
import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";
import { BrowserWindow } from "electron";

// Setup mocks
global.fetch = vi.fn();

vi.mock("electron", () => {
    class MockBrowserWindow {
        static lastOptions: any;
        static instances: any[] = [];

        webContents = {
            on: vi.fn(),
            once: vi.fn(),
            loadURL: vi.fn(),
            getURL: vi.fn().mockReturnValue("https://google.com"),
            insertCSS: vi.fn().mockResolvedValue(undefined),
        };
        loadURL = vi.fn();
        show = vi.fn();
        close = vi.fn();
        on = vi.fn();
        once = vi.fn();
        isDestroyed = vi.fn().mockReturnValue(false);

        constructor(options: any) {
            MockBrowserWindow.lastOptions = options;
            MockBrowserWindow.instances.push(this);
        }
    }
    return {
        BrowserWindow: MockBrowserWindow,
        session: { fromPartition: vi.fn(() => ({ webRequest: { onBeforeSendHeaders: vi.fn() } })) },
        app: { getPath: vi.fn(), isPackaged: false },
        ipcMain: { handle: vi.fn(), on: vi.fn(), emit: vi.fn() },
        Notification: vi.fn(),
        dialog: { showOpenDialog: vi.fn() },
        shell: { openExternal: vi.fn() }
    };
});

vi.mock("../main/valorant-api/riotAuthService", () => ({
    RiotAuthService: {
        finishAuth: vi.fn().mockResolvedValue({}),
    }
}));

describe("RiotWebviewAuth Perfection Targeted", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any).instances = [];
        (RiotWebviewAuth as any).resolved = false;
        (RiotWebviewAuth as any).loginWin = null;
    });

    const getWin = () => (BrowserWindow as any).instances[0];

    // Line 25: modal: !!parentWindow && !silent
    it("Lines 25 - Modal logic branches", () => {
        RiotWebviewAuth.login(null, false);
        expect((BrowserWindow as any).lastOptions.modal).toBe(false);

        RiotWebviewAuth.login({} as any, true);
        expect((BrowserWindow as any).lastOptions.modal).toBe(false);

        RiotWebviewAuth.login({} as any, false);
        expect((BrowserWindow as any).lastOptions.modal).toBe(true);
    });

    // Line 64: if (loginWin.webContents.getURL().includes("auth.riotgames.com"))
    it("Lines 64 - CSS Injection Check", async () => {
        RiotWebviewAuth.login(null, true);
        const win = getWin();

        // 1. Not Riot URL
        win.webContents.getURL.mockReturnValue("https://google.com");
        const didFinishLoad = win.webContents.on.mock.calls.find((c: any) => c[0] === "did-finish-load")[1];
        await didFinishLoad();
        expect(win.webContents.insertCSS).not.toHaveBeenCalled();

        // Prevent dangling promises (although safeResolve handles it, test might warn)
        // Reset for next step
    });

    // Line 85: if (accessToken)
    it("Line 85 - Access Token Existence Check", async () => {
        RiotWebviewAuth.login(null, true);
        const win = getWin();
        const navHandler = win.webContents.on.mock.calls.find((c: any) => c[0] === "will-redirect")[1];

        // Case: URL has "access_token=" but param is empty/missing value
        // "https://callback/#access_token="
        const preventDefault = vi.fn();
        navHandler({ preventDefault }, "https://callback/#access_token=");

        expect(preventDefault).not.toHaveBeenCalled(); // Should return false
    });

    // Line 105: if (handleNavigation(url)) event.preventDefault();
    it("Line 105 - Navigation Prevention Check", async () => {
        RiotWebviewAuth.login(null, true);
        const win = getWin();
        const willNavigate = win.webContents.on.mock.calls.find((c: any) => c[0] === "will-navigate")[1];

        // Case: handleNavigation returns false
        const preventDefault = vi.fn();
        willNavigate({ preventDefault }, "https://google.com");
        expect(preventDefault).not.toHaveBeenCalled();

        // Case: handleNavigation returns true
        willNavigate({ preventDefault }, "https://callback/#access_token=123");
        expect(preventDefault).toHaveBeenCalled();
    });

    // Line 119: if (silentTimeout) clearTimeout(silentTimeout);
    it("Line 119 - Closed event with timeout logic", async () => {
        // Case 1: Silent = true (timeout created), then close
        vi.useFakeTimers();
        const spyClear = vi.spyOn(global, "clearTimeout");

        RiotWebviewAuth.login(null, true);
        const win = getWin();
        const closed = win.on.mock.calls.find((c: any) => c[0] === "closed")[1];
        closed();

        expect(spyClear).toHaveBeenCalled();
        vi.useRealTimers();

        // Case 2: Silent = false (no timeout), then close
        (BrowserWindow as any).instances = [];
        (RiotWebviewAuth as any).resolved = false;

        RiotWebviewAuth.login(null, false);
        const win2 = getWin();
        const closed2 = win2.on.mock.calls.find((c: any) => c[0] === "closed")[1];

        // Should not throw or crash
        expect(() => closed2()).not.toThrow();
    });
});
