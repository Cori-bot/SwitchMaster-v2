import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RefreshCw, X } from "lucide-react";
import { Account } from "@/hooks/useAccounts";

interface ReconnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (delay: number) => void;
    account: Account | null;
    currentDelay: number;
}

const ReconnectModal: React.FC<ReconnectModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    account,
    currentDelay,
}) => {
    const [delay, setDelay] = useState(currentDelay / 1000);

    useEffect(() => {
        if (isOpen) {
            setDelay(currentDelay / 1000);
        }
    }, [isOpen, currentDelay]);

    if (!isOpen || !account) return null;

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
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            Reconnexion
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-gray-300 mb-6 leading-relaxed">
                        Vous êtes sur le point de relancer la connexion pour le compte{" "}
                        <span className="font-bold text-white">{account.name}</span>.<br />
                        Si le lanceur Riot met du temps à s'ouvrir, augmentez le délai ci-dessous.
                    </p>

                    {/* Delay Input */}
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5 mb-8">
                        <label className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                            <Clock size={14} /> Délai d'attente (secondes)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="5"
                                max="60"
                                step="1"
                                value={delay}
                                onChange={(e) => setDelay(Number(e.target.value))}
                                className="flex-1 accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="font-mono text-xl font-bold text-blue-500 min-w-[3ch] text-right">
                                {delay}s
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/5"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={() => onConfirm(delay * 1000)}
                            className="flex-1 px-4 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/20"
                        >
                            Lancer la connexion
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ReconnectModal;
