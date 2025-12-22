import React from 'react';
import { X, LogOut, Download, Rocket, AlertCircle, RefreshCw } from 'lucide-react';

interface QuitModalProps {
  isOpen: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onMinimize: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({ isOpen, onConfirm, onMinimize, onCancel }) => {
  if (!isOpen) return null;
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 overflow-y-auto scrollbar-hide">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <LogOut size={32} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 text-center">Quitter ?</h2>
          <p className="text-gray-400 mb-8 text-center">
            Voulez-vous quitter l'application ou simplement la réduire dans la barre système ?
          </p>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => onConfirm(dontShowAgain)}
              className="w-full px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
            >
              Quitter complètement
            </button>
            <button
              onClick={() => onMinimize(dontShowAgain)}
              className="w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
            >
              Réduire dans le tray
            </button>
            <button
              onClick={onCancel}
              className="w-full px-6 py-3 text-gray-500 hover:text-gray-400 font-medium transition-all"
            >
              Annuler
            </button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group justify-center">
            <input 
              type="checkbox" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="peer sr-only"
            />
            <div className="w-5 h-5 border-2 border-gray-600 rounded-md transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-500" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">
              Ne plus demander
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

interface UpdateModalProps {
  isOpen: boolean;
  status: string;
  progress: number;
  version: string;
  releaseNotes?: string;
  error?: string;
  onUpdate: () => void;
  onCancel: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, status, progress, version, releaseNotes, error, onUpdate, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
              <Download size={24} />
            </div>
            <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">
            {status === 'checking' ? 'Recherche...' :
             status === 'available' ? 'Mise à jour disponible' : 
             status === 'downloading' ? 'Téléchargement...' : 
             status === 'downloaded' ? 'Mise à jour prête' : 'Mise à jour'}
          </h2>

          {status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <RefreshCw size={40} className="text-blue-500 animate-spin" />
              <p className="text-gray-400">Vérification des mises à jour...</p>
            </div>
          )}

          {status === 'available' && (
            <>
              <p className="text-gray-400 mb-4">
                Une nouvelle version <span className="text-blue-500 font-bold">v{version}</span> est disponible.
              </p>
              {releaseNotes && (
                <div className="bg-black/20 rounded-xl p-4 mb-6 max-h-40 overflow-y-auto text-sm text-gray-400 border border-white/5 whitespace-pre-wrap">
                  {releaseNotes.replace(/<[^>]*>/g, '')}
                </div>
              )}
              <button
                onClick={onUpdate}
                className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Télécharger maintenant
              </button>
            </>
          )}

          {status === 'downloading' && (
            <div className="space-y-4 py-4">
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === 'downloaded' && (
            <>
              <p className="text-gray-400 mb-6">
                La mise à jour a été téléchargée. L'application doit redémarrer pour l'installer.
              </p>
              <button
                onClick={() => window.ipc.invoke('install-update')}
                className="w-full px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Redémarrer et Installer
              </button>
            </>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-500 mb-4 flex justify-center">
                <AlertCircle size={48} />
              </div>
              <p className="text-gray-400 mb-2 font-bold">Une erreur est survenue</p>
              <p className="text-gray-500 mb-6 text-sm">{error || 'Erreur lors de la mise à jour.'}</p>
              <button
                onClick={onCancel}
                className="w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LaunchConfirmModalProps {
  isOpen: boolean;
  gameType: 'league' | 'valorant';
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export const LaunchConfirmModal: React.FC<LaunchConfirmModalProps> = ({ isOpen, gameType, onConfirm, onCancel, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <div className="p-8 text-center overflow-y-auto scrollbar-hide">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${gameType === 'valorant' ? 'bg-[#ff4655]/10 text-[#ff4655]' : 'bg-blue-600/10 text-blue-500'}`}>
            <img 
              src={`src/assets/${gameType === 'league' ? 'league' : 'valorant'}.png`} 
              alt={gameType} 
              className="w-12 h-12 object-contain" 
            />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Lancer le jeu ?</h2>
          <p className="text-gray-400 mb-8">
            Voulez-vous lancer <span className="text-white font-bold">{gameType === 'valorant' ? 'Valorant' : 'League of Legends'}</span> après la connexion au compte ?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full px-6 py-3.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                gameType === 'valorant' 
                  ? 'bg-[#ff4655] hover:bg-[#ff5e6a] shadow-[#ff4655]/20' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              <Rocket size={18} />
              Oui, lancer le jeu
            </button>
            <button
              onClick={onCancel}
              className="w-full px-6 py-3.5 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-all"
            >
              Non, juste changer le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
