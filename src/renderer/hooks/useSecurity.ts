import { useState, useCallback } from "react";

export const useSecurity = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSecurityStatus = useCallback(async () => {
    try {
      const isEnabled = await window.ipc.invoke("get-security-status");
      setIsLocked(isEnabled);
      return isEnabled;
    } catch (err) {
      console.error("Failed to check security status:", err);
      return false;
    }
  }, []);

  const verifyPin = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const isValid = await window.ipc.invoke("verify-pin", pin);
      if (isValid) {
        setIsLocked(false);
      } else {
        setError("Code PIN incorrect");
      }
      return isValid;
    } catch (err) {
      setError("Erreur lors de la vérification");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setPin = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      await window.ipc.invoke("set-pin", pin);
      return true;
    } catch (err) {
      setError("Erreur lors de la configuration du PIN");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePin = async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await window.ipc.invoke("disable-pin", pin);
      if (!success) setError("Code PIN incorrect");
      return success;
    } catch (err) {
      setError("Erreur lors de la désactivation");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isLocked,
    loading,
    error,
    verifyPin,
    setPin,
    disablePin,
    checkSecurityStatus,
    setError,
  };
};
