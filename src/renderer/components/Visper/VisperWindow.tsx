import React, { useState, useRef, useEffect } from "react";
import visperLogo from "@assets/visper_logo.png";
import { useVisperAuth } from "../../hooks/useVisperAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

const getRankName = (tier: number) => {
    if (tier >= 27) return "Radiant";
    if (tier >= 24) return `Immortal ${(tier - 24) + 1}`;
    if (tier >= 21) return `Ascendant ${(tier - 21) + 1}`;
    if (tier >= 18) return `Diamond ${(tier - 18) + 1}`;
    if (tier >= 15) return `Platinum ${(tier - 15) + 1}`;
    if (tier >= 12) return `Gold ${(tier - 12) + 1}`;
    if (tier >= 9) return `Silver ${(tier - 9) + 1}`;
    if (tier >= 6) return `Bronze ${(tier - 6) + 1}`;
    if (tier >= 3) return `Iron ${(tier - 3) + 1}`;
    return "Unranked";
};

const VisperWindow: React.FC = () => {
    const [isValorantOpen, setIsValorantOpen] = useState(false);
    const { session, sessions, loading, checking, login, logout, switchSession, removeSession } = useVisperAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const running = await (window as any).ipc.invoke("is-valorant-running");
                setIsValorantOpen(running);
            } catch (err) {
                console.error("Failed to check Valorant status:", err);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const rankIcon = session?.competitiveTier
        ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${session.competitiveTier}/largeicon.png`
        : `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/0/largeicon.png`;

    const playerCard = session?.playerCardId
        ? `https://media.valorant-api.com/playercards/${session.playerCardId}/displayicon.png`
        : "https://media.valorant-api.com/playercards/9fb3f4ab-4c31-369c-99d9-3f8013f7cfcb/displayicon.png";

    return (
        <div className="h-screen w-screen bg-[#0a0a0a] text-white flex flex-col p-6 overflow-hidden select-none font-sans relative">
            {/* Background Gradient Subtle */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between mb-8 relative z-50 w-full pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto drag select-none">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <img
                            src={visperLogo}
                            alt="Visper"
                            className="relative h-12 w-12 object-contain"
                        />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter leading-none uppercase italic border-b-2 border-blue-600/50 pb-1">Visper</h1>
                        <p className="text-[9px] text-blue-400/80 font-bold uppercase tracking-[0.3em] mt-1.5 ml-1">Intelligence Layer</p>
                    </div>
                </div>

                {session && (
                    <div className="relative z-50 pointer-events-auto no-drag" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-3 bg-white/3 border transition-colors pl-2 pr-3 py-2 rounded-2xl backdrop-blur-md outline-none ${isMenuOpen ? "border-blue-500/50 bg-white/5" : "border-white/5 hover:border-white/10 hover:bg-white/5"}`}
                        >
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                <img src={playerCard} alt="Profile" className="w-full h-full object-cover scale-110" />
                                <div className="absolute bottom-0 right-0 bg-blue-600 px-1 py-0.5 rounded-tl-md text-[8px] font-medium border-t border-l border-white/20">
                                    {session.accountLevel}
                                </div>
                            </div>

                            <div className="flex flex-col justify-center text-left">
                                <div className="flex flex-col">
                                    <span className="text-base font-bold tracking-tight leading-none">{session.gameName}</span>
                                    <span className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">#{session.tagLine}</span>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-white/5 mx-2" />

                            <div className="relative">
                                <img src={rankIcon} alt="Rank" className="w-10 h-10 object-contain relative drop-shadow-md" />
                            </div>

                            <ChevronDown size={16} className={`text-white/30 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full right-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col no-drag"
                                >
                                    <div className="p-3 border-b border-white/5">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 mb-2">Comptes enregistrés</div>
                                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                            {sessions.filter(s => s.puuid !== session.puuid).map((s) => (
                                                <div key={s.puuid} className={`flex items-center justify-between p-2 rounded-lg group hover:bg-white/5 border border-transparent hover:border-white/5`}>
                                                    <button
                                                        onClick={() => {
                                                            switchSession(s.puuid);
                                                            setIsMenuOpen(false);
                                                        }}
                                                        className="flex items-center gap-3 flex-1 text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden relative">
                                                            <img src={`https://media.valorant-api.com/playercards/${s.playerCardId}/displayicon.png`} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1">
                                                                <span className={`text-xs font-bold ${s.puuid === session.puuid ? "text-blue-400" : "text-gray-300 group-hover:text-white"}`}>{s.gameName}</span>
                                                                <span className="text-[9px] text-gray-600 font-mono">#{s.tagLine}</span>
                                                            </div>
                                                            <div className="text-[8px] text-gray-500 uppercase font-black tracking-wider flex items-center gap-1">
                                                                <img src={`https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${s.competitiveTier}/largeicon.png`} className="w-3 h-3" />
                                                                {getRankName(s.competitiveTier)}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {s.puuid !== session.puuid && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeSession(s.puuid);
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-2 bg-black/20 flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                login(false, true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full p-2 flex items-center gap-3 text-left hover:bg-white/5 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 border-dashed">
                                                <Plus size={14} />
                                            </div>
                                            Ajouter un compte
                                        </button>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full p-2 flex items-center gap-3 text-left hover:bg-red-500/10 rounded-lg text-xs font-medium text-red-500/60 hover:text-red-500 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                    <polyline points="16 17 21 12 16 7" />
                                                    <line x1="21" y1="12" x2="9" y2="12" />
                                                </svg>
                                            </div>
                                            Déconnexion l'interface
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                {checking ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <div className="text-[10px] uppercase font-black tracking-[0.3em] text-blue-400">Vérification du protocole...</div>
                    </div>
                ) : !session ? (
                    <div className="max-w-md w-full text-center space-y-8">
                        <div className="space-y-3">
                            <div className="inline-block px-3 py-1 bg-blue-600/10 border border-blue-600/20 rounded-full text-[10px] uppercase font-black tracking-widest text-blue-400 mb-2">
                                Connexion Requise
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Visper Protocol</h2>
                            <p className="text-sm text-gray-400 px-10 leading-relaxed font-medium">Connectez-vous via Riot pour synchroniser votre identité tactique et vos données de combat.</p>
                        </div>

                        <button
                            onClick={() => login(false)}
                            disabled={loading}
                            className="group relative w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-4 overflow-hidden"
                        >
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform" />
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                    Initialisation...
                                </>
                            ) : (
                                <>
                                    Continuer avec Riot
                                    <span className="text-blue-200 opacity-50 group-hover:translate-x-1 transition-transform">→</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center space-y-4 opacity-20">
                            <div className="text-4xl font-black uppercase italic tracking-tighter">Ready for Duty</div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.5em]">System Standby</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modern Footer avec Détection Valorant */}
            <footer className="mt-5 flex justify-between items-center text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                <div className="flex gap-4">
                    <span className="text-white/20">SwitchMaster v2</span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/20">Visper 1.0.0</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 shadow-sm ${isValorantOpen
                        ? "bg-green-500 shadow-green-500/50"
                        : "bg-red-500/50 shadow-red-500/20"
                        }`} />
                    <span className={`transition-colors duration-500 ${isValorantOpen ? "text-green-500" : "text-gray-700"}`}>
                        {isValorantOpen ? "Valorant Détecté" : "Valorant Non Détecté"}
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default VisperWindow;
