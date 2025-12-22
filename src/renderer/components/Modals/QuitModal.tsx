import React from "react";
import { LogOut } from "lucide-react";
import {
  ICON_SIZE_MEDIUM,
  ANIMATION_DURATION,
  MODAL_ZOOM_IN,
  Z_INDEX_MODAL,
  ACTIVE_SCALE,
} from "./constants";

interface QuitModalProps {
  isOpen: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onMinimize: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const QuitModal: React.FC<QuitModalProps> = ({
  isOpen,
  onConfirm,
  onMinimize,
  onCancel,
}) => {
  if (!isOpen) return null;
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  return (
    <div className={`fixed inset-0 ${Z_INDEX_MODAL} bg-black/60 backdrop-blur-sm flex items-center justify-center p-6`}>
      <div
        className={`bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in ${MODAL_ZOOM_IN} ${ANIMATION_DURATION}`}
      >
        <div className="p-8 overflow-y-auto scrollbar-hide">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <LogOut size={ICON_SIZE_MEDIUM} />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 text-center">
            Quitter ?
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Voulez-vous quitter l'application ou simplement la réduire dans la
            barre système ?
          </p>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => onConfirm(dontShowAgain)}
              className={`w-full px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all ${ACTIVE_SCALE}`}
            >
              Quitter complètement
            </button>
            <button
              onClick={() => onMinimize(dontShowAgain)}
              className={`w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all ${ACTIVE_SCALE}`}
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

          <label
            htmlFor="dontShowAgain"
            className="flex items-center gap-3 cursor-pointer group justify-center"
          >
            <div className="relative flex items-center">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-gray-600 rounded-md transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-500" />
              <svg
                className="absolute w-3.5 h-3.5 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100 left-[3px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">
              Ne plus demander
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
