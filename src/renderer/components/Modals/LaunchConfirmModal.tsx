import React from "react";
import { X, Rocket } from "lucide-react";
import valorantIcon from "@assets/games/valorant-icon.svg";
import leagueIcon from "@assets/games/league-of-legends-icon.svg";
import {
  ICON_SIZE_SMALL,
  ICON_SIZE_XSMALL,
  ANIMATION_DURATION,
  MODAL_ZOOM_IN,
  Z_INDEX_MODAL,
  ACTIVE_SCALE,
} from "@/constants/ui";

interface LaunchConfirmModalProps {
  isOpen: boolean;
  gameType: "league" | "valorant";
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export const LaunchConfirmModal: React.FC<LaunchConfirmModalProps> = ({
  isOpen,
  gameType,
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 ${Z_INDEX_MODAL} bg-black/60 backdrop-blur-sm flex items-center justify-center p-6`}>
      <div
        className={`bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in ${MODAL_ZOOM_IN} ${ANIMATION_DURATION} relative`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white transition-colors"
        >
          <X size={ICON_SIZE_SMALL} />
        </button>
        <div className="p-8 text-center overflow-y-auto scrollbar-hide">
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${gameType === "valorant" ? "bg-[#ff4655]/10 text-[#ff4655]" : "bg-blue-600/10 text-blue-500"}`}
          >
            <img
              src={gameType === "league" ? leagueIcon : valorantIcon}
              alt={gameType}
              className="w-12 h-12 object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            Lancer le jeu ?
          </h2>
          <p className="text-gray-400 mb-8">
            Voulez-vous lancer{" "}
            <span className="text-white font-bold">
              {gameType === "valorant" ? "Valorant" : "League of Legends"}
            </span>{" "}
            après la connexion au compte ?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full px-6 py-3.5 text-white rounded-xl font-bold shadow-lg transition-all ${ACTIVE_SCALE} flex items-center justify-center gap-2 ${gameType === "valorant"
                  ? "bg-[#ff4655] hover:bg-[#ff5e6a] shadow-[#ff4655]/20"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                }`}
            >
              <Rocket size={ICON_SIZE_XSMALL} />
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
