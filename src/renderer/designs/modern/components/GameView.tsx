import { useState, useRef, useEffect } from 'react';
import { Wallpaper } from '../types';

interface GameViewProps {
    wallpaper: Wallpaper;
    onClose: () => void;
    isClosing: boolean;
}

function GameView({ wallpaper, onClose, isClosing }: GameViewProps) {
    if (!wallpaper) return null;

    const isRiotClient = wallpaper.title === 'Riot Client';
    const formContainerRef = useRef<HTMLDivElement>(null);
    const backBtnRef = useRef<HTMLButtonElement>(null);

    // Fonction pour générer un faux chemin ou réel (à connecter à la config)
    // Pour l'instant on garde le mock mais on pourrait injecter la config
    const getFakePath = (title: string): string => {
        const paths: Record<string, string> = {
            'Riot Client': 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
            'Steam': 'C:\\Program Files (x86)\\Steam\\steam.exe',
            // ...
        };
        return paths[title] || 'C:\\Games\\...';
    };

    // Liste des jeux détectés pour Riot Client
    const getDetectedGames = (): string[] => {
        return ['Valorant', 'League of Legends'];
    };

    // Fonction pour obtenir le chemin du logo du jeu
    // Note: assets need to be available. We might need to copy them from previous design or use online placeholder?
    // User provided URLs in AccountsPage sample, but GameView uses local assets.
    // I will try to use the existing assets if any, or just fail safely with alt text.
    const getGameIcon = (gameName: string): string | null => {
        try {
            if (gameName === 'Valorant') {
                return new URL('../../../../assets/games/valorant-icon.svg', import.meta.url).href;
            } else if (gameName === 'League of Legends') {
                return new URL('../../../../assets/games/league-of-legends-icon.svg', import.meta.url).href;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    };

    const [clientPath] = useState<string>(getFakePath(wallpaper.title));
    const [detectedGames] = useState<string[]>(getDetectedGames());

    useEffect(() => {
        const updateButtonPosition = () => {
            if (formContainerRef.current && backBtnRef.current) {
                const containerRect = formContainerRef.current.getBoundingClientRect();
                const topPosition = containerRect.top;
                backBtnRef.current.style.setProperty('top', `${topPosition}px`, 'important');
            }
        };

        const initialTimer = setTimeout(updateButtonPosition, 100);
        const animationTimer = setTimeout(updateButtonPosition, 350);
        window.addEventListener('resize', updateButtonPosition);
        const resizeObserver = new ResizeObserver(updateButtonPosition);
        if (formContainerRef.current) {
            resizeObserver.observe(formContainerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateButtonPosition);
            clearTimeout(initialTimer);
            clearTimeout(animationTimer);
            resizeObserver.disconnect();
        };
    }, [isRiotClient, clientPath, detectedGames, isClosing]);

    const handleChangePath = () => {
        console.log('Change Path Clicked');
    };

    return (
        <div className={`wallpaper-view ${isClosing ? 'closing' : 'opening'}`}>
            <div
                className="wallpaper-background"
                style={{ backgroundImage: `url(${wallpaper.image})` }}
            ></div>

            <button ref={backBtnRef} className="back-btn" onClick={onClose}>‹</button>

            <div ref={formContainerRef} className="bottom-bar form-container">
                <div className="form-header">
                    <h3>{wallpaper.title}</h3>
                </div>

                <div className="form-content">
                    <div className="form-group">
                        <label htmlFor="client-path">Client Path</label>
                        <div className="input-group">
                            <input
                                id="client-path"
                                type="text"
                                value={clientPath}
                                readOnly
                                className="path-input"
                            />
                            <button className="change-path-btn" onClick={handleChangePath}>
                                Change Path
                            </button>
                        </div>
                    </div>

                    {isRiotClient && (
                        <div className="form-group">
                            <label>Detected Games</label>
                            <div className="games-icons-list" style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                {detectedGames.map((gameName) => {
                                    const icon = getGameIcon(gameName);
                                    return icon ? (
                                        <div key={gameName} className="game-icon-item" title={gameName}>
                                            <img src={icon} alt={gameName} className="game-icon" style={{ width: '40px', height: '40px' }} />
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default GameView;
