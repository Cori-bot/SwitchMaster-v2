import { Wallpaper } from '../types';
import riotBanner from '../../../../assets/launchers/riot-banner.svg';
import steamBanner from '../../../../assets/launchers/steam-banner.svg';
import epicBanner from '../../../../assets/launchers/epicgames-banner.svg';
import bnetBanner from '../../../../assets/launchers/battlenet-banner.svg';
import eaBanner from '../../../../assets/launchers/ea-banner.svg';
import ubiBanner from '../../../../assets/launchers/ubisoft-banner.svg';

interface GamesPageProps {
    onWallpaperClick?: (wallpaper: Wallpaper) => void;
}

function GamesPage({ onWallpaperClick }: GamesPageProps) {

    const wallpapers: Wallpaper[] = [
        {
            id: 'launcher-riot',
            image: riotBanner,
            title: 'Riot Client',
            category: 'Riot Games',
            details: '3840×2144 · 9MB · 0:06s'
        },
        {
            id: 'launcher-steam',
            image: steamBanner,
            title: 'Steam',
            category: 'Steam',
            details: '3840×2144 · 9MB · 0:06s'
        },
        {
            id: 'launcher-epicgames',
            image: epicBanner,
            title: 'Epic Games',
            category: 'Epic',
            details: '3840×2144 · 9MB · 0:06s'
        },
        {
            id: 'launcher-battlenet',
            image: bnetBanner,
            title: 'Battle.net',
            category: 'Blizzard',
            details: '3840×2144 · 9MB · 0:06s'
        },
        {
            id: 'launcher-ea',
            image: eaBanner,
            title: 'EA App',
            category: 'EA Sports',
            details: '3840×2144 · 9MB · 0:06s'
        },
        {
            id: 'launcher-ubisoft',
            image: ubiBanner,
            title: 'Ubisoft Connect',
            category: 'Ubisoft',
            details: '3840×2144 · 9MB · 0:06s'
        }
    ];

    return (
        <main>
            <h1>Games</h1>
            <p className="subtitle">Manage your games clients.</p>

            {/* GRID */}
            <section className="grid">
                {wallpapers.map((wallpaper) => (
                    <article
                        key={wallpaper.id}
                        className="card"
                        onClick={() => onWallpaperClick?.(wallpaper)}
                    >
                        <img src={wallpaper.image} alt={wallpaper.title} />
                        <div className="card-info">
                            <h3>{wallpaper.title}</h3>
                            <span>{wallpaper.category}</span>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    );
}

export default GamesPage;
