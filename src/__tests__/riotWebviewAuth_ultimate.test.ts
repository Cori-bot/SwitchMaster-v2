import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";
import { RiotAuthService } from "../main/valorant-api/riotAuthService";
import { BrowserWindow } from "electron";

// Mock global fetch
global.fetch = vi.fn();

// Mock Electron correctly
const mockNotification = {
    show: vi.fn(),
    on: vi.fn(),
};

vi.mock("electron", () => {
    class MockBrowserWindow {
        static instances: any[] = [];
        webContents = {
            on: vi.fn(),
            once: vi.fn(),
            loadURL: vi.fn(),
            getURL: vi.fn(),
            insertCSS: vi.fn().mockResolvedValue(undefined),
        };
        loadURL = vi.fn();
        show = vi.fn();
        focus = vi.fn();
        close = vi.fn();
        on = vi.fn();
        once = vi.fn();
        isDestroyed = vi.fn().mockReturnValue(false);
        constructor() {
            MockBrowserWindow.instances.push(this);
            return this;
        }
    }
    return {
        BrowserWindow: MockBrowserWindow,
        session: {
            fromPartition: vi.fn(() => ({
                webRequest: { onBeforeSendHeaders: vi.fn() }
            }))
        },
        app: { getPath: vi.fn(), isPackaged: true },
        ipcMain: { handle: vi.fn(), on: vi.fn(), emit: vi.fn() },
        Notification: vi.fn().mockImplementation(function () { return mockNotification; }),
        dialog: { showOpenDialog: vi.fn() },
        shell: { openExternal: vi.fn() }
    };
});

describe("Riot Auth Absolute Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any).instances = [];
        (RiotWebviewAuth as any).resolved = false;
        (RiotWebviewAuth as any).loginWin = null;
    });

    describe("RiotWebviewAuth", () => {
        it("handles full login flow and clicks", async () => {
            vi.spyOn(RiotAuthService, "finishAuth").mockResolvedValue({ accessToken: "t" } as any);
            const promise = RiotWebviewAuth.login(null, false);
            const win = (BrowserWindow as any).instances[0];

            // Trigger did-finish-load on Riot URL
            win.webContents.getURL.mockReturnValue("https://auth.riotgames.com/");
            const didFinishLoad = win.webContents.on.mock.calls.find((c: any) => c[0] === "did-finish-load")[1];
            await didFinishLoad();

            // Trigger click on notification if exists
            const clickCall = mockNotification.on.mock.calls.find((c: any) => c[0] === "click");
            if (clickCall) clickCall[1]();

            win.webContents.on.mock.calls.find((c: any) => c[0] === "will-redirect")[1]({ preventDefault: vi.fn() }, "https://callback/#access_token=1");
            expect(await promise).not.toBeNull();
        });

        it("covers all remaining branches", async () => {
            const p = RiotWebviewAuth.login(null, false);
            const win = (BrowserWindow as any).instances[0];
            const willR = win.webContents.on.mock.calls.find((c: any) => c[0] === "will-redirect")[1];

            const pf = vi.fn();
            willR({ preventDefault: pf }, "https://google.com");
            expect(pf).not.toHaveBeenCalled();

            willR({ preventDefault: pf }, "https://callback?access_token=1");
            expect(pf).toHaveBeenCalled();
            expect(await p).not.toBeNull();
        });

        it("covers error paths and silent modes", async () => {
            vi.spyOn(RiotAuthService, "finishAuth").mockRejectedValueOnce(new Error("E"));
            const p = RiotWebviewAuth.login(null, true);
            const win = (BrowserWindow as any).instances[0];
            const willR = win.webContents.on.mock.calls.find((c: any) => c[0] === "will-redirect")[1];

            willR({ preventDefault: vi.fn() }, "https://callback/#access_token=2");
            expect(await p).toBeNull();

            // isDestroyed edge
            (RiotWebviewAuth as any).resolved = false;
            const p2 = RiotWebviewAuth.login(null, true);
            const w2 = (BrowserWindow as any).instances[1];
            w2.isDestroyed.mockReturnValue(true);
            w2.webContents.on.mock.calls.find((c: any) => c[0] === "will-redirect")[1]({ preventDefault: vi.fn() }, "https://callback/#access_token=3");
            await p2;
        });

        it("covers lifecycle edges", async () => {
            vi.useFakeTimers();
            const p = RiotWebviewAuth.login(null, true);
            vi.advanceTimersByTime(11000);
            expect(await p).toBeNull();
            vi.useRealTimers();

            (RiotWebviewAuth as any).resolved = false;
            const p2 = RiotWebviewAuth.login(null, false);
            const w2 = (BrowserWindow as any).instances[1];
            w2.webContents.on.mock.calls.find((c: any) => c[0] === "did-fail-load")[1](null, -1, "f", "u");
            w2.on.mock.calls.find((c: any) => c[0] === "closed")[1]();
            expect(await p2).toBeNull();
        });
    });

    describe("RiotAuthService", () => {
        it("covers markers and catchers", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({ json: () => ({ entitlements_token: "e" }) })
                .mockResolvedValueOnce({ json: () => ({ sub: "p", acct: { game_name: "N" } }) })
                .mockResolvedValueOnce({ json: () => ({ affinities: { live: "eu" } }) })
                .mockResolvedValueOnce({ json: () => ({ data: { riotClientVersion: "v" } }) })
                .mockResolvedValueOnce({ json: () => ({ Progress: { Level: 1 } }) })
                .mockResolvedValueOnce({ json: () => ({}) })
                .mockResolvedValue({ json: () => ({}) });
            await RiotAuthService.finishAuth("t", "i");

            (global.fetch as any)
                .mockResolvedValueOnce({ json: () => ({ entitlements_token: "e" }) })
                .mockRejectedValueOnce(new Error("U"))
                .mockResolvedValueOnce({ json: () => ({ affinities: { live: "eu" } }) })
                .mockResolvedValueOnce({ json: () => ({ data: { riotClientVersion: "v" } }) })
                .mockRejectedValueOnce(new Error("X"))
                .mockRejectedValueOnce(new Error("M"))
                .mockRejectedValueOnce(new Error("L"));
            await RiotAuthService.finishAuth("t");

            (global.fetch as any).mockImplementationOnce(() => { throw new Error("F"); });
            await RiotAuthService.finishAuth("t");
        });
    });
});
