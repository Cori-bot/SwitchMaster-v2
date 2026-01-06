import React from "react";
import { Monitor } from "lucide-react";
import {
  ICON_SIZE_MEDIUM,
  ANIMATION_DURATION,
  MODAL_ZOOM_IN,
  Z_INDEX_MODAL,
  ACTIVE_SCALE,
} from "@/constants/ui";

interface GPUConfirmModalProps {
  isOpen: boolean;
  targetValue: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GPUConfirmModal: React.FC<GPUConfirmModalProps> = ({
  isOpen,
  targetValue,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${Z_INDEX_MODAL} bg-black/60 backdrop-blur-sm flex items-center justify-center p-6`}
    >
      <div
        className={`bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in ${MODAL_ZOOM_IN} ${ANIMATION_DURATION}`}
      >
        <div className="p-8">
          <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-6">
            <Monitor size={ICON_SIZE_MEDIUM} />
          </div>

          <h2 className="text-2xl font-black text-white mb-2 text-center">
            Redémarrage requis
          </h2>

          <p className="text-gray-400 mb-8 text-center text-sm leading-relaxed">
            {targetValue
              ? "L'activation de l'accélération matérielle utilisera votre GPU pour fluidifier l'interface. Un redémarrage est nécessaire pour appliquer ce changement."
              : "La désactivation de l'accélération matérielle soulagera votre matériel mais pourra dégrader la fluidité de l'interface. Un redémarrage est nécessaire."}
            <br />
            <br />
            Voulez-vous redémarrer maintenant ?
          </p>

          <div className="space-y-3">
            <button
              onClick={onConfirm}
              className={`w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all ${ACTIVE_SCALE}`}
            >
              Changer et redémarrer
            </button>
            <button
              onClick={onCancel}
              className={`w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all ${ACTIVE_SCALE}`}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
