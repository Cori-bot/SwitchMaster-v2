import { renderHook, act } from "@testing-library/react";
import { useSecurity } from "../hooks/useSecurity";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../utils/logger", () => ({
  devError: vi.fn(),
}));

describe("useSecurity Hook", () => {
  const mockInvoke = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).ipc = { invoke: mockInvoke };
  });

  describe("checkSecurityStatus", () => {
    it("doit vérifier le statut de sécurité avec succès", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useSecurity());

      const status = await result.current.checkSecurityStatus();

      expect(status).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("get-security-status");
    });

    it("doit retourner false et log erreur si checkSecurityStatus échoue", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC Error"));
      const { result } = renderHook(() => useSecurity());

      const status = await result.current.checkSecurityStatus();

      expect(status).toBe(false);
    });

    it("doit mettre à jour isLocked quand checkSecurityStatus réussit", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useSecurity());

      await act(async () => {
        await result.current.checkSecurityStatus();
      });

      expect(result.current.isLocked).toBe(true);
    });
  });

  describe("verifyPin", () => {
    it("doit vérifier un PIN valide", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useSecurity());

      let valid: boolean;
      await act(async () => {
        valid = await result.current.verifyPin("1234");
      });

      expect(valid!).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("verify-pin", "1234");
      expect(result.current.isLocked).toBe(false);
    });

    it("doit gérer un PIN invalide", async () => {
      mockInvoke.mockResolvedValue(false);
      const { result } = renderHook(() => useSecurity());

      let valid: boolean;
      await act(async () => {
        valid = await result.current.verifyPin("wrong");
      });

      expect(valid!).toBe(false);
      expect(result.current.error).toBe("Code PIN incorrect");
    });

    it("doit gérer une erreur IPC lors de verifyPin", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC Error"));
      const { result } = renderHook(() => useSecurity());

      let valid: boolean;
      await act(async () => {
        valid = await result.current.verifyPin("1234");
      });

      expect(valid!).toBe(false);
      expect(result.current.error).toBe("Erreur lors de la vérification");
    });

    it("doit gérer loading state", async () => {
      let resolvePromise: (value: boolean) => void;
      mockInvoke.mockReturnValue(new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      const { result } = renderHook(() => useSecurity());

      let promise: Promise<boolean>;
      act(() => {
        promise = result.current.verifyPin("1234");
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(true);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("setPin", () => {
    it("doit configurer un PIN avec succès", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useSecurity());

      let success: boolean;
      await act(async () => {
        success = await result.current.setPin("1234");
      });

      expect(success!).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("set-pin", "1234");
    });

    it("doit gérer une erreur lors de setPin", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC Error"));
      const { result } = renderHook(() => useSecurity());

      let success: boolean;
      await act(async () => {
        success = await result.current.setPin("1234");
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Erreur lors de la configuration du PIN");
    });
  });

  describe("disablePin", () => {
    it("doit désactiver un PIN avec succès", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useSecurity());

      let success: boolean;
      await act(async () => {
        success = await result.current.disablePin("1234");
      });

      expect(success!).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("disable-pin", "1234");
    });

    it("doit gérer un PIN incorrect lors de disable", async () => {
      mockInvoke.mockResolvedValue(false);
      const { result } = renderHook(() => useSecurity());

      let success: boolean;
      await act(async () => {
        success = await result.current.disablePin("wrong");
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Code PIN incorrect");
    });

    it("doit gérer une erreur IPC lors de disablePin", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC Error"));
      const { result } = renderHook(() => useSecurity());

      let success: boolean;
      await act(async () => {
        success = await result.current.disablePin("1234");
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe("Erreur lors de la désactivation");
    });
  });

  describe("setError", () => {
    it("doit permettre de définir une erreur manuellement", async () => {
      const { result } = renderHook(() => useSecurity());

      act(() => {
        result.current.setError("Custom error");
      });

      expect(result.current.error).toBe("Custom error");
    });

    it("doit permettre de clear l'erreur", async () => {
      mockInvoke.mockRejectedValue(new Error("Error"));
      const { result } = renderHook(() => useSecurity());

      await act(async () => {
        await result.current.verifyPin("test");
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});