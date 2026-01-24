import React from "react";
import { Account } from "../../../shared/types";
import { Play } from "lucide-react";

interface DesignBProps {
  accounts: Account[];
  onSwitch: (id: string) => void;
  // Ignoring other props for this minimal design
}

export const DesignB: React.FC<DesignBProps> = ({ accounts, onSwitch }) => {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-white mb-6">Liste des Comptes</h2>
      <ul className="space-y-2">
        {accounts.map((acc) => (
          <li
            key={acc.id}
            className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
            onClick={() => onSwitch(acc.id)}
          >
            <div className="flex items-center gap-4">
              {/* Icon/Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white">
                {acc.gameType === "league" ? "L" : "V"}
              </div>
              <div>
                <div className="font-bold text-white">{acc.name}</div>
                <div className="text-sm text-gray-400">{acc.username}</div>
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 p-2 bg-green-500 rounded-full text-black transition-all">
              <Play size={16} fill="currentColor" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
