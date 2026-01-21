import { renderHook } from "@testing-library/react";
import { useSecurity } from "../hooks/useSecurity";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useSecurity Hook", () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).ipc = { invoke: mockInvoke };
  });

  it("doit vérifier le statut de sécurité", async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useSecurity());
    const status = await result.current.checkSecurityStatus();
    expect(status).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("get-security-status");
  });

  it("doit vérifier un PIN", async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useSecurity());
    const valid = await result.current.verifyPin("1234");
    expect(valid).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("verify-pin", "1234");
  });

  it("doit configurer un PIN", async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useSecurity());
    const success = await result.current.setPin("1234");
    expect(success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("set-pin", "1234");
  });

  it("doit désactiver un PIN", async () => {
    mockInvoke.mockResolvedValue(true);
    const { result } = renderHook(() => useSecurity());
    const success = await result.current.disablePin("1234");
    expect(success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("disable-pin", "1234");
  });
});