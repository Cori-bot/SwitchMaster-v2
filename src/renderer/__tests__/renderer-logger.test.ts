import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// On doit tester les fonctions avec différentes valeurs de NODE_ENV
describe("renderer/utils/logger", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => { });
        vi.spyOn(console, "error").mockImplementation(() => { });
        vi.spyOn(console, "warn").mockImplementation(() => { });
        vi.spyOn(console, "debug").mockImplementation(() => { });
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        vi.restoreAllMocks();
        vi.resetModules();
    });

    describe("en mode development", () => {
        beforeEach(() => {
            process.env.NODE_ENV = "development";
        });

        it("devLog doit appeler console.log", async () => {
            const { devLog } = await import("../utils/logger");
            devLog("test message", 123);
            expect(console.log).toHaveBeenCalledWith("test message", 123);
        });

        it("devError doit appeler console.error", async () => {
            const { devError } = await import("../utils/logger");
            devError("error message");
            expect(console.error).toHaveBeenCalledWith("error message");
        });

        it("devWarn doit appeler console.warn", async () => {
            const { devWarn } = await import("../utils/logger");
            devWarn("warning message");
            expect(console.warn).toHaveBeenCalledWith("warning message");
        });

        it("devDebug doit appeler console.debug", async () => {
            const { devDebug } = await import("../utils/logger");
            devDebug("debug message");
            expect(console.debug).toHaveBeenCalledWith("debug message");
        });
    });

    describe("en mode production", () => {
        beforeEach(() => {
            process.env.NODE_ENV = "production";
        });

        it("devLog ne doit pas appeler console.log", async () => {
            vi.resetModules();
            const { devLog } = await import("../utils/logger");
            devLog("test message");
            expect(console.log).not.toHaveBeenCalled();
        });

        it("devError ne doit pas appeler console.error", async () => {
            vi.resetModules();
            const { devError } = await import("../utils/logger");
            devError("error message");
            expect(console.error).not.toHaveBeenCalled();
        });

        it("devWarn ne doit pas appeler console.warn", async () => {
            vi.resetModules();
            const { devWarn } = await import("../utils/logger");
            devWarn("warning message");
            expect(console.warn).not.toHaveBeenCalled();
        });

        it("devDebug ne doit pas appeler console.debug", async () => {
            vi.resetModules();
            const { devDebug } = await import("../utils/logger");
            devDebug("debug message");
            expect(console.debug).not.toHaveBeenCalled();
        });
    });
});
