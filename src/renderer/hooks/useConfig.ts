import { useState, useEffect } from "react";
import { Config } from "../../shared/types";
import { devError } from "../utils/logger";

export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const data = await window.ipc.invoke("get-config");
      setConfig(data);
    } catch (err) {
      devError("Failed to fetch config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfig();

    const unsubscribe = window.ipc.on("config-updated", (_event, newConfig) => {
      setConfig((prev) =>
        prev ? { ...prev, ...(newConfig as Partial<Config>) } : null,
      );
    });

    return () => unsubscribe();
  }, []);

  const updateConfig = async (newConfig: Partial<Config>) => {
    // Optimistic update
    setConfig((prev) => (prev ? { ...prev, ...newConfig } : null));
    try {
      await window.ipc.invoke("save-config", newConfig);
    } catch (err) {
      // Revert on failure
      void fetchConfig();
      throw err;
    }
  };

  const selectRiotPath = async () => {
    const path = await window.ipc.invoke("select-riot-path");
    if (path) {
      await updateConfig({ riotPath: path });
    }
  };

  const autoDetectPaths = async () => {
    const result = await window.ipc.invoke("auto-detect-paths");
    if (result && result.riotPath) {
      await updateConfig({ riotPath: result.riotPath });
    }
    return result;
  };

  return {
    config,
    loading,
    updateConfig,
    selectRiotPath,
    autoDetectPaths,
    refreshConfig: fetchConfig,
  };
};
