import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { DesignProps } from '../types';
import { PageName, Wallpaper } from './types';
import AccountsPage from './pages/AccountsPage';
import GamesPage from './pages/GamesPage';
import SettingsPage from './pages/SettingsPage';
import AccountView from './components/AccountView';
import GameView from './components/GameView';
import AddAccountModal from "../../components/AddAccountModal";
import { Account } from "../../../shared/types";
import "./modern.css";

// Assets for logo
import LogoIcon from '@assets/switchmaster/switchmaster-icon.svg'; // Use V2 logo as fallback

export const ModernLayout: React.FC<DesignProps> = ({
    accounts,
    config,
    actions,
    systemActions,
}) => {
    const [activePage, setActivePage] = useState<PageName>('Accounts');
    const [displayPage, setDisplayPage] = useState<PageName>('Accounts');
    const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
    const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
    const [isWallpaperClosing, setIsWallpaperClosing] = useState<boolean>(false);

    const handlePageChange = (newPage: PageName) => {
        if (newPage !== activePage) {
            setIsTransitioning(true);
            setTimeout(() => {
                setActivePage(newPage);
                setDisplayPage(newPage);
                setTimeout(() => {
                    setIsTransitioning(false);
                }, 30);
            }, 200);
        }
    };

    const handleWallpaperClick = (wallpaper: Wallpaper) => {
        setSelectedWallpaper(wallpaper);
        setIsWallpaperClosing(false);
    };

    const handleCloseWallpaper = () => {
        setIsWallpaperClosing(true);
        setTimeout(() => {
            setSelectedWallpaper(null);
            setIsWallpaperClosing(false);
        }, 250);
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

    const handleEdit = (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (acc) {
            setAccountToEdit(acc);
            setIsAddModalOpen(true);
            // Close wallpaper view if open
            handleCloseWallpaper();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this account?")) {
            await actions.deleteAccount(id);
            handleCloseWallpaper();
        }
    };

    const handleAddAccount = async (data: Partial<Account>) => {
        if (accountToEdit) {
            await actions.updateAccount({ ...accountToEdit, ...data } as Account);
        } else {
            await actions.addAccount(data);
        }
        setIsAddModalOpen(false);
        setAccountToEdit(null);
    };

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
        setAccountToEdit(null);
    };

    const handleLogin = async (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (acc) {
            await actions.login(acc, true);
        }
    };

    const favIds = accounts.filter(a => a.isFavorite).map(a => a.id);

    return (
        <div className="modern-layout">
            {/* NAVBAR */}
            {!selectedWallpaper && (
                <>
                    <header className="top-nav">
                        <nav className="nav-pill">
                            <div className="nav-logo" style={{ cursor: 'pointer' }}>
                                <img
                                    src={LogoIcon}
                                    alt="Logo"
                                />
                            </div>
                            <button
                                className={activePage === 'Accounts' ? 'active' : ''}
                                onClick={() => handlePageChange('Accounts')}
                            >
                                Accounts
                            </button>
                            <button
                                className={activePage === 'Games' ? 'active' : ''}
                                onClick={() => handlePageChange('Games')}
                            >
                                Games
                            </button>
                        </nav>
                        <button
                            className={`settings-nav-btn ${activePage === 'Settings' ? 'active' : ''}`}
                            onClick={() => handlePageChange('Settings')}
                            title="Settings"
                        >
                            <Settings size={18} />
                        </button>
                    </header>
                </>
            )}

            {/* MAIN */}
            {!selectedWallpaper && (
                <div className={`page-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
                    {displayPage === 'Accounts' && (
                        <AccountsPage
                            accounts={accounts}
                            favorites={favIds}
                            onToggleFavorite={actions.toggleFavorite}
                            onWallpaperClick={handleWallpaperClick}
                            onAddAccount={() => {
                                setAccountToEdit(null);
                                setIsAddModalOpen(true);
                            }}
                        />
                    )}
                    {displayPage === 'Games' && (
                        <GamesPage onWallpaperClick={handleWallpaperClick} />
                    )}
                    {displayPage === 'Settings' && (
                        <SettingsPage
                            config={config}
                            onUpdateConfig={systemActions.updateConfig}
                            onCheckUpdates={systemActions.checkUpdates}
                            onOpenSecurity={() => systemActions.openSecurityModal('set')}
                            onSelectRiotPath={systemActions.selectRiotPath}
                            onOpenGPU={() => systemActions.openGpuModal(true)}
                        />
                    )}
                </div>
            )}

            {/* VIEW */}
            {selectedWallpaper && (
                activePage === 'Games' ? (
                    <GameView
                        wallpaper={selectedWallpaper}
                        onClose={handleCloseWallpaper}
                        isClosing={isWallpaperClosing}
                    />
                ) : (
                    <AccountView
                        wallpaper={selectedWallpaper}
                        onClose={handleCloseWallpaper}
                        onLogin={handleLogin}
                        isClosing={isWallpaperClosing}
                        onToggleFavorite={(id) => {
                            const acc = accounts.find(a => a.id === id);
                            if (acc) actions.toggleFavorite(acc);
                        }}
                        isFavorite={favIds.includes(selectedWallpaper.id)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                )
            )}

            <AddAccountModal
                isOpen={isAddModalOpen}
                onClose={handleCloseAddModal}
                onAdd={handleAddAccount}
                editingAccount={accountToEdit}
            />
        </div>
    );
};
