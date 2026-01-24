import { Wallpaper } from '../types';

interface AccountViewProps {
    wallpaper: Wallpaper;
    onClose: () => void;
    onLogin: (id: string) => void;
    isClosing: boolean;
    onToggleFavorite: (id: string) => void;
    isFavorite: boolean;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

function AccountView({ wallpaper, onClose, onLogin, isClosing, onToggleFavorite, isFavorite, onEdit, onDelete }: AccountViewProps) {
    if (!wallpaper) return null;

    return (
        <div className={`wallpaper-view ${isClosing ? 'closing' : 'opening'}`}>
            {/* BACKGROUND */}
            <div
                className="wallpaper-background"
                style={{ backgroundImage: `url(${wallpaper.image})` }}
            ></div>

            {/* BOTTOM BAR */}
            <div className="bottom-bar">
                <div className="info">
                    <div className="back" onClick={onClose}>‹</div>

                    <div className="meta">
                        <h3>{wallpaper.title}</h3>
                        <span>{wallpaper.details}</span>
                    </div>
                </div>

                <div className="actions">
                    <button
                        className="icon-btn"
                        onClick={() => onEdit(wallpaper.id)}
                        title="Edit"
                    >
                        ✎
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => onDelete(wallpaper.id)}
                        title="Delete"
                        style={{ color: '#ff6b6b' }}
                    >
                        🗑
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => onToggleFavorite(wallpaper.id)}
                        style={{ color: isFavorite ? '#ffd700' : 'white' }}
                    >
                        {isFavorite ? '★' : '♡'}
                    </button>
                    <button className="primary-btn" onClick={() => onLogin(wallpaper.id)}>
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AccountView;
