import { renderHook, act } from "@testing-library/react";
import { useConfig } from "../hooks/useConfig";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useConfig Hook Deep", () => {
  const mockInvoke = vi.fn();
  const mockOn = vi.fn(() => vi.fn());

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).ipc = { invoke: mockInvoke, on: mockOn };
  });

  it("doit permettre de sélectionner le chemin Riot", async () => {
    // 1. Initial get-config
    mockInvoke.mockResolvedValueOnce({ riotPath: "C:\\Old" });
    // 2. select-riot-path call
    mockInvoke.mockResolvedValueOnce("C:\\NewPath");
    // 3. save-config call
    mockInvoke.mockResolvedValueOnce(true);
    
    const { result } = renderHook(() => useConfig());
    
    await act(async () => {
      await result.current.selectRiotPath();
    });
    
    expect(mockInvoke).toHaveBeenCalledWith("select-riot-path");
    // On vérifie que save-config a été appelé avec le nouveau chemin
    expect(mockInvoke).toHaveBeenCalledWith("save-config", expect.objectContaining({ riotPath: "C:\\NewPath" }));
  });
});