
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadConfigSync } from "../main/config";
import fs from "fs-extra";

// Mock dependencies
vi.mock("electron", () => ({
    app: { getPath: vi.fn(() => "mock-path") },
}));

vi.mock("fs-extra", () => ({
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        mkdirSync: vi.fn(),
    },
}));

vi.mock("../main/logger");

describe("config.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Line 91: content falsy in loadConfigSync
    it("loadConfigSync handles falsy content", () => {
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue(null);

        const config = loadConfigSync();
        expect(config).toBeDefined();
    });

    it("loadConfigSync handles whitespace content", () => {
        (fs.existsSync as any).mockReturnValue(true);
        (fs.readFileSync as any).mockReturnValue("  ");

        const config = loadConfigSync();
        expect(config).toBeDefined();
    });
});
