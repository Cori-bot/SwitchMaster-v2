import { useState, useCallback } from "react";
import { useAccounts } from "./useAccounts";
import { Account } from "../../shared/types";
import { useDesign } from "../contexts/DesignContext";

export interface UseAccountManagerResult {
  accounts: Account[];
  activeAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  actions: {
    login: (account: Account) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    reorderAccounts: (ids: string[]) => Promise<void>;
    toggleFavorite: (account: Account) => Promise<void>;
    addAccount: (data: Partial<Account>) => Promise<void>;
    switchDesign: (design: "A" | "B") => void;
  };
}

export const useAccountManager = (): UseAccountManagerResult => {
  const {
    accounts,
    deleteAccount: ipcDelete,
    updateAccount: ipcUpdate,
    reorderAccounts: ipcReorder,
    addAccount: ipcAdd,
    loading,
  } = useAccounts();
  const { switchDesign } = useDesign();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (account: Account) => {
    try {
      setError(null);
      setActiveAccountId(account.id);
      await window.ipc.invoke("launch-game", {
        launcherType: account.launcherType || "riot",
        gameId: account.gameType,
        credentials: { username: account.username, password: account.password },
      });
    } catch (err) {
      setError("Échec de la connexion");
      setActiveAccountId(null);
    }
  }, []);

  const deleteAccount = async (id: string) => {
    await ipcDelete(id);
  };

  const updateAccount = async (account: Account) => {
    await ipcUpdate(account);
  };

  const reorderAccounts = async (ids: string[]) => {
    await ipcReorder(ids);
  };

  const toggleFavorite = async (account: Account) => {
    await ipcUpdate({ ...account, isFavorite: !account.isFavorite });
  };

  const addAccount = async (data: Partial<Account>) => {
    await ipcAdd(data);
  };

  const switchDesignAction = (design: "A" | "B") => {
    switchDesign(design);
  };

  return {
    accounts,
    activeAccountId,
    isLoading: loading,
    error,
    actions: {
      login,
      deleteAccount,
      updateAccount,
      reorderAccounts,
      toggleFavorite,
      addAccount,
      switchDesign: switchDesignAction,
    },
  };
};
