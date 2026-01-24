import { useState, useEffect } from "react";
import LoadingScreen from "./components/LoadingScreen";
import SecurityLock from "./components/SecurityLock";
import GuideOnboarding from "./components/GuideOnboarding";
import { QuitModal } from "./components/Modals/QuitModal";
import { UpdateModal } from "./components/Modals/UpdateModal";
import { GPUConfirmModal } from "./components/Modals/GPUConfirmModal";
import LaunchGameModal from "./components/Modals/LaunchGameModal";

import { useConfig } from "./hooks/useConfig";
import { useAccountManager } from "./hooks/useAccountManager";
import { useAppIpc } from "./hooks/useAppIpc";
import { useSecurity } from "./hooks/useSecurity";
import { Account } from "../shared/types";

import { DesignRegistry, DesignKey } from "./designs/registry";

const App = () => {
  const { config, updateConfig, selectRiotPath } = useConfig();
  const { accounts, activeAccountId, actions } = useAccountManager();

  // Launch Game Modal State
  const [isLaunchGameOpen, setIsLaunchGameOpen] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);

  const handleSwitch = async (id: string, autoLaunch?: boolean) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;

    if (autoLaunch === undefined) {
      if (config?.showLaunchGamePopup !== false) {
        setPendingAccount(acc);
        setIsLaunchGameOpen(true);
        return;
      }
      autoLaunch = true;
    }

    await actions.login(acc, autoLaunch);
  };

  const confirmLaunch = async (launch: boolean) => {
    if (pendingAccount) {
      await actions.login(pendingAccount, launch);
      setIsLaunchGameOpen(false);
      setPendingAccount(null);
    }
  };

  const { status, updateInfo, isQuitModalOpen, setIsQuitModalOpen, closeUpdateModal } =
    useAppIpc(handleSwitch);
  const { isLocked, verifyPin, setPin, disablePin, checkSecurityStatus } =
    useSecurity();

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
      <SecurityLock mode="verify" onVerify={verifyPin} onSet={async () => { }} />
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

  const handleOpenGpuModal = (target: boolean) => {
    setGpuTargetValue(target);
    setGpuModalOpen(true);
  };

  const confirmGpuChange = async () => {
    await updateConfig({ enableGPU: gpuTargetValue });
    window.ipc.invoke("restart-app");
  };

  // Resolve Design
  const activeDesignKey = (config.activeDesignModule || "classic") as DesignKey;
  const CurrentDesign = DesignRegistry[activeDesignKey] || DesignRegistry.classic;

  const systemActions = {
    openSecurityModal: setSecurityModalMode,
    openGpuModal: handleOpenGpuModal,
    checkUpdates: () => window.ipc.invoke("check-updates", true),
    selectRiotPath,
    updateConfig,
  };

  return (
    <>
      <CurrentDesign
        accounts={accounts}
        activeAccountId={activeAccountId}
        config={config}
        status={status}
        actions={actions}
        onSwitchSession={handleSwitch}
        onOpenSettings={() => { }}
        systemActions={systemActions}
        updateInfo={updateInfo}
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
        onCancel={closeUpdateModal}
        onUpdate={() => window.ipc.invoke("download-update")}
      />

      {securityModalMode && (
        <SecurityLock
          mode={securityModalMode}
          onVerify={async (pin) => {
            if (securityModalMode === "disable") {
              const success = await disablePin(pin);
              if (success) setSecurityModalMode(null);
              return success;
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

      <LaunchGameModal
        isOpen={isLaunchGameOpen}
        onClose={() => setIsLaunchGameOpen(false)}
        onPlay={() => confirmLaunch(true)}
        onNo={() => confirmLaunch(false)}
        gameType={pendingAccount?.gameType || null}
      />
    </>
  );
};

export default App;
