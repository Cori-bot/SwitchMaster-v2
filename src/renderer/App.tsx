import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Transition } from "framer-motion";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import AddAccountModal from "./components/AddAccountModal";
import SecurityLock from "./components/SecurityLock";
import NotificationItem from "./components/NotificationItem";
import GuideOnboarding from "./components/GuideOnboarding";
import {
  QuitModal,
  UpdateModal,
  LaunchConfirmModal,
  DeleteConfirmModal,
  GPUConfirmModal,
} from "./components/AppModals";
import { useAccounts } from "./hooks/useAccounts";
import { useConfig } from "./hooks/useConfig";
import { useSecurity } from "./hooks/useSecurity";
import { useNotifications } from "./hooks/useNotifications";

import { Account, Config } from "../shared/types";

import { useAppIpc } from "./hooks/useAppIpc";
import LoadingScreen from "./components/LoadingScreen";


const pageVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

const pageTransition: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.2,
};

const App: React.FC = () => {


  const [activeView, setActiveView] = useState("dashboard");
  const [filter, setFilter] = useState<"all" | "favorite" | "valorant" | "league">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [securityMode, setSecurityMode] = useState<
    "verify" | "set" | "disable" | null
  >(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    accountId: string | null;
  }>({ isOpen: false, accountId: null });

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [launchConfirm, setLaunchConfirm] = useState<{
    isOpen: boolean;
    accountId: string | null;
    gameType: "league" | "valorant";
  }>({ isOpen: false, accountId: null, gameType: "valorant" });

  const [gpuConfirm, setGpuConfirm] = useState<{
    isOpen: boolean;
    targetValue: boolean;
  }>({ isOpen: false, targetValue: false });

  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    refreshAccounts,
    reorderAccounts,
  } = useAccounts();
  const { config, updateConfig, selectRiotPath, refreshConfig } = useConfig();
  const { verifyPin, setPin, disablePin, checkSecurityStatus } = useSecurity();
  const { notifications, showSuccess, showError, removeNotification } =
    useNotifications();

  const handleSwitch = useCallback(async (accountId: string, askToLaunch = true) => {
    if (askToLaunch) {
      const account = accounts.find((a) => a.id === accountId);
      setLaunchConfirm({
        isOpen: true,
        accountId,
        gameType: account?.gameType || "valorant",
      });
      return;
    }

    try {
      const switchResult = await window.ipc.invoke("switch-account", accountId);
      if (switchResult.success) {
        showSuccess("Changement de compte réussi");
      } else {
        showError(switchResult.error || "Erreur lors du changement de compte");
      }
    } catch (err) {
      showError("Erreur de communication avec le système");
    }
  }, [accounts, showSuccess, showError]);

  const {
    status,
    isQuitModalOpen,
    setIsQuitModalOpen,
    updateInfo,
    setUpdateInfo,
    refreshStatus,
  } = useAppIpc(handleSwitch);

  useEffect(() => {
    const init = async () => {
      const startTime = Date.now();
      const locked = await checkSecurityStatus();
      if (locked) setSecurityMode("verify");

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => setIsInitialLoading(false), remaining);
    };
    init();
  }, []);

  const confirmLaunch = async () => {
    const { accountId, gameType } = launchConfirm;
    setLaunchConfirm({ ...launchConfirm, isOpen: false });

    try {
      const switchResult = await window.ipc.invoke("switch-account", accountId);
      if (switchResult.success) {
        showSuccess("Changement de compte réussi");
        refreshStatus();
        await window.ipc.invoke("launch-game", gameType);
      } else {
        showError(switchResult.error || "Erreur lors du changement de compte");
      }
    } catch (err) {
      showError("Erreur lors du lancement du jeu");
    }
  };

  const cancelLaunch = async () => {
    const { accountId } = launchConfirm;
    setLaunchConfirm({ ...launchConfirm, isOpen: false });

    try {
      const switchResult = await window.ipc.invoke("switch-account", accountId);
      if (switchResult.success) {
        showSuccess("Changement de compte réussi");
        refreshStatus();
      } else {
        showError(switchResult.error || "Erreur lors du changement de compte");
      }
    } catch (err) {
      showError("Erreur lors du changement de compte");
    }
  };

  const handleAddOrUpdate = useCallback(async (accountData: Partial<Account>) => {
    try {
      if (accountData.id) {
        await updateAccount(accountData as Account);
        showSuccess("Compte mis à jour");
      } else {
        await addAccount(accountData);
        showSuccess("Compte ajouté avec succès");
      }
      // refreshAccounts() supprimé car géré par le hook via IPC
    } catch (err) {
      showError("Erreur lors de l'enregistrement");
    }
  }, [updateAccount, addAccount, showSuccess, showError]);

  const handleDelete = useCallback((accountId: string) => {
    setDeleteConfirm({ isOpen: true, accountId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteConfirm.accountId) {
      await deleteAccount(deleteConfirm.accountId);
      showSuccess("Compte supprimé");
      setDeleteConfirm({ isOpen: false, accountId: null });
    }
  }, [deleteConfirm.accountId, deleteAccount, showSuccess]);

  const handleOpenAdd = useCallback(() => {
    setEditingAccount(null);
    setIsAddModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setIsAddModalOpen(true);
  }, []);

  const handleVerifyPin = useCallback(async (pin: string) => {
    if (securityMode === "disable") {
      const success = await disablePin(pin);
      if (success) {
        setSecurityMode(null);
        showSuccess("Protection par PIN désactivée");
        await refreshConfig();
        return true;
      }
      return false;
    }

    const isValid = await verifyPin(pin);
    if (isValid) {
      setSecurityMode(null);
      showSuccess("Accès autorisé");
      return true;
    }
    return false;
  }, [securityMode, disablePin, verifyPin, showSuccess, refreshConfig]);

  const handleSetPin = useCallback(async (pin: string) => {
    const success = await setPin(pin);
    if (success) {
      setSecurityMode(null);
      showSuccess("Code PIN configuré avec succès");
      await refreshConfig();
    }
  }, [setPin, showSuccess, refreshConfig]);

  const handleUpdateConfig = useCallback(async (newConfig: Partial<Config>) => {
    try {
      await updateConfig(newConfig);
      showSuccess("Paramètres mis à jour");
    } catch (err) {
      showError("Erreur de mise à jour");
    }
  }, [updateConfig, showSuccess, showError]);

  const confirmGPUChange = useCallback(async () => {
    try {
      await updateConfig({ enableGPU: gpuConfirm.targetValue });
      setGpuConfirm({ ...gpuConfirm, isOpen: false });
      window.ipc.invoke("restart-app");
    } catch (err) {
      showError("Erreur lors de la mise à jour");
    }
  }, [gpuConfirm, updateConfig, showError]);

  const handleToggleFavorite = useCallback(async (account: Account) => {
    try {
      // Appel avec un payload minimal pour éviter tout problème de re-chiffrement en prod
      await updateAccount({
        id: account.id,
        isFavorite: !account.isFavorite,
      } as Account);

      showSuccess(
        !account.isFavorite ? "Ajouté aux favoris" : "Retiré des favoris"
      );
    } catch (err) {
      showError("Erreur lors de la mise à jour du favori");
    }
  }, [updateAccount, showSuccess, showError]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      <AnimatePresence>
        {isInitialLoading && <LoadingScreen />}
      </AnimatePresence>



      {securityMode && (
        <SecurityLock
          mode={securityMode}
          onVerify={handleVerifyPin}
          onSet={handleSetPin}
          onCancel={() => setSecurityMode(null)}
        />
      )}

      {!isInitialLoading && config && !config.hasSeenOnboarding && !securityMode && (
        <GuideOnboarding
          config={config}
          onUpdateConfig={handleUpdateConfig}
          onSelectRiotPath={selectRiotPath}
          onFinish={refreshAccounts}
        />
      )}

      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar
          status={status}
          currentFilter={filter}
          onFilterChange={setFilter}
          showFilters={activeView === "dashboard"}
        />

        <main className="flex-1 overflow-hidden relative p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="h-full w-full overflow-y-auto custom-scrollbar"
            >
              {activeView === "dashboard" ? (
                <Dashboard
                  accounts={accounts}
                  filter={filter}
                  activeAccountId={status.accountId}
                  onSwitch={handleSwitch}
                  onEdit={handleOpenEdit}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onReorder={reorderAccounts}
                  onAddAccount={handleOpenAdd}
                />
              ) : (
                <Settings
                  config={config}
                  onUpdate={handleUpdateConfig}
                  onSelectRiotPath={selectRiotPath}
                  onCheckUpdates={() => window.ipc.invoke("check-updates")}
                  onOpenPinModal={() => setSecurityMode("set")}
                  onDisablePin={() => setSecurityMode("disable")}
                  onOpenGPUModal={(val) =>
                    setGpuConfirm({ isOpen: true, targetValue: val })
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onRemove={removeNotification}
            />
          ))}
        </div>
      </div>

      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddOrUpdate}
        editingAccount={editingAccount}
      />

      <QuitModal
        isOpen={isQuitModalOpen}
        onConfirm={(dontShowAgain: boolean) => {
          window.ipc.invoke("handle-quit-choice", {
            action: "quit",
            dontShowAgain,
          });
          setIsQuitModalOpen(false);
        }}
        onMinimize={(dontShowAgain: boolean) => {
          window.ipc.invoke("handle-quit-choice", {
            action: "minimize",
            dontShowAgain,
          });
          setIsQuitModalOpen(false);
        }}
        onCancel={() => setIsQuitModalOpen(false)}
      />

      <UpdateModal
        {...updateInfo}
        onUpdate={() => window.ipc.invoke("download-update")}
        onCancel={() => setUpdateInfo({ ...updateInfo, isOpen: false })}
      />

      <LaunchConfirmModal
        isOpen={launchConfirm.isOpen}
        gameType={launchConfirm.gameType}
        onConfirm={confirmLaunch}
        onCancel={cancelLaunch}
        onClose={() => setLaunchConfirm({ ...launchConfirm, isOpen: false })}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, accountId: null })}
      />

      {gpuConfirm.isOpen && (
        <GPUConfirmModal
          isOpen={gpuConfirm.isOpen}
          targetValue={gpuConfirm.targetValue}
          onConfirm={confirmGPUChange}
          onCancel={() => setGpuConfirm({ ...gpuConfirm, isOpen: false })}
        />
      )}
    </div>
  );
};

export default App;
