import { useState, useEffect } from "react";
export type { Account } from "../../shared/types";
import { Account } from "../../shared/types";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAccounts = async () => {
    try {
      const data = await window.ipc.invoke("get-accounts");
      setAccounts(data);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAccounts();
    const unsubscribe = window.ipc.on(
      "accounts-updated",
      (_event, data: Account[]) => {
        setAccounts(data);
      },
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const addAccount = async (data: Partial<Account>) => {
    await window.ipc.invoke("add-account", data);
    await refreshAccounts();
  };

  const updateAccount = async (data: Account) => {
    await window.ipc.invoke("update-account", data);
    await refreshAccounts();
  };

  const deleteAccount = async (id: string) => {
    await window.ipc.invoke("delete-account", id);
    await refreshAccounts();
  };

  const reorderAccounts = async (ids: string[]) => {
    await window.ipc.invoke("reorder-accounts", ids);
    // Optimistic update could be done here
    await refreshAccounts();
  };

  return {
    accounts,
    loading,
    refreshAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccounts,
  };
};
