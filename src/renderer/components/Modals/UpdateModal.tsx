import React from "react";
import { X, Download, RefreshCw, AlertCircle } from "lucide-react";
import {
  ICON_SIZE_LARGE,
  ICON_SIZE_NORMAL,
  ICON_SIZE_SMALL,
  ICON_SIZE_XSMALL,
  ANIMATION_DURATION,
  ACTIVE_SCALE,
  ANIMATION_DURATION_LONG,
  MODAL_ZOOM_IN,
  Z_INDEX_MODAL,
} from "@/constants/ui";

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

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  status,
  progress,
  version,
  releaseNotes,
  error,
  onUpdate,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getStatusTitle = () => {
    switch (status) {
      case "checking":
        return "Recherche...";
      case "available":
        return "Mise à jour disponible";
      case "downloading":
        return "Téléchargement...";
      case "downloaded":
        return "Mise à jour prête";
      case "not-available":
        return "Application à jour";
      case "error":
        return "Erreur";
      default:
        return "Mise à jour";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "not-available":
        return <RefreshCw size={ICON_SIZE_NORMAL} />;
      case "error":
        return <AlertCircle size={ICON_SIZE_NORMAL} />;
      default:
        return <Download size={ICON_SIZE_NORMAL} />;
    }
  };

  const getIconBgColor = () => {
    switch (status) {
      case "not-available":
        return "bg-green-600/10 text-green-500";
      case "error":
        return "bg-red-600/10 text-red-500";
      default:
        return "bg-blue-600/10 text-blue-500";
    }
  };

  return (
    <div
      className={`fixed inset-0 ${Z_INDEX_MODAL} bg-black/60 backdrop-blur-sm flex items-center justify-center p-6`}
    >
      <div
        className={`bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in ${MODAL_ZOOM_IN} ${ANIMATION_DURATION}`}
      >
        <div className="p-8 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-start mb-6">
            <div
              className={`w-12 h-12 ${getIconBgColor()} rounded-xl flex items-center justify-center`}
            >
              {getIcon()}
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={ICON_SIZE_SMALL} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">
            {getStatusTitle()}
          </h2>

          {status === "checking" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <RefreshCw size={40} className="text-blue-500 animate-spin" />
              <p className="text-gray-400">Vérification des mises à jour...</p>
            </div>
          )}

          {status === "not-available" && (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-6">
                Vous utilisez déjà la dernière version de SwitchMaster.
              </p>
              <button
                onClick={onCancel}
                className="w-full px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Super !
              </button>
            </div>
          )}

          {status === "available" && (
            <>
              <p className="text-gray-400 mb-4">
                Une nouvelle version{" "}
                <span className="text-blue-500 font-bold">v{version}</span> est
                disponible.
              </p>
              {releaseNotes && (
                <div className="bg-black/20 rounded-xl p-4 mb-6 max-h-40 overflow-y-auto text-sm text-gray-400 border border-white/5 whitespace-pre-wrap">
                  {releaseNotes.replace(/<[^>]*>/g, "")}
                </div>
              )}
              <button
                onClick={onUpdate}
                className={`w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all ${ACTIVE_SCALE} flex items-center justify-center gap-2`}
              >
                <Download size={ICON_SIZE_XSMALL} />
                Télécharger maintenant
              </button>
            </>
          )}

          {status === "downloading" && (
            <div className="space-y-4 py-4">
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-blue-600 transition-all ${ANIMATION_DURATION_LONG}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Progression</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}

          {status === "downloaded" && (
            <>
              <p className="text-gray-400 mb-6">
                La mise à jour a été téléchargée. L'application doit redémarrer
                pour l'installer.
              </p>
              <button
                onClick={() => window.ipc.invoke("install-update")}
                className={`w-full px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all ${ACTIVE_SCALE} flex items-center justify-center gap-2`}
              >
                <RefreshCw size={ICON_SIZE_XSMALL} />
                Redémarrer et Installer
              </button>
            </>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="text-red-500 mb-4 flex justify-center">
                <AlertCircle size={ICON_SIZE_LARGE} />
              </div>
              <p className="text-gray-400 mb-2 font-bold">
                Une erreur est survenue
              </p>
              <p className="text-gray-500 mb-6 text-sm">
                {error || "Erreur lors de la mise à jour."}
              </p>
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
