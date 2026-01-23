import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";

// Hoist mocks to be available inside vi.mock
const mocks = vi.hoisted(() => {
    const loadURL = vi.fn();
    const show = vi.fn();
    const close = vi.fn();
    const insertCSS = vi.fn().mockResolvedValue(undefined);
    const getURL = vi.fn().mockReturnValue("https://auth.riotgames.com/login");
    const webContentsOn = vi.fn();
    const winOn = vi.fn();
    const winOnce = vi.fn();

    const mockWebContents = {
        on: webContentsOn,
        getURL: getURL,
        insertCSS: insertCSS,
        session: {
            webRequest: {
                onBeforeRequest: vi.fn(),
            }
        }
    };

    const mockWin = {
        loadURL: loadURL,
        show: show,
        close: close,
        isDestroyed: vi.fn(() => false),
        webContents: mockWebContents,
        on: winOn,
        once: winOnce,
    };

    return {
        mockWin,
        mockWebContents,
        loadURL,
        show,
        close,
        insertCSS,
        getURL,
        webContentsOn,
        winOn,
        winOnce
    };
});

// Mock Electron correctly
vi.mock("electron", () => {
    // Class to support 'new'
    class MockBrowserWindow {
        constructor() {
            return mocks.mockWin;
        }
    }

    return {
        BrowserWindow: MockBrowserWindow,
        app: {
            isPackaged: false,
        }
    };
});

// Mock crypto
vi.mock("crypto", () => ({
    randomBytes: vi.fn().mockReturnValue({ toString: () => "mocked-nonce" }),
    default: {
        randomBytes: vi.fn().mockReturnValue({ toString: () => "mocked-nonce" }),
    }
}));

// Mock fetch
global.fetch = vi.fn();

describe("RiotWebviewAuth Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock default
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        // Reset window state
        mocks.mockWin.isDestroyed.mockReturnValue(false);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("login flow", () => {
        it("gère le timeout silencieux", async () => {
            vi.useFakeTimers();
            const loginPromise = RiotWebviewAuth.login(null, true);

            vi.advanceTimersByTime(10001);

            const result = await loginPromise;
            expect(result).toBeNull();
        });

        it("gère l'échec de chargement (did-fail-load)", async () => {
            const loginPromise = RiotWebviewAuth.login(null, true);

            // Simulate call registration timing if needed, usually direct
            const calls = mocks.webContentsOn.mock.calls;
            const failLoadCall = calls.find(c => c[0] === "did-fail-load");

            if (failLoadCall) {
                failLoadCall[1]({}, -105, "ERR", "url");
            }

            const result = await loginPromise;
            expect(result).toBeNull();
        });

        it("injecte CSS", async () => {
            RiotWebviewAuth.login(null, false);

            mocks.getURL.mockReturnValue("https://auth.riotgames.com/login");

            // Find did-finish-load handler
            const calls = mocks.webContentsOn.mock.calls;
            const finishLoadCall = calls.find(c => c[0] === "did-finish-load");

            if (finishLoadCall) {
                await finishLoadCall[1]();
            }

            expect(mocks.insertCSS).toHaveBeenCalled();
        });
    });

    describe("finishAuth flow", () => {
        async function triggerTokenCapture(accessToken: string, idToken?: string) {
            const loginPromise = RiotWebviewAuth.login(null, true);

            const calls = mocks.webContentsOn.mock.calls;
            // find will-redirect
            const redirectCall = calls.find(c => c[0] === "will-redirect");

            let url = `http://localhost/redirect#access_token=${accessToken}&token_type=Bearer&expires_in=3600`;
            if (idToken) url += `&id_token=${idToken}`;

            if (redirectCall) {
                redirectCall[1]({ preventDefault: vi.fn() }, url);
            }
            return loginPromise;
        }

        it("complète avec succès", async () => {
            (global.fetch as any)
                .mockResolvedValueOnce({ json: async () => ({ entitlements_token: "ent" }) })
                .mockResolvedValueOnce({ json: async () => ({ sub: "sub", acct: {} }) })
                .mockResolvedValueOnce({ json: async () => ({ data: { riotClientVersion: "v1" } }) })
                .mockResolvedValueOnce({ json: async () => ({}) })
                .mockResolvedValueOnce({ json: async () => ({}) })
                .mockResolvedValue({ json: async () => ({}) });

            const result = await triggerTokenCapture("access");
            expect(result).not.toBeNull();
        });
    });
});
