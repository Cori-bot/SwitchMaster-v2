import React, { useState, useEffect } from 'react';
import { X, User, Hash, Image as ImageIcon, CheckCircle2, AlertCircle, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { Account } from '../hooks/useAccounts';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: Partial<Account> & { username?: string; password?: string }) => void;
  editingAccount: Account | null;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd, editingAccount }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [riotId, setRiotId] = useState('');
  const [gameType, setGameType] = useState<'league' | 'valorant'>('valorant');
  const [cardImage, setCardImage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchCreds = async () => {
      if (!editingAccount) {
        setName('');
        setRiotId('');
        setUsername('');
        setPassword('');
        setGameType('valorant');
        setCardImage('');
        return;
      }

      setName(editingAccount.name || '');
      setRiotId(editingAccount.riotId || '');
      setGameType(editingAccount.gameType || 'valorant');
      setCardImage(editingAccount.cardImage || '');
      
      try {
        const creds = await window.ipc.invoke('get-account-credentials', editingAccount.id);
        if (creds) {
          setUsername(creds.username || '');
          setPassword(creds.password || '');
        }
      } catch (err) {
        console.error('Failed to fetch credentials:', err);
      }
    };
    
    if (isOpen) {
      fetchCreds();
    }
  }, [editingAccount, isOpen]);

  const handleSelectImage = async () => {
    const path = await window.ipc.invoke('select-account-image');
    if (path) setCardImage(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim() || !riotId.trim()) return;
    
    onAdd({
      id: editingAccount?.id,
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      riotId: riotId.trim(),
      gameType,
      cardImage
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#1a1a1a] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-white">
            {editingAccount ? 'Modifier le compte' : 'Ajouter un compte'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                Nom du compte
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mon Compte Principal"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                  Nom d'utilisateur
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    <Key size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                Riot ID
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="Ex: Nom#TAG"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                Jeu
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setGameType('valorant')}
                  className={`flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                    gameType === 'valorant'
                      ? 'bg-[#ff4655]/10 border-[#ff4655] text-white shadow-lg shadow-[#ff4655]/10'
                      : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10'
                  }`}
                >
                  <img src="src/assets/valorant.png" alt="Val" className="w-5 h-5 object-contain" />
                  <span className="font-bold">Valorant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGameType('league')}
                  className={`flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                    gameType === 'league'
                      ? 'bg-blue-600/10 border-blue-600 text-white shadow-lg shadow-blue-600/10'
                      : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10'
                  }`}
                >
                  <img src="src/assets/league.png" alt="LoL" className="w-5 h-5 object-contain" />
                  <span className="font-bold">League of Legends</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                Image de fond (URL ou Fichier)
              </label>
              <div className="space-y-3">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    <ImageIcon size={18} />
                  </div>
                  <input
                    type="text"
                    value={cardImage.startsWith('http') ? cardImage : ''}
                    onChange={(e) => setCardImage(e.target.value)}
                    placeholder="Entrez l'URL de l'image..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Ou</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <button
                  type="button"
                  onClick={handleSelectImage}
                  className="w-full flex items-center justify-between p-3.5 bg-black/40 border border-white/10 rounded-xl hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <div className="text-sm font-medium text-gray-300">
                        {(!cardImage.startsWith('http') && cardImage) ? 'Fichier sélectionné' : 'Sélectionner un fichier local'}
                      </div>
                      {(!cardImage.startsWith('http') && cardImage) && (
                        <div className="text-[10px] text-gray-500 truncate">
                          {cardImage}
                        </div>
                      )}
                    </div>
                  </div>
                  {(!cardImage.startsWith('http') && cardImage) && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            >
              {editingAccount ? 'Sauvegarder' : 'Ajouter le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
