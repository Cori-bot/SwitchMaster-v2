import React, { useState } from "react";
import { useVisperParty } from "../../../hooks/useVisperParty";
import { VisperAuthSession } from "../../../hooks/useVisperAuth";
import { QUEUES, GAME_PODS } from "../../../../shared/visper-types";
import { Users, Play, LogOut, Lock, Unlock, Crown, ChevronDown, Copy, RefreshCw, XCircle, ArrowRight, UserPlus, Globe, Signal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PartyWidgetProps {
    session: VisperAuthSession;
}

const PartyWidget: React.FC<PartyWidgetProps> = ({ session }) => {
    const { party, friends, loading, error, initialLoading, isPolling, retryCountdown, actions } = useVisperParty(session);
    const [showQueueSelect, setShowQueueSelect] = useState(false);
    const [showPodSelect, setShowPodSelect] = useState(false);
    const [joinCode, setJoinCode] = useState("");

    // 1. Chargement (Initial ou Polling actif)
    if (initialLoading || isPolling) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#1a1a1a] border border-white/5 rounded-3xl text-center space-y-6 shadow-2xl relative z-50">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 border border-blue-500/20 relative">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    <Signal size={40} className="relative z-10" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Connexion au système...</h3>
                    <p className="text-gray-500 text-xs font-mono">Recherche de session active</p>
                </div>
            </div>
        );
    }

    // 2. Erreur Session (Jeu pas lancé) avec Compte à rebours
    if (error === "SESSION_NOT_FOUND") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#1a1a1a] border border-white/5 rounded-3xl text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-red-600/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20">
                    <Signal size={40} />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Protocole Inactif</h3>
                        <p className="text-gray-400 text-sm max-w-md mx-auto font-medium leading-relaxed mt-2">
                            Veuillez lancer <span className="text-white font-bold italic">VALORANT</span> avec le compte <span className="text-blue-400 font-bold">{session.gameName}#{session.tagLine}</span> pour synchroniser <span className="text-white font-bold">VISPER</span>.
                        </p>
                    </div>
                    
                    <div className="inline-block bg-black/40 border border-white/5 rounded-lg px-4 py-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            Nouvelle tentative dans <span className="text-white text-sm">{retryCountdown}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Chargement de données (Squelette) ou Données manquantes temporaires
    if (!party) return (
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 w-full max-w-2xl animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
                <div className="h-12 bg-white/5 rounded"></div>
                <div className="h-12 bg-white/5 rounded"></div>
            </div>
        </div>
    );

    const isLeader = party.members[0]?.puuid === session.puuid;
    const isQueueing = party.state === "MATCHMAKING";
    const currentQueue = QUEUES.find(q => q.id === party.queueId) || { id: party.queueId, label: "Inconnu" };
    
    const leaderPings = party.members[0]?.pings || {};

    const selectedPods = party.preferredPods || [];
    const podsLabel = selectedPods.length > 0 
        ? (selectedPods.length === 1 ? GAME_PODS[selectedPods[0]] || "Serveur" : `${selectedPods.length} Serveurs`) 
        : "Automatique";

    const handleCopyCode = () => {
        if (party.inviteCode) {
            navigator.clipboard.writeText(party.inviteCode);
        }
    };

    const handleJoinByCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length >= 6) {
            await actions.joinByCode(joinCode);
            setJoinCode("");
        }
    };

    const togglePod = (podId: string) => {
        let newPods = [...selectedPods];
        if (newPods.includes(podId)) {
            newPods = newPods.filter(id => id !== podId);
        } else {
            newPods.push(podId);
        }
        actions.setPreferredPods(newPods);
    };

    return (
        <div className="flex gap-4 w-full max-w-7xl h-[650px] items-start p-4">
            {/* Main Party Area - Vertical Cards */}
            <div className="flex-1 flex flex-col gap-4 h-full">
                
                {/* Header Toolbar */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-xl shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3">
                            <Users size={18} className="text-blue-400" />
                            <span className="font-black text-white uppercase tracking-widest text-sm">GROUPE</span>
                        </div>
                        <div className="h-6 w-px bg-white/10" />
                        
                        {/* Queue Selector */}
                        <div className="relative z-50">
                            <button
                                disabled={isQueueing || !isLeader}
                                onClick={() => setShowQueueSelect(!showQueueSelect)}
                                className="flex items-center gap-2 bg-black/40 border border-white/10 hover:border-white/20 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[140px] justify-between"
                            >
                                <span>{currentQueue.label}</span>
                                <ChevronDown size={14} className={`text-white/50 transition-transform ${showQueueSelect ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                                {showQueueSelect && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 w-48 bg-[#151515] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col py-1 z-50 max-h-80 overflow-y-auto custom-scrollbar"
                                    >
                                        {QUEUES.map(q => (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    actions.changeQueue(q.id);
                                                    setShowQueueSelect(false);
                                                }}
                                                className={`text-left px-4 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors ${party.queueId === q.id ? "text-blue-400 bg-blue-500/10" : "text-gray-300"}`}
                                            >
                                                {q.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Pod Selector */}
                        <div className="relative z-40">
                            <button
                                disabled={isQueueing || !isLeader}
                                onClick={() => setShowPodSelect(!showPodSelect)}
                                className="flex items-center gap-2 bg-black/40 border border-white/10 hover:border-white/20 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[140px] justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-gray-400" />
                                    <span>{podsLabel}</span>
                                </div>
                                <ChevronDown size={14} className={`text-white/50 transition-transform ${showPodSelect ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                                {showPodSelect && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 mt-2 w-64 bg-[#151515] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col py-2 z-50 max-h-80 overflow-y-auto custom-scrollbar"
                                    >
                                        <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">
                                            Serveurs (Ping Leader)
                                        </div>
                                        {Object.entries(GAME_PODS).map(([podId, label]) => {
                                            const isSelected = selectedPods.includes(podId);
                                            const ping = leaderPings[podId];
                                            const pingColor = ping < 40 ? "text-green-500" : ping < 80 ? "text-yellow-500" : "text-red-500";
                                            
                                            return (
                                                <button
                                                    key={podId}
                                                    onClick={() => togglePod(podId)}
                                                    className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition-colors flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={isSelected ? "text-white" : "text-gray-400 group-hover:text-gray-200"}>{label}</span>
                                                        {ping !== undefined && (
                                                            <span className={`text-[10px] font-mono ${pingColor}`}>{ping}ms</span>
                                                        )}
                                                    </div>
                                                    <div className={`w-3 h-3 rounded border flex items-center justify-center ${isSelected ? "bg-blue-600 border-blue-600" : "border-white/20 bg-black/40"}`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {selectedPods.length > 0 && (
                                             <button 
                                                onClick={() => {
                                                    actions.setPreferredPods([]);
                                                    setShowPodSelect(false);
                                                }}
                                                className="mt-2 mx-4 py-1.5 text-[10px] text-center bg-white/5 hover:bg-white/10 text-gray-400 rounded transition-colors uppercase font-bold"
                                             >
                                                Réinitialiser (Auto)
                                             </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <form onSubmit={handleJoinByCode} className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5 focus-within:border-white/20 transition-colors">
                            <input 
                                type="text" 
                                placeholder="CODE..." 
                                className="bg-transparent border-none text-xs text-white outline-none w-20 font-mono uppercase px-2"
                                value={joinCode}
                                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                            <button type="submit" disabled={joinCode.length < 3} className="p-1 hover:bg-white/10 rounded text-blue-400 disabled:opacity-20 disabled:cursor-not-allowed"><ArrowRight size={14} /></button>
                        </form>

                        <div className="h-6 w-px bg-white/10 mx-1" />

                        {isLeader && (
                            <button
                                onClick={() => actions.toggleOpen(party.accessibility === "CLOSED")}
                                className={`p-2 rounded-xl transition-all ${party.accessibility === "OPEN" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}
                                title={party.accessibility === "OPEN" ? "Groupe Ouvert" : "Groupe Fermé"}
                            >
                                {party.accessibility === "OPEN" ? <Unlock size={18} /> : <Lock size={18} />}
                            </button>
                        )}
                        
                        <button onClick={() => actions.leaveParty()} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-xl" title="Quitter">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Vertical Player Slots */}
                <div className="flex-1 flex gap-2 w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                    {/* Active Members */}
                    {party.members.map((member) => {
                        const isMe = member.puuid === session.puuid;
                        const canClick = isMe && !isQueueing;
                        
                        // Utiliser le rang de la session pour "Moi" si l'API de groupe renvoie 0
                        const actualRank = (isMe && member.rank === 0) ? (session.competitiveTier || 0) : member.rank;
                        
                        // Rank URL - Utilisation de l'API tiers pour un rendu fiable
                        const rankUrl = `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${actualRank}/largeicon.png`;

                        return (
                            <div 
                                key={member.puuid}
                                onClick={() => canClick && actions.setReady(!member.isReady)}
                                className={`relative flex-1 min-w-[180px] max-w-[240px] h-full rounded-xl overflow-hidden border transition-all duration-300 group ${
                                    isMe ? "cursor-pointer ring-1 ring-white/20 hover:ring-white/40" : ""
                                } ${member.isReady ? "border-green-500/40" : "border-white/5 bg-[#1a1a1a]"}`}
                            >
                                {/* Background Image */}
                                <div className="absolute inset-0 z-0">
                                    <img 
                                        src={`https://media.valorant-api.com/playercards/${member.cardId}/largeart.png`}
                                        className="w-full h-full object-cover transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
                                    {member.isReady && <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay" />}
                                </div>

                                {/* Content Overlay */}
                                <div className="absolute inset-0 z-10 flex flex-col justify-between p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">LVL</span>
                                            <span className="text-xs font-mono text-white">{member.level}</span>
                                        </div>
                                        {member.isLeader && (
                                            <div className="bg-yellow-500/20 backdrop-blur-md p-1.5 rounded-full text-yellow-400 shadow-lg shadow-yellow-500/20">
                                                <Crown size={14} fill="currentColor" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="relative">
                                            <img 
                                                src={rankUrl} 
                                                className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                                                onError={(e) => {
                                                    // Fallback ultime si l'image casse
                                                    e.currentTarget.src = "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/0/largeicon.png";
                                                }}
                                            />
                                        </div>
                                        
                                        <div className="text-center w-full">
                                            <div className="text-lg font-black text-white uppercase tracking-tight truncate drop-shadow-md">{member.name}</div>
                                            <div className="text-[10px] text-gray-300 font-mono bg-black/40 px-2 py-0.5 rounded inline-block mt-1">#{member.tag}</div>
                                        </div>

                                        <div className={`mt-4 w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] text-center backdrop-blur-md transition-all ${
                                            member.isReady 
                                            ? "bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                                            : "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                        }`}>
                                            {member.isReady ? "PRÊT" : "PAS PRÊT"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty Slots */}
                    {Array.from({ length: 5 - party.members.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex-1 min-w-[180px] max-w-[240px] h-full rounded-xl border border-white/5 bg-[#151515]/50 flex flex-col items-center justify-center gap-4 group">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10 border border-white/5">
                                <UserPlus size={24} />
                            </div>
                            <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Slot Vide</span>
                        </div>
                    ))}
                </div>

                {/* Footer Controls */}
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 flex items-center justify-between shrink-0 shadow-lg">
                    {/* Party Code Control */}
                    <div className="flex items-center gap-3 pl-2">
                        {party.inviteCode ? (
                            <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-500/20 px-4 py-2 rounded-xl">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Code Groupe</span>
                                <span className="text-sm font-mono font-bold text-white tracking-[0.15em] select-all">{party.inviteCode}</span>
                                <div className="h-4 w-px bg-blue-500/20 mx-1" />
                                <button onClick={handleCopyCode} className="text-blue-400 hover:text-white transition-colors" title="Copier"><Copy size={14} /></button>
                                {isLeader && (
                                    <button onClick={() => actions.removeCode()} className="text-red-400 hover:text-red-300 transition-colors ml-1" title="Désactiver"><XCircle size={14} /></button>
                                )}
                            </div>
                        ) : (
                            isLeader && (
                                <button 
                                    onClick={() => actions.generateCode()}
                                    className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
                                >
                                    <RefreshCw size={14} /> Générer Code d'invitation
                                </button>
                            )
                        )}
                    </div>

                    {/* Main Action Button */}
                    <div className="w-64">
                        {isQueueing ? (
                             <button
                                onClick={() => actions.stopMatchmaking()}
                                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 animate-pulse"
                            >
                                <XCircle size={18} /> Annuler la recherche
                            </button>
                        ) : (
                            <button
                                onClick={() => actions.startMatchmaking()}
                                disabled={loading || !isLeader || party.members.some(m => !m.isReady)}
                                className="relative overflow-hidden group w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3"
                            >
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <Play size={18} fill="currentColor" />
                                Lancer la partie
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Friends Sidebar */}
            <div className="w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl h-full overflow-hidden flex flex-col shadow-xl shrink-0">
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        Amis <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{friends.length}</span>
                    </h4>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {friends.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-2">
                            <Users size={24} />
                            <div className="text-[10px] uppercase font-bold tracking-widest">Aucun ami en ligne</div>
                        </div>
                    ) : (
                        friends.map(friend => (
                            <div key={friend.puuid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group transition-colors">
                                <div className="relative shrink-0">
                                    <div className="w-8 h-8 bg-black rounded-lg border border-white/10 flex items-center justify-center text-gray-500">
                                        <Users size={14} />
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a1a] ${
                                        friend.status === 'chat' ? 'bg-green-500' :
                                        friend.status === 'dnd' ? 'bg-red-500' :
                                        friend.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-200 truncate">{friend.gameName}</div>
                                    <div className="text-[9px] text-gray-500 truncate">
                                        {friend.otherGame ? "Sur League" : friend.note || (friend.status === 'chat' ? 'En ligne' : friend.status)}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => actions.inviteByName(friend.gameName, friend.tagLine)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-md transition-all"
                                    title="Inviter"
                                >
                                    <UserPlus size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartyWidget;
