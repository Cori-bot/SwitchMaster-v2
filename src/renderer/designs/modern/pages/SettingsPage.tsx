import { Config } from '../../../../shared/types';

interface SettingsPageProps {
    config: Config;
    onUpdateConfig: (config: Partial<Config>) => Promise<void>;
    onCheckUpdates: () => void;
    onOpenSecurity: () => void;
    onSelectRiotPath: () => void;
    onOpenGPU: () => void;
}

function SettingsPage({
    config,
    onUpdateConfig,
    onCheckUpdates,
    onOpenSecurity,
    onSelectRiotPath,
    onOpenGPU
}: SettingsPageProps) {

    const handleToggle = (key: keyof Config) => {
        onUpdateConfig({ [key]: !config[key] });
    };

    return (
        <main>
            <h1>Settings</h1>
            <p className="subtitle">Customize your experience.</p>

            {/* GENERAL */}
            <section className="section">
                <h2>General</h2>

                <div className="setting">
                    <span>Réduire SwitchMaster dans la barre des tâches</span>
                    <div
                        className={`toggle ${config.minimizeToTray ? 'active' : ''}`}
                        onClick={() => handleToggle('minimizeToTray')}
                    ></div>
                </div>

                <div className="setting">
                    <span>Configurer le code PIN de sécurité</span>
                    <div className="setting-right-group">
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>
                            {config.security?.enabled ? 'Activé' : 'Désactivé'}
                        </span>
                        <button className="settings-button" onClick={onOpenSecurity}>
                            {config.security?.enabled ? 'Désactiver' : 'Configurer'}
                        </button>
                    </div>
                </div>

                <div className="setting">
                    <span>Accélération GPU (Interface)</span>
                    <div className="setting-right-group">
                        <div
                            className={`toggle ${config.enableGPU ? 'active' : ''}`}
                            onClick={onOpenGPU}
                        ></div>
                    </div>
                </div>

                <div className="setting">
                    <span>Mises à jour automatiques</span>
                    {/* Not implemented in backend yet usually, just UI */}
                    <div
                        className={`toggle ${config.autoUpdate ? 'active' : ''}`}
                        onClick={() => handleToggle('autoUpdate')}
                        title="Activer/Désactiver les mises à jour automatiques"
                    ></div>
                </div>
            </section>

            {/* INTERFACE */}
            <section className="section">
                <h2>Interface</h2>
                <div className="setting">
                    <span>Design de l'application</span>
                    <div className="theme-cards" style={{ maxWidth: '400px' }}>
                        <div
                            className={`theme-card ${config.activeDesignModule !== 'classic' ? 'active' : ''}`}
                            onClick={() => onUpdateConfig({ activeDesignModule: 'modern' })}
                        >
                            <h4>Modern</h4>
                        </div>
                        <div
                            className={`theme-card ${config.activeDesignModule === 'classic' ? 'active' : ''}`}
                            onClick={() => onUpdateConfig({ activeDesignModule: 'classic' })}
                        >
                            <h4>Classic</h4>
                        </div>
                    </div>
                </div>
            </section>

            {/* GAME CLIENTS */}
            <section className="section">
                <h2>Clients de Jeu</h2>

                <div className="setting">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>Chemin Riot Client</span>
                        <span style={{ fontSize: '11px', opacity: 0.5 }}>{config.riotPath}</span>
                    </div>
                    <button className="settings-button" onClick={onSelectRiotPath}>
                        Changer
                    </button>
                </div>
            </section>

            {/* ABOUT */}
            <section className="section">
                <h2>About</h2>

                <div className="setting">
                    <span>Version</span>
                    <div className="setting-right-group">
                        <span>2.5.1</span>
                        <button className="settings-button" onClick={onCheckUpdates}>
                            Vérifier
                        </button>
                    </div>
                </div>

                <div className="setting">
                    <span>Développement</span>
                    <span>lwz, Coridor & Antigravity</span>
                </div>

                <div className="setting">
                    <span>Design</span>
                    <span>lwz, Shadow</span>
                </div>
            </section>
        </main>
    );
}

export default SettingsPage;
