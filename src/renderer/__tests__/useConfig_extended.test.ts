import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConfig } from "../hooks/useConfig";

vi.mock("../utils/logger", () => ({
    devError: vi.fn(),
}));

describe("useConfig - Extended Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window as any).ipc = {
            invoke: vi.fn(),
            on: vi.fn(() => vi.fn()),
        };
    });

    it("doit gérer l'erreur lors du fetch de la config", async () => {
        (window.ipc.invoke as any).mockRejectedValueOnce(new Error("Failed"));

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Config devrait être null en cas d'erreur
        expect(result.current.config).toBeNull();
    });

    it("doit mettre à jour la config via config-updated", async () => {
        const mockConfig = { riotPath: "/old/path" };
        (window.ipc.invoke as any).mockResolvedValueOnce(mockConfig);

        let configUpdatedCallback: ((event: any, newConfig: any) => void) | null = null;
        (window.ipc.on as any).mockImplementation((channel: string, cb: any) => {
            if (channel === "config-updated") {
                configUpdatedCallback = cb;
            }
            return vi.fn();
        });

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.config).toEqual(mockConfig);
        });

        // Simuler un événement config-updated
        if (configUpdatedCallback) {
            act(() => {
                configUpdatedCallback!({}, { riotPath: "/new/path" });
            });
        }

        expect(result.current.config?.riotPath).toBe("/new/path");
    });

    it("doit revert la config en cas d'erreur lors de updateConfig", async () => {
        const mockConfig = { riotPath: "/original/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockRejectedValueOnce(new Error("Save failed")) // save-config fails
            .mockResolvedValueOnce(mockConfig); // refresh after failure

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        try {
            await act(async () => {
                await result.current.updateConfig({ riotPath: "/new/path" });
            });
        } catch (error) {
            // Expected to throw
        }
    });

    it("doit appeler selectRiotPath et mettre à jour la config", async () => {
        const mockConfig = { riotPath: "/old/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockResolvedValueOnce("/new/riot/path") // select-riot-path
            .mockResolvedValueOnce(undefined); // save-config

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.config).toEqual(mockConfig);
        });

        await act(async () => {
            await result.current.selectRiotPath();
        });

        expect(window.ipc.invoke).toHaveBeenCalledWith("select-riot-path");
    });

    it("doit appeler autoDetectPaths et retourner le résultat", async () => {
        const mockConfig = { riotPath: "/old/path" };
        const detectResult = { riotPath: "/detected/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockResolvedValueOnce(detectResult) // auto-detect-paths
            .mockResolvedValueOnce(undefined); // save-config

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        let detectResultReturned: any;
        await act(async () => {
            detectResultReturned = await result.current.autoDetectPaths();
        });

        expect(window.ipc.invoke).toHaveBeenCalledWith("auto-detect-paths");
        expect(detectResultReturned).toEqual(detectResult);
    });

    it("ne doit pas mettre à jour si selectRiotPath retourne null", async () => {
        const mockConfig = { riotPath: "/old/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockResolvedValueOnce(null); // select-riot-path returns null

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.config).toEqual(mockConfig);
        });

        await act(async () => {
            await result.current.selectRiotPath();
        });

        // La config ne devrait pas avoir changé
        expect(result.current.config?.riotPath).toBe("/old/path");
    });

    it("ne doit pas mettre à jour si autoDetectPaths ne trouve rien", async () => {
        const mockConfig = { riotPath: "/old/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockResolvedValueOnce(null); // auto-detect-paths returns null

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.autoDetectPaths();
        });

        // La config ne devrait pas avoir changé
        expect(result.current.config?.riotPath).toBe("/old/path");
    });

    it("doit appeler refreshConfig correctement", async () => {
        const mockConfig = { riotPath: "/path" };
        (window.ipc.invoke as any)
            .mockResolvedValueOnce(mockConfig) // Initial fetch
            .mockResolvedValueOnce({ riotPath: "/refreshed/path" }); // Refresh

        const { result } = renderHook(() => useConfig());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        await act(async () => {
            await result.current.refreshConfig();
        });

        expect(result.current.config?.riotPath).toBe("/refreshed/path");
    });
});
