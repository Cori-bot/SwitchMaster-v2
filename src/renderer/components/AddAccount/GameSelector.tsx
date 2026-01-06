import React from "react";
import valorantIcon from "@assets/valorant.png";
import leagueIcon from "@assets/league.png";

interface GameSelectorProps {
  gameType: "league" | "valorant";
  setGameType: (type: "league" | "valorant") => void;
  animationDuration: string;
}

const GameSelector: React.FC<GameSelectorProps> = ({
  gameType,
  setGameType,
  animationDuration,
}) => {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
        Jeu
      </label>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setGameType("valorant")}
          className={`flex-1 flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 
            transition-all ${animationDuration} ${
              gameType === "valorant"
                ? "bg-[#ff4655]/10 border-[#ff4655] text-white shadow-lg shadow-[#ff4655]/10"
                : "bg-black/40 border-white/5 text-gray-500 hover:border-white/10"
            }`}
        >
          <img
            src={valorantIcon}
            alt="Val"
            className="w-5 h-5 object-contain"
          />
          <span className="font-bold">Valorant</span>
        </button>
        <button
          type="button"
          onClick={() => setGameType("league")}
          className={`flex-1 flex items-center justify-center gap-3 p-3.5 rounded-xl border-2 
            transition-all ${animationDuration} ${
              gameType === "league"
                ? "bg-blue-600/10 border-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "bg-black/40 border-white/5 text-gray-500 hover:border-white/10"
            }`}
        >
          <img src={leagueIcon} alt="LoL" className="w-5 h-5 object-contain" />
          <span className="font-bold">League of Legends</span>
        </button>
      </div>
    </div>
  );
};

export default GameSelector;
