import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Search, Users, Gamepad2 } from "lucide-react";
import { VALORANT_AGENTS } from "../../../shared/valorant";

interface GameAssistantProps {
    state: "MENUS" | "PREGAME" | "INGAME" | "UNKNOWN";
    matchId?: string;
    mapId?: string;
    queueId?: string;
    players?: any[];
    onClose: () => void;
}

// Map paths to display names
const getMapName = (mapId?: string) => {
    if (!mapId) return "Carte Inconnue";
    const maps: Record<string, string> = {
        "/Game/Maps/Ascent/Ascent": "Ascent",
        "/Game/Maps/Bonsai/Bonsai": "Split",
        "/Game/Maps/Canyon/Canyon": "Fracture",
        "/Game/Maps/Duality/Duality": "Bind",
        "/Game/Maps/Foxtrot/Foxtrot": "Breeze",
        "/Game/Maps/Triad/Triad": "Haven",
        "/Game/Maps/Port/Port": "Icebox",
        "/Game/Maps/Jam/Jam": "Lotus",
        "/Game/Maps/Juliett/Juliett": "Sunset",
        "/Game/Maps/Infinity/Infinity": "Abyss",
        "/Game/Maps/Pitt/Pitt": "Pearl",
        "/Game/Maps/Rook/Rook": "Corrode",
        "/Game/Maps/Poveglia/Range": "Entraînement",
    };
    return maps[mapId] || "Carte Inconnue";
};

// Map UUIDs for valorant-api.com
const getMapImageUrl = (mapId?: string): string | null => {
    if (!mapId) return null;
    const mapUuids: Record<string, string> = {
        "/Game/Maps/Ascent/Ascent": "7eaecc1b-4337-bbf6-6ab9-04b8f06b3319",
        "/Game/Maps/Bonsai/Bonsai": "d960549e-485c-e861-8d71-aa9d1aed12a2",
        "/Game/Maps/Canyon/Canyon": "b529448b-4d60-346e-e89e-00a4c527a405",
        "/Game/Maps/Duality/Duality": "2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba",
        "/Game/Maps/Foxtrot/Foxtrot": "2fb9a4fd-47b8-4e7d-a969-74b4046ebd53",
        "/Game/Maps/Triad/Triad": "2bee0dc9-4ffe-519b-1cbd-7fbe763a6047",
        "/Game/Maps/Port/Port": "e2ad5c54-4114-a870-9641-8ea21279579a",
        "/Game/Maps/Jam/Jam": "2fe4ed3a-450a-948b-6d6b-e89a78e680a9",
        "/Game/Maps/Juliett/Juliett": "92584fbe-486a-b1b2-9faa-39b0f486b498",
        "/Game/Maps/Infinity/Infinity": "224b0a95-48b9-f703-1bd8-67aca101a61f",
        "/Game/Maps/Pitt/Pitt": "fd267378-4d1d-484f-ff52-77821ed10dc2",
        "/Game/Maps/Rook/Rook": "1c18ab1f-420d-0d8b-71d0-77ad3c439115",
    };
    const uuid = mapUuids[mapId];
    return uuid ? `https://media.valorant-api.com/maps/${uuid}/splash.png` : null;
};

// Rank tier to name
const getRankName = (tier: number): string => {
    const ranks = [
        "Non classé", "Fer 1", "Fer 2", "Fer 3",
        "Bronze 1", "Bronze 2", "Bronze 3",
        "Argent 1", "Argent 2", "Argent 3",
        "Or 1", "Or 2", "Or 3",
        "Platine 1", "Platine 2", "Platine 3",
        "Diamant 1", "Diamant 2", "Diamant 3",
        "Ascendant 1", "Ascendant 2", "Ascendant 3",
        "Immortel 1", "Immortel 2", "Immortel 3",
        "Radiant"
    ];
    return ranks[tier] || "Non classé";
};

// Queue IDs to display names
const getQueueName = (queueId?: string) => {
    if (queueId === "") return "Partie Personnalisée";
    if (!queueId) return "";
    const queues: Record<string, string> = {
        "competitive": "Compétition",
        "unrated": "Non Classé",
        "spikerush": "Spike Rush",
        "deathmatch": "Combat à mort",
        "ggteam": "Course aux armes",
        "onefa": "Un pour tous",
        "swiftplay": "Vélocité",
        "hurm": "Match à mort par équipe",
    };
    return queues[queueId] || queueId;
};

const GameAssistant: React.FC<GameAssistantProps> = ({ state, mapId, queueId, players = [], onClose }) => {
    const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [agents, setAgents] = React.useState<any[]>(
        VALORANT_AGENTS.map(a => ({ uuid: a.id, displayName: a.name, displayIcon: "", role: { displayName: "Agent" } }))
    );

    // Load agents list
    React.useEffect(() => {
        fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=fr-FR")
            .then(res => res.json())
            .then(data => {
                if (data?.data) {
                    setAgents(data.data.sort((a: any, b: any) => a.displayName.localeCompare(b.displayName)));
                }
            })
            .catch(() => { });
    }, []);

    // Load saved agent from config
    React.useEffect(() => {
        window.ipc.invoke("get-config").then((config: any) => {
            if (config?.valorantAutoLockAgent) {
                setSelectedAgentId(config.valorantAutoLockAgent);
                // Also notify backend
                window.ipc.invoke("valorant-set-auto-lock", config.valorantAutoLockAgent);
            }
        });
    }, []);

    const handleToggleAutoLock = async (agentId: string) => {
        const newId = selectedAgentId === agentId ? null : agentId;
        setSelectedAgentId(newId);
        // Save to backend service
        await window.ipc.invoke("valorant-set-auto-lock", newId);
        // Persist to config
        await window.ipc.invoke("save-config", { valorantAutoLockAgent: newId });
    };

    const filteredAgents = agents.filter(a => a.displayName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Show Insta-Locker only in MENUS and PREGAME
    const showInstaLocker = state === "MENUS" || state === "PREGAME";

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 
                    ${state === 'PREGAME' ? 'bg-blue-600' : state === 'INGAME' ? 'bg-red-600' : 'bg-gray-600'}`}
                />
            </div>

            <div className="relative z-10 flex-1 flex flex-col p-6 min-h-0">
                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-black italic tracking-tighter">
                            VALORANT <span className={state === 'PREGAME' ? "text-blue-500" : state === 'INGAME' ? "text-red-500" : "text-gray-500"}>ASSISTANT</span>
                        </motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-gray-400 text-sm font-medium tracking-wide uppercase">
                            {state === "PREGAME" ? "Sélection d'agent" : state === "INGAME" ? "Partie en cours" : "Dans les menus"}
                        </motion.p>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-sm font-bold">
                        Retour
                    </button>
                </header>

                {/* Main Content Layout */}
                <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                    {/* Main Content Area - Full width in INGAME */}
                    <div className={`flex flex-col gap-4 overflow-hidden ${showInstaLocker ? 'flex-1' : 'w-full'}`}>

                        {/* Map/Queue Info Bar */}
                        {(mapId || queueId) && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Carte</p>
                                    <p className="text-lg font-bold">{getMapName(mapId)}</p>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Mode de jeu</p>
                                    <p className="text-lg font-bold">{getQueueName(queueId)}</p>
                                </div>
                            </div>
                        )}

                        {/* === MENUS VIEW === */}
                        {state === "MENUS" && (
                            <div className="flex-1 flex items-center justify-center border border-white/5 rounded-2xl bg-black/20">
                                <div className="text-center p-8">
                                    <Gamepad2 size={48} className="mx-auto mb-4 text-gray-600" />
                                    <p className="text-gray-400 text-lg">En attente d'une partie...</p>
                                    <p className="text-gray-600 text-sm mt-2">Lance une partie pour voir les informations du match</p>
                                </div>
                            </div>
                        )}

                        {/* === PREGAME VIEW === */}
                        {state === "PREGAME" && (
                            <div className="flex-1 flex flex-col border border-white/5 rounded-2xl bg-black/20 relative overflow-hidden">
                                {getMapImageUrl(mapId) && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <img src={getMapImageUrl(mapId) || ''} className="w-full h-full object-cover opacity-20" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-transparent" />
                                    </div>
                                )}
                                <div className="relative z-10 flex-1 p-4 overflow-y-auto">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                                        <Users size={14} /> Équipe ({players.length} joueurs)
                                    </h3>
                                    {players.length > 0 ? (
                                        <div className="space-y-2">
                                            {players.map((player: any, index: number) => {
                                                const rank = player.CompetitiveTier || 0;
                                                const level = player.PlayerIdentity?.AccountLevel || 0;
                                                const agentId = player.CharacterID;
                                                const agentData = agents.find(a => a.uuid === agentId);
                                                const selectionState = player.CharacterSelectionState;

                                                return (
                                                    <motion.div key={player.Subject || index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border ${selectionState === 'locked' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5'}`}>
                                                        <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 overflow-hidden shrink-0">
                                                            {agentId && <img src={`https://media.valorant-api.com/agents/${agentId}/displayicon.png`} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold truncate">{agentData?.displayName || (agentId ? "Sélection..." : "En attente")}</span>
                                                                {level > 0 && <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">Niv. {level}</span>}
                                                                {selectionState === 'locked' && <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">Verrouillé</span>}
                                                            </div>
                                                            <span className="text-xs text-gray-400">{rank > 0 ? getRankName(rank) : ""}</span>
                                                        </div>
                                                        {rank > 0 && <img src={`https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rank}/smallicon.png`} alt="" className="w-6 h-6 shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center h-32">
                                            <p className="text-gray-500">Chargement des joueurs...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === INGAME VIEW === */}
                        {state === "INGAME" && (
                            <div className="flex-1 flex flex-col border border-white/5 rounded-2xl bg-black/20 relative overflow-hidden">
                                {getMapImageUrl(mapId) && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        <img src={getMapImageUrl(mapId) || ''} className="w-full h-full object-cover opacity-30" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/50" />
                                    </div>
                                )}
                                <div className="relative z-10 flex-1 p-4 overflow-y-auto">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                                        <Users size={14} /> Joueurs dans la partie ({players.length})
                                    </h3>
                                    {players.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {players.map((player: any, index: number) => {
                                                const rank = player.CompetitiveTier || player.SeasonalBadgeInfo?.Rank || 0;
                                                const level = player.PlayerIdentity?.AccountLevel || 0;
                                                const agentId = player.CharacterID;
                                                const agentData = agents.find(a => a.uuid === agentId);

                                                return (
                                                    <motion.div key={player.Subject || index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.02 }}
                                                        className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/5 border border-white/5">
                                                        <div className="w-6 h-6 rounded bg-white/10 overflow-hidden shrink-0">
                                                            {agentId && <img src={`https://media.valorant-api.com/agents/${agentId}/displayicon.png`} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[10px] font-bold truncate block">{agentData?.displayName || "?"}</span>
                                                            <span className="text-[9px] text-gray-500">
                                                                {rank > 0 ? getRankName(rank) : `Niv. ${level}`}
                                                            </span>
                                                        </div>
                                                        {rank > 0 && <img src={`https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rank}/smallicon.png`} alt="" className="w-4 h-4 shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center h-32">
                                            <p className="text-gray-500">Chargement des joueurs...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Insta-Locker Sidebar - Only in MENUS and PREGAME */}
                    {showInstaLocker && (
                        <aside className="w-72 flex flex-col bg-white/5 border border-white/5 rounded-2xl overflow-hidden min-h-0">
                            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
                                <Zap size={16} className="text-yellow-500" />
                                <h3 className="text-xs font-bold uppercase tracking-widest">Insta-Locker</h3>
                            </div>

                            <div className="p-3 bg-black/40">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                                    <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-7 pr-3 text-xs focus:border-blue-500/50 outline-none" />
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-2 custom-scrollbar">
                                <div className="space-y-1">
                                    {filteredAgents.map((agent) => (
                                        <button key={agent.uuid} onClick={() => handleToggleAutoLock(agent.uuid)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all ${selectedAgentId === agent.uuid ? "bg-[#ff4655] text-white" : "hover:bg-white/5 text-gray-400 hover:text-white"}`}>
                                            <div className={`w-8 h-8 rounded overflow-hidden ${selectedAgentId === agent.uuid ? "border border-white/30" : "border border-white/5"}`}>
                                                {agent.displayIcon && <img src={agent.displayIcon} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="text-left flex-1">
                                                <span className="text-xs font-bold block">{agent.displayName}</span>
                                                <span className="text-[9px] text-white/40">{agent.role?.displayName}</span>
                                            </div>
                                            {selectedAgentId === agent.uuid && <Shield size={12} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-white/5 border-t border-white/5">
                                {selectedAgentId ? (
                                    <div className="flex items-center gap-2 text-[10px] text-white bg-[#ff4655]/20 p-2 rounded-lg border border-[#ff4655]/30">
                                        <Zap size={12} className="text-[#ff4655]" />
                                        <span>Auto: {agents.find(a => a.uuid === selectedAgentId)?.displayName}</span>
                                    </div>
                                ) : (
                                    <div className="text-[9px] text-center text-gray-500 uppercase tracking-widest">
                                        Aucun agent sélectionné
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameAssistant;
