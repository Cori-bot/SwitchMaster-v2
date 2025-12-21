import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import AddAccountModal from './components/AddAccountModal';
import SecurityLock from './components/SecurityLock';
import NotificationItem from './components/NotificationItem';
import { QuitModal, UpdateModal, LaunchConfirmModal } from './components/AppModals';
import { useAccounts } from './hooks/useAccounts';
import { useConfig } from './hooks/useConfig';
import { useSecurity } from './hooks/useSecurity';
import { useNotifications } from './hooks/useNotifications';

import { Account, Config } from '../shared/types';

interface AppStatus {
  status: string;
  accountId?: string;
  accountName?: string;
}

interface UpdateInfo {
  isOpen: boolean;
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  progress: number;
  version: string;
  releaseNotes: string;
  error?: string;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<AppStatus & { accountId?: string }>({ status: 'Initialisation...' });
  const [securityMode, setSecurityMode] = useState<'verify' | 'set' | 'disable' | null>(null);
  
  // App-level Modal states
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ 
    isOpen: false, 
    status: 'idle', 
    progress: 0, 
    version: '', 
    releaseNotes: '' 
  });
  const [launchConfirm, setLaunchConfirm] = useState<{
    isOpen: boolean;
    accountId: string | null;
    gameType: 'league' | 'valorant';
  }>({ isOpen: false, accountId: null, gameType: 'valorant' });

  const { accounts, addAccount, updateAccount, deleteAccount, refreshAccounts, reorderAccounts } = useAccounts();
  const { config, updateConfig, selectRiotPath, refreshConfig } = useConfig();
  const { verifyPin, setPin, disablePin, checkSecurityStatus } = useSecurity();
  const { notifications, showSuccess, showError, removeNotification } = useNotifications();

  useEffect(() => {
    const init = async () => {
      const locked = await checkSecurityStatus();
      if (locked) setSecurityMode('verify');
      
      const res = await window.ipc.invoke('get-status');
      updateStatusDisplay(res);
    };
    init();

    const statusUnsubscribe = window.ipc.on('status-updated', (_event, res) => {
      updateStatusDisplay(res);
    });

    const riotClosedUnsubscribe = window.ipc.on('riot-client-closed', () => {
      refreshStatus();
    });

    const quitUnsubscribe = window.ipc.on('show-quit-modal', () => {
      setIsQuitModalOpen(true);
    });

    const updateStatusUnsubscribe = window.ipc.on('update-status', (_event, data) => {
      setUpdateInfo((prev) => {
        // Ne pas ouvrir la modale automatiquement si c'est un check de routine sans update
        const shouldOpen = data.isManual || (data.status !== 'not-available' && data.status !== 'checking' && data.status !== 'idle');
        
        return {
          ...prev,
          isOpen: shouldOpen,
          status: data.status,
          version: data.version || prev.version,
          releaseNotes: data.releaseNotes || prev.releaseNotes,
          error: data.error
        };
      });
    });

    const updateProgressUnsubscribe = window.ipc.on('update-progress', (_event, data) => {
      setUpdateInfo((prev) => ({ ...prev, status: 'downloading', progress: data.percent }));
    });

    const updateDownloadedUnsubscribe = window.ipc.on('update-downloaded', () => {
      setUpdateInfo((prev) => ({ ...prev, status: 'downloaded' }));
    });

    const quickConnectUnsubscribe = window.ipc.on('quick-connect-triggered', (_event, accountId) => {
      handleSwitch(accountId, false);
    });

    return () => {
      statusUnsubscribe();
      riotClosedUnsubscribe();
      quitUnsubscribe();
      updateStatusUnsubscribe();
      updateProgressUnsubscribe();
      updateDownloadedUnsubscribe();
      quickConnectUnsubscribe();
    };
  }, []);

  const updateStatusDisplay = (res: AppStatus) => {
    if (res && res.status === 'Active') {
      setStatus({ 
        status: `Actif: ${res.accountName}`,
        accountId: res.accountId 
      });
    } else {
      setStatus({ status: res?.status || 'Prêt', accountId: undefined });
    }
  };

  const refreshStatus = async () => {
    const res = await window.ipc.invoke('get-status');
    updateStatusDisplay(res);
  };

  const handleSwitch = async (accountId: string, askToLaunch = true) => {
    if (askToLaunch) {
      const account = accounts.find(a => a.id === accountId);
      setLaunchConfirm({
        isOpen: true,
        accountId,
        gameType: account?.gameType || 'valorant'
      });
      return;
    }

    try {
      const res = await window.ipc.invoke('switch-account', accountId);
      if (res.success) {
        showSuccess('Changement de compte réussi');
        refreshStatus();
      } else {
        showError(res.error || 'Erreur lors du changement de compte');
      }
    } catch (err) {
      showError('Erreur de communication avec le système');
    }
  };

  const confirmLaunch = async () => {
    const { accountId, gameType } = launchConfirm;
    setLaunchConfirm({ ...launchConfirm, isOpen: false });

    try {
      const res = await window.ipc.invoke('switch-account', accountId);
      if (res.success) {
        showSuccess('Changement de compte réussi');
        refreshStatus();
        await window.ipc.invoke('launch-game', gameType);
      } else {
        showError(res.error || 'Erreur lors du changement de compte');
      }
    } catch (err) {
      showError('Erreur lors du lancement du jeu');
    }
  };

  const cancelLaunch = async () => {
    const { accountId } = launchConfirm;
    setLaunchConfirm({ ...launchConfirm, isOpen: false });

    try {
      const res = await window.ipc.invoke('switch-account', accountId);
      if (res.success) {
        showSuccess('Changement de compte réussi');
        refreshStatus();
      } else {
        showError(res.error || 'Erreur lors du changement de compte');
      }
    } catch (err) {
      showError('Erreur lors du changement de compte');
    }
  };

  const handleAddOrUpdate = async (accountData: Partial<Account>) => {
    try {
      if (accountData.id) {
        await updateAccount(accountData as Account);
        showSuccess('Compte mis à jour');
      } else {
        await addAccount(accountData);
        showSuccess('Compte ajouté avec succès');
      }
      refreshAccounts();
    } catch (err) {
      showError('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (accountId: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce compte ?')) {
      await deleteAccount(accountId);
      showSuccess('Compte supprimé');
    }
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingAccount(account);
    setIsAddModalOpen(true);
  };

  const handleVerifyPin = async (pin: string) => {
    if (securityMode === 'disable') {
      const success = await disablePin(pin);
      if (success) {
        setSecurityMode(null);
        showSuccess('Protection par PIN désactivée');
        await refreshConfig();
        return true;
      }
      return false;
    }

    const isValid = await verifyPin(pin);
    if (isValid) {
      setSecurityMode(null);
      showSuccess('Accès autorisé');
      return true;
    }
    return false;
  };

  const handleSetPin = async (pin: string) => {
    const success = await setPin(pin);
    if (success) {
      setSecurityMode(null);
      showSuccess('Code PIN configuré avec succès');
      await refreshConfig();
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<Config>) => {
    try {
      await updateConfig(newConfig);
      showSuccess('Paramètres mis à jour');
    } catch (err) {
      showError('Erreur de mise à jour');
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {securityMode && (
        <SecurityLock
          mode={securityMode}
          onVerify={handleVerifyPin}
          onSet={handleSetPin}
        />
      )}
      
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopBar 
            status={status} 
          />
        
        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {activeView === 'dashboard' ? (
            <Dashboard 
              accounts={accounts} 
              activeAccountId={status.accountId}
              onSwitch={handleSwitch} 
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onReorder={reorderAccounts}
              onAddAccount={handleOpenAdd}
            />
          ) : (
            <Settings 
              config={config} 
              onUpdate={handleUpdateConfig} 
              onSelectRiotPath={selectRiotPath}
              onCheckUpdates={() => window.ipc.invoke('check-updates')}
              onOpenPinModal={() => setSecurityMode('set')}
              onDisablePin={() => setSecurityMode('disable')}
            />
          )}
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
          window.ipc.invoke('handle-quit-choice', { action: 'quit', dontShowAgain });
          setIsQuitModalOpen(false);
        }}
        onMinimize={(dontShowAgain: boolean) => {
          window.ipc.invoke('handle-quit-choice', { action: 'minimize', dontShowAgain });
          setIsQuitModalOpen(false);
        }}
        onCancel={() => setIsQuitModalOpen(false)}
      />

      <UpdateModal 
        {...updateInfo}
        onUpdate={() => window.ipc.invoke('download-update')}
        onCancel={() => setUpdateInfo({ ...updateInfo, isOpen: false })}
      />

      <LaunchConfirmModal 
        isOpen={launchConfirm.isOpen}
        gameType={launchConfirm.gameType}
        onConfirm={confirmLaunch}
        onCancel={cancelLaunch}
        onClose={() => setLaunchConfirm({ ...launchConfirm, isOpen: false })}
      />
    </div>
  );
};

export default App;
