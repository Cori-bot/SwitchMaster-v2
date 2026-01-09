import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Hash,
  Key,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Account } from "../hooks/useAccounts";

import {
  ICON_SIZE_MEDIUM,
  ICON_SIZE_SMALL,
  ANIMATION_DURATION,
  ACTIVE_SCALE,
  MODAL_ZOOM_IN,
  Z_INDEX_MODAL,
} from "@/constants/ui";

import { devError } from "../utils/logger";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    account: Partial<Account> & { username?: string; password?: string },
  ) => void;
  editingAccount: Account | null;
}

import GameSelector from "./AddAccount/GameSelector";
import ImageSelector from "./AddAccount/ImageSelector";

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  editingAccount,
}) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [riotId, setRiotId] = useState("");
  const [gameType, setGameType] = useState<"league" | "valorant">("valorant");
  const [cardImage, setCardImage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchCreds = async () => {
      if (!editingAccount) {
        setName("");
        setRiotId("");
        setUsername("");
        setPassword("");
        setGameType("valorant");
        setCardImage("");
        return;
      }

      setName(editingAccount.name || "");
      setRiotId(editingAccount.riotId || "");
      setGameType(editingAccount.gameType || "valorant");
      setCardImage(editingAccount.cardImage || "");

      try {
        const creds = await window.ipc.invoke(
          "get-account-credentials",
          editingAccount.id,
        );
        if (!creds) return;

        setUsername(creds.username || "");
        setPassword(creds.password || "");
      } catch (err) {
        devError("Failed to fetch credentials:", err);
      }
    };

    if (isOpen) {
      fetchCreds();
    }
  }, [editingAccount, isOpen]);

  const handleSelectImage = async () => {
    const path = await window.ipc.invoke("select-account-image");
    if (path) setCardImage(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim() || !riotId.trim())
      return;

    onAdd({
      id: editingAccount?.id,
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      riotId: riotId.trim(),
      gameType,
      cardImage,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${Z_INDEX_MODAL} flex items-center justify-center p-6`}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in ${MODAL_ZOOM_IN} ${ANIMATION_DURATION}`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-white">
            {editingAccount ? "Modifier le compte" : "Ajouter un compte"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
            aria-label="Fermer"
            title="Fermer"
          >
            <X size={ICON_SIZE_MEDIUM} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto scrollbar-hide"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                Nom du compte
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                  <User size={ICON_SIZE_SMALL} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mon Compte Principal"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 
                      text-white placeholder:text-gray-600 focus:outline-none 
                      focus:border-blue-500/50 transition-all"
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
                    <Key size={ICON_SIZE_SMALL} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 
                      text-white placeholder:text-gray-600 focus:outline-none 
                      focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={ICON_SIZE_SMALL} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 
                      text-white placeholder:text-gray-600 focus:outline-none 
                      focus:border-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <EyeOff size={ICON_SIZE_SMALL} />
                    ) : (
                      <Eye size={ICON_SIZE_SMALL} />
                    )}
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
                  <Hash size={ICON_SIZE_SMALL} />
                </div>
                <input
                  type="text"
                  required
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="Ex: Nom#TAG"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 
                    text-white placeholder:text-gray-600 focus:outline-none 
                    focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <GameSelector
              gameType={gameType}
              setGameType={setGameType}
              animationDuration={ANIMATION_DURATION}
            />

            <ImageSelector
              cardImage={cardImage}
              setCardImage={setCardImage}
              onSelectLocal={handleSelectImage}
              iconSizeMedium={ICON_SIZE_MEDIUM}
              iconSizeSmall={ICON_SIZE_SMALL}
            />
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
              className={`flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl 
                font-bold shadow-lg shadow-blue-600/20 transition-all ${ACTIVE_SCALE}`}
            >
              {editingAccount ? "Sauvegarder" : "Ajouter le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;
