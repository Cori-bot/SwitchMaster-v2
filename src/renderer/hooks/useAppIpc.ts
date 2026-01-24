import { useState, useEffect } from "react";

import { AppStatus } from "../../shared/types";

export interface UpdateInfo {
  isOpen: boolean;
  status:
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";
  progress: number;
  version: string;
  releaseNotes: string;
  error?: string;
}

export function useAppIpc(
  handleSwitch: (accountId: string, askToLaunch: boolean) => Promise<void>,
) {
  const [status, setStatus] = useState<AppStatus>({
    status: "Initialisation...",
  });
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    isOpen: false,
    status: "idle",
    progress: 0,
    version: "",
    releaseNotes: "",
  });

  const updateStatusDisplay = (appStatus: AppStatus) => {
    if (appStatus && appStatus.status === "Active") {
      setStatus({
        status: `Actif: ${appStatus.accountName}`,
        accountId: appStatus.accountId,
      });
    } else {
      setStatus({ status: appStatus?.status || "Prêt", accountId: undefined });
    }
  };

  const refreshStatus = async () => {
    const appStatus = await window.ipc.invoke("get-status");
    updateStatusDisplay(appStatus);
  };

  useEffect(() => {
    const init = async () => {
      const appStatus = await window.ipc.invoke("get-status");
      updateStatusDisplay(appStatus);
    };
    void init();

    const statusUnsubscribe = window.ipc.on(
      "status-updated",
      (_event, appStatus) => {
        updateStatusDisplay(appStatus);
      },
    );

    const riotClosedUnsubscribe = window.ipc.on("riot-client-closed", () => {
      void refreshStatus();
    });

    const quitUnsubscribe = window.ipc.on("show-quit-modal", () => {
      setIsQuitModalOpen(true);
    });

    const updateStatusUnsubscribe = window.ipc.on(
      "update-status",
      (_event, data) => {
        setUpdateInfo((prev) => {
          const shouldOpen =
            data.isManual ||
            (data.status !== "not-available" &&
              data.status !== "checking" &&
              data.status !== "idle");

          return {
            ...prev,
            isOpen: shouldOpen,
            status: data.status,
            version: data.version || prev.version,
            releaseNotes: data.releaseNotes || prev.releaseNotes,
            error: data.error,
          };
        });
      },
    );

    const updateProgressUnsubscribe = window.ipc.on(
      "update-progress",
      (_event, data) => {
        setUpdateInfo((prev) => ({
          ...prev,
          status: "downloading",
          progress: data.percent,
        }));
      },
    );

    const updateDownloadedUnsubscribe = window.ipc.on(
      "update-downloaded",
      () => {
        setUpdateInfo((prev) => ({ ...prev, status: "downloaded" }));
      },
    );

    const quickConnectUnsubscribe = window.ipc.on(
      "quick-connect-triggered",
      (_event, accountId) => {
        void handleSwitch(accountId as string, false);
      },
    );

    return () => {
      statusUnsubscribe();
      riotClosedUnsubscribe();
      quitUnsubscribe();
      updateStatusUnsubscribe();
      updateProgressUnsubscribe();
      updateDownloadedUnsubscribe();
      quickConnectUnsubscribe();
    };
  }, [handleSwitch]);

  return {
    status,
    isQuitModalOpen,
    setIsQuitModalOpen,
    updateInfo,
    setUpdateInfo,
    refreshStatus,
    closeUpdateModal: () => setUpdateInfo((prev) => ({ ...prev, isOpen: false })),
  };
}
