import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Settings from "./components/Settings";
import GuideOnboarding from "./components/GuideOnboarding";
import LoadingScreen from "./components/LoadingScreen";
import SecurityLock from "./components/SecurityLock";
import AddAccountModal from "./components/AddAccountModal";
import NotificationItem from "./components/NotificationItem";
import { QuitModal } from "./components/Modals/QuitModal";
import { UpdateModal } from "./components/Modals/UpdateModal";
import { GPUConfirmModal } from "./components/Modals/GPUConfirmModal";
import { useConfig } from "./hooks/useConfig";
import { useAccountManager } from "./hooks/useAccountManager";
import { Account } from "../shared/types";
import { useNotifications } from "./hooks/useNotifications";
import { useAppIpc } from "./hooks/useAppIpc";
import { useSecurity } from "./hooks/useSecurity";
import { AnimatePresence, motion } from "framer-motion";
import { useDesign } from "./contexts/DesignContext";
import { DesignB } from "./layouts/DesignB";

const App = () => {
  const { config, updateConfig, selectRiotPath } = useConfig();
  const { accounts, activeAccountId, actions } = useAccountManager();
  const { notifications, removeNotification } = useNotifications();
  const { currentDesign } = useDesign();

  const handleSwitch = async (id: string) => {
    const acc = accounts.find((a) => a.id === id);
    if (acc) await actions.login(acc);
  };

  const { status, updateInfo, isQuitModalOpen, setIsQuitModalOpen } =
    useAppIpc(handleSwitch);
  const { isLocked, verifyPin, setPin, disablePin, checkSecurityStatus } =
    useSecurity();

  // Local UI state
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState<
    "all" | "favorite" | "valorant" | "league"
  >("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  // Security Modal State (for Settings)
  const [securityModalMode, setSecurityModalMode] = useState<
    "set" | "disable" | null
  >(null);

  // GPU Modal
  const [gpuModalOpen, setGpuModalOpen] = useState(false);
  const [gpuTargetValue, setGpuTargetValue] = useState(false);

  // Initial Security Check
  useEffect(() => {
    checkSecurityStatus();
  }, [checkSecurityStatus]);

  if (isLocked) {
    return (
      <SecurityLock mode="verify" onVerify={verifyPin} onSet={async () => {}} />
    );
  }

  if (!config) return <LoadingScreen />;

  if (!config.hasSeenOnboarding) {
    return (
      <GuideOnboarding
        config={config}
        onUpdateConfig={updateConfig}
        onSelectRiotPath={selectRiotPath}
        onFinish={() => updateConfig({ hasSeenOnboarding: true })}
      />
    );
  }

  const handleEdit = (account: Account) => {
    setAccountToEdit(account);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAccountToEdit(null);
  };

  const handleAddAccount = async (data: Partial<Account>) => {
    if (accountToEdit) {
      await actions.updateAccount({ ...accountToEdit, ...data } as Account);
    } else {
      await actions.addAccount(data);
    }
    handleCloseAddModal();
  };

  const handleOpenGpuModal = (target: boolean) => {
    setGpuTargetValue(target);
    setGpuModalOpen(true);
  };

  const confirmGpuChange = async () => {
    await updateConfig({ enableGPU: gpuTargetValue });
    window.ipc.send("restart-app");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans select-none relative">
      <Sidebar activeView={view} onViewChange={setView} />

      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        <TopBar
          status={status}
          currentFilter={filter}
          onFilterChange={setFilter}
          showFilters={view === "dashboard"}
        />

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {view === "dashboard" &&
            (currentDesign === "A" ? (
              <Dashboard
                accounts={accounts}
                filter={filter}
                activeAccountId={activeAccountId || undefined}
                onSwitch={handleSwitch}
                onDelete={actions.deleteAccount}
                onEdit={handleEdit}
                onToggleFavorite={actions.toggleFavorite}
                onReorder={actions.reorderAccounts}
                onAddAccount={() => setIsAddModalOpen(true)}
              />
            ) : (
              <DesignB accounts={accounts} onSwitch={handleSwitch} />
            ))}

          {view === "settings" && (
            <Settings
              config={config}
              onUpdate={updateConfig}
              onSelectRiotPath={selectRiotPath}
              onOpenPinModal={() => setSecurityModalMode("set")}
              onDisablePin={() => setSecurityModalMode("disable")}
              onCheckUpdates={() =>
                window.ipc.invoke("check-for-updates", true)
              }
              onOpenGPUModal={handleOpenGpuModal}
            />
          )}
        </main>
      </div>

      {/* Notifications Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
            >
              <NotificationItem
                notification={notification}
                onRemove={removeNotification}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onAdd={handleAddAccount}
        editingAccount={accountToEdit}
      />

      <QuitModal
        isOpen={isQuitModalOpen}
        onCancel={() => setIsQuitModalOpen(false)}
        onConfirm={(dontShow) => {
          updateConfig({ showQuitModal: !dontShow });
          window.ipc.invoke("confirm-quit");
        }}
        onMinimize={(dontShow) => {
          updateConfig({ showQuitModal: !dontShow });
          window.ipc.invoke("minimize-to-tray");
          setIsQuitModalOpen(false);
        }}
      />

      <UpdateModal
        isOpen={updateInfo.isOpen}
        status={updateInfo.status}
        progress={updateInfo.progress}
        version={updateInfo.version}
        releaseNotes={updateInfo.releaseNotes}
        error={updateInfo.error}
        onCancel={() => window.ipc.invoke("close-update-modal")}
        onUpdate={() => window.ipc.invoke("start-download-update")}
      />

      {/* Security Modal for Settings */}
      {securityModalMode && (
        <SecurityLock
          mode={securityModalMode}
          onVerify={async (pin) => {
            if (securityModalMode === "disable") {
              return await disablePin(pin);
            }
            return true;
          }}
          onSet={async (pin) => {
            await setPin(pin);
            setSecurityModalMode(null);
          }}
          onCancel={() => setSecurityModalMode(null)}
        />
      )}

      <GPUConfirmModal
        isOpen={gpuModalOpen}
        onCancel={() => setGpuModalOpen(false)}
        onConfirm={confirmGpuChange}
        targetValue={gpuTargetValue}
      />
    </div>
  );
};

export default App;
