
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { monitorRiotProcess, launchGame } from "../main/appLogic";
import child_process from "child_process";

// Mock child_process
vi.mock("child_process", () => {
    const m = {
        exec: vi.fn(),
        spawn: vi.fn(() => ({ unref: vi.fn() })),
    };
    return { ...m, default: m };
});

// Mock Electron
vi.mock("electron", () => ({
    app: { isPackaged: false },
}));

// Mock config
vi.mock("../main/config", () => ({
    getConfig: vi.fn(() => ({ riotPath: "C:\\Riot\\RiotClientServices.exe" })),
}));

vi.mock("../main/logger");

describe("appLogic.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("monitorRiotProcess does nothing if client is running", async () => {
        const onClosed = vi.fn();
        const mw = { webContents: { send: vi.fn() } };

        (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
            cb(null, { stdout: "RiotClientServices.exe" })
        );

        monitorRiotProcess(mw as any, onClosed);
        await vi.advanceTimersByTimeAsync(31000);

        expect(onClosed).not.toHaveBeenCalled();
    });

    it("monitorRiotProcess handles non-Error objects in catch", async () => {
        (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
            cb("Non-Error String", null)
        );

        monitorRiotProcess(null);
        await vi.advanceTimersByTimeAsync(31000);
    });

    it("launchGame handles unknown gameId gracefully if type casted", async () => {
        // @ts-ignore
        await expect(launchGame("unknown")).rejects.toThrow();
    });
});
