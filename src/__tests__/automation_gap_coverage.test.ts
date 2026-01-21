
import { describe, it, expect, vi, beforeEach } from "vitest";
import { killRiotProcesses, performAutomation, autoDetectPaths } from "../main/automation";
import child_process from "child_process";
import fs from "fs-extra";
import { EventEmitter } from "events";

// Mock child_process
vi.mock("child_process", () => {
    const m = {
        exec: vi.fn(),
        spawn: vi.fn(),
    };
    return { ...m, default: m };
});

// Mock Electron
vi.mock("electron", () => ({
    app: { isPackaged: false },
    clipboard: { clear: vi.fn() },
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
    default: {
        pathExists: vi.fn(),
    },
}));

vi.mock("../main/logger");

describe("automation.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("killRiotProcesses handles non-Error objects in inner catch", async () => {
        (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
            cb("Taskkill String Error", null)
        );

        await killRiotProcesses();
    });

    it("performAutomation handles failed exit with no errorOutput", async () => {
        const mockPs = new EventEmitter() as any;
        mockPs.stdout = new EventEmitter();
        mockPs.stderr = new EventEmitter();
        (child_process.spawn as any).mockReturnValue(mockPs);

        const promise = performAutomation("user", "pass");
        mockPs.stdout.emit("data", Buffer.from("SOME_FAILURE"));
        mockPs.emit("close", 1);

        await expect(promise).rejects.toThrow("Login automation failed");
    });

    it("performAutomation handles failed exit with errorOutput", async () => {
        const mockPs = new EventEmitter() as any;
        mockPs.stdout = new EventEmitter();
        mockPs.stderr = new EventEmitter();
        (child_process.spawn as any).mockReturnValue(mockPs);

        const promise = performAutomation("user", "pass");
        mockPs.stderr.emit("data", Buffer.from("STDERR_ERROR"));
        mockPs.emit("close", 1);

        await expect(promise).rejects.toThrow("Login automation failed");
    });

    it("autoDetectPaths returns null if detected path does not exist", async () => {
        (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
            cb(null, { stdout: JSON.stringify([{ DisplayName: "Riot Client", InstallLocation: "C:\\Riot" }]) })
        );
        (fs.pathExists as any).mockResolvedValue(false);

        const result = await autoDetectPaths();
        expect(result).toBeNull();
    });
});
