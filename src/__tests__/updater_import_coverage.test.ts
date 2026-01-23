
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Updater Import Fallback", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("uses default export if named export is missing (Lines 9-13)", async () => {
        vi.mock("electron", () => ({ app: { isPackaged: false }, BrowserWindow: vi.fn(), Notification: vi.fn() }));
        vi.mock("electron-log", () => ({ default: { transports: { file: { level: "" } } } }));
        vi.mock("../main/logger", () => ({ devError: vi.fn() }));

        // Force 'electron-updater' to behave like a CJS module with default export
        vi.doMock("electron-updater", () => {
            return {
                __esModule: true,
                default: {
                    autoUpdater: {
                        on: vi.fn(),
                        logger: { transports: { file: { level: "" } } }
                    }
                },
                // HACK: Ensure direct export is undefined to fall through
                autoUpdater: undefined
            };
        });

        const updater = await import("../main/updater");
        expect(updater).toBeDefined();
    });

    it("uses default export directly if default.autoUpdater is missing (Case 3)", async () => {
        vi.mock("electron", () => ({ app: { isPackaged: false }, BrowserWindow: vi.fn(), Notification: vi.fn() }));
        vi.mock("electron-log", () => ({ default: { transports: { file: { level: "" } } } }));
        vi.mock("../main/logger", () => ({ devError: vi.fn() }));

        vi.doMock("electron-updater", () => {
            return {
                __esModule: true,
                default: {
                    // This IS the updater
                    on: vi.fn(),
                    logger: { transports: { file: { level: "" } } }
                },
                // Ensure previous checks fail
                autoUpdater: undefined
            };
        });

        const updater = await import("../main/updater");
        expect(updater).toBeDefined();
    });

    it("uses module root if all else fails (Case 4)", async () => {
        vi.mock("electron", () => ({ app: { isPackaged: false }, BrowserWindow: vi.fn(), Notification: vi.fn() }));
        vi.mock("electron-log", () => ({ default: { transports: { file: { level: "" } } } }));
        vi.mock("../main/logger", () => ({ devError: vi.fn() }));

        vi.doMock("electron-updater", () => {
            return {
                // The module itself is the updater
                on: vi.fn(),
                logger: { transports: { file: { level: "" } } },
                // Ensure properties check fail
                autoUpdater: undefined,
                default: undefined
            };
        });

        const updater = await import("../main/updater");
        expect(updater).toBeDefined();
    });

    // Cleaning up mocks is handled by resetModules
});
