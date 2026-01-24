import React, { useState, useMemo } from 'react';
import { Star } from 'lucide-react';
import { Wallpaper } from '../types';
import { Account } from '../../../../shared/types';

interface AccountsPageProps {
    accounts: Account[];
    onWallpaperClick?: (wallpaper: Wallpaper) => void;
    favorites: string[]; // IDs
    onToggleFavorite: (account: Account) => Promise<void>;
    onAddAccount: () => void;
}

function AccountsPage({ accounts, onWallpaperClick, favorites, onToggleFavorite, onAddAccount }: AccountsPageProps) {
    // Icons Helper Functions (Moved up for useMemo access)

    // Fonction pour obtenir le chemin de l'icône du jeu
    const getGameIcon = (game?: string): string | null => {
        if (!game) return null;
        try {
            if (game === 'valorant') {
                return new URL('../../../../assets/games/valorant-icon.svg', import.meta.url).href;
            } else if (game === 'league-of-legends' || game === 'league') {
                return new URL('../../../../assets/games/league-of-legends-icon.svg', import.meta.url).href;
            }
        } catch (e) {
            console.error("Icon not found", e);
        }
        return null;
    };

    // Fonction pour formater le rang pour correspondre aux noms de fichiers
    const formatRankForAsset = (game: string, rank: string): string | null => {
        if (!rank) return null;
        const lowerRank = rank.toLowerCase();

        if (game === 'league-of-legends' || game === 'league') {
            const baseRank = lowerRank.split(' ')[0];
            return baseRank;
        } else if (game === 'valorant') {
            return lowerRank.replace(' ', '_');
        }
        return lowerRank;
    };

    // Fonction pour obtenir le chemin de l'icône de rang
    const getRankIcon = (game?: string, rank?: string): string | null => {
        if (!game || !rank) return null;
        const gameFolder = game === 'league' ? 'league-of-legends' : game;
        const rankFile = formatRankForAsset(gameFolder!, rank);
        if (!rankFile) return null;
        try {
            return new URL(`../../../../assets/games/${gameFolder}/${rankFile}.svg`, import.meta.url).href;
        } catch (e) {
            return null;
        }
    };
    // Adapter Pattern: Convert Account[] to Wallpaper[]
    const wallpapers: Wallpaper[] = useMemo(() => {
        return accounts.map(acc => {
            const isLeague = acc.gameType === 'league';

            // Parse Rank from stats
            // V2 stats: { rank: "Diamond 1" }
            // V3 requires formatting or we just use text/generic icon?
            // Let's rely on text for now or try to map if asset existed. Use generic game icon as fallback.

            return {
                id: acc.id,
                image: acc.cardImage || (isLeague ? getGameIcon('league') || '' : getGameIcon('valorant') || ''), // TODO: Default backgrounds
                title: acc.name || 'Unknown',
                category: acc.riotId || (acc.username && acc.username.length < 30 ? acc.username : 'No Riot ID'),
                details: acc.stats?.rank || 'Unranked',
                game: acc.gameType, // 'valorant' | 'league'
                rank: acc.stats?.rank,
                account: acc
            };
        });
    }, [accounts]);

    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const handleToggleFavorite = (e: React.MouseEvent, account: Account) => {
        e.stopPropagation();
        // V2 Toggle Favorite is async
        onToggleFavorite(account);
    };

    const handleFilterClick = (filterName: string) => {
        if (activeFilter === filterName) {
            setActiveFilter(null);
        } else {
            setActiveFilter(filterName);
        }
    };

    // Filter Logic
    const filteredWallpapers = useMemo(() => {
        let result = wallpapers;

        if (activeFilter === 'favorites') {
            result = result.filter(w => favorites.includes(w.id));
        } else if (activeFilter) {
            // Launcher filters
            // V2 Account has launcherType: 'riot' | 'steam' | 'epic' ...
            const mapLauncher: Record<string, string> = {
                'Steam': 'steam',
                'Riot Client': 'riot',
                'Epic Games': 'epic',
                'Battle.net': 'battlenet',
                //...
            };
            const target = mapLauncher[activeFilter];
            if (target) {
                result = result.filter(w => w.account?.launcherType === target);
            }
        }
        return result;
    }, [wallpapers, activeFilter, favorites]);


    return (
        <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h1>Accounts</h1>
                <button
                    className="icon-btn"
                    onClick={onAddAccount}
                    style={{ width: '32px', height: '32px', fontSize: '20px', background: 'rgba(255,255,255,0.1)' }}
                    title="Add Account"
                >
                    +
                </button>
            </div>
            <p className="subtitle">Add, remove and manage your accounts.</p>

            {/* FILTERS */}
            <div className="filters">
                <div
                    className={`filter filter-favorite ${activeFilter === 'favorites' ? 'active' : ''}`}
                    onClick={() => handleFilterClick('favorites')}
                >
                    <Star size={14} fill={activeFilter === 'favorites' ? 'currentColor' : 'none'} />
                </div>
                <div
                    className={`filter ${activeFilter === 'Steam' ? 'active' : ''}`}
                    onClick={() => handleFilterClick('Steam')}
                >
                    Steam
                </div>
                <div
                    className={`filter ${activeFilter === 'Riot Client' ? 'active' : ''}`}
                    onClick={() => handleFilterClick('Riot Client')}
                >
                    Riot Client
                </div>
                {/* More filters... */}
            </div>

            {/* GRID */}
            <section className="grid">
                {filteredWallpapers.map((wallpaper) => {
                    const isFavorite = favorites.includes(wallpaper.id);

                    return (
                        <article
                            key={wallpaper.id}
                            className="card"
                            onClick={() => onWallpaperClick?.(wallpaper)}
                        >
                            <img src={wallpaper.image} alt={wallpaper.title} />
                            <div className="card-icons-container">
                                {getGameIcon(wallpaper.game) && (
                                    <div className="card-game-icon">
                                        <img src={getGameIcon(wallpaper.game)!} alt={wallpaper.game} />
                                    </div>
                                )}
                                {getRankIcon(wallpaper.game, wallpaper.rank) && (
                                    <div className="card-rank-icon">
                                        <img src={getRankIcon(wallpaper.game, wallpaper.rank)!} alt={wallpaper.rank} />
                                    </div>
                                )}
                            </div>
                            <button
                                className={`favorite-icon ${isFavorite ? 'active' : ''}`}
                                onClick={(e) => handleToggleFavorite(e, wallpaper.account!)}
                                title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            <div className="card-info">
                                <h3>{wallpaper.title}</h3>
                                <span>{wallpaper.category}</span>
                                <span style={{ display: 'block', opacity: 0.7, fontSize: '10px' }}>{wallpaper.details}</span>
                            </div>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}

export default AccountsPage;
