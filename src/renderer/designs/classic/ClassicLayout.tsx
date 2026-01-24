import React, { useState } from "react";
import Dashboard from "../../components/Dashboard";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import Settings from "../../components/Settings";
import AddAccountModal from "../../components/AddAccountModal";
import { DesignProps } from "../types";
import { Account } from "../../../shared/types";
import { AnimatePresence, motion } from "framer-motion";
import NotificationItem from "../../components/NotificationItem";
import { useNotifications } from "../../hooks/useNotifications";

export const ClassicLayout: React.FC<DesignProps> = ({
    accounts,
    activeAccountId,
    config,
    status,
    actions,
    systemActions,
    onSwitchSession,
}) => {
    const [view, setView] = useState("dashboard");
    const [filter, setFilter] = useState<
        "all" | "favorite" | "valorant" | "league"
    >("all");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

    const { notifications, removeNotification } = useNotifications();

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
                        <Dashboard
                            accounts={accounts}
                            filter={filter}
                            activeAccountId={activeAccountId || undefined}
                            onSwitch={onSwitchSession}
                            onDelete={actions.deleteAccount}
                            onEdit={handleEdit}
                            onToggleFavorite={actions.toggleFavorite}
                            onReorder={actions.reorderAccounts}
                            onAddAccount={() => setIsAddModalOpen(true)}
                        />
                    }

                    {view === "settings" && (
                        <Settings
                            config={config}
                            onUpdate={systemActions.updateConfig}
                            onSelectRiotPath={systemActions.selectRiotPath}
                            onOpenPinModal={() => systemActions.openSecurityModal("set")}
                            onDisablePin={() => systemActions.openSecurityModal("disable")}
                            onCheckUpdates={systemActions.checkUpdates}
                            onOpenGPUModal={systemActions.openGpuModal}
                        />
                    )}
                </main>
            </div>

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
        </div>
    );
};
