import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";

interface LaunchGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlay: () => void;
    onNo: () => void;
    gameType: "valorant" | "league" | null;
}

const LaunchGameModal: React.FC<LaunchGameModalProps> = ({
    isOpen,
    onClose,
    onPlay,
    onNo,
    gameType,
}) => {
    if (!isOpen || !gameType) return null;

    const gameName = gameType === "valorant" ? "VALORANT" : "League of Legends";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
                >
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2 border border-blue-500/20">
                            <Play size={32} fill="currentColor" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Options de lancement</h2>
                    <p className="text-gray-400 mb-8">
                        Voulez-vous lancer <span className="text-white font-medium">{gameName}</span> une fois connecté ?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onPlay}
                            className="w-full px-4 py-3.5 rounded-xl font-bold bg-white text-black hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" />
                            Lancer le jeu
                        </button>
                        <button
                            onClick={onNo}
                            className="w-full px-4 py-3.5 rounded-xl font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Non, juste le client
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LaunchGameModal;
