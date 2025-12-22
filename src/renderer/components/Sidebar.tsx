import React from "react";
import { LayoutDashboard, Settings, Rocket } from "lucide-react";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const launchGame = async (gameType: "league" | "valorant") => {
    try {
      await window.ipc.invoke("launch-game", gameType);
    } catch (error) {
      console.error("Failed to launch game:", error);
    }
  };

  return (
    <aside className="w-64 bg-[#1a1a1a] flex flex-col border-r border-white/5">
      <div className="p-6 flex items-center justify-center">
        <img
          src="src/assets/logo.png"
          alt="Logo"
          className="h-12 w-auto"
          onError={(e) =>
            ((e.target as HTMLImageElement).style.display = "none")
          }
        />
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <button
          onClick={() => onViewChange("dashboard")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
            activeView === "dashboard"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="font-medium">Comptes</span>
        </button>

        <button
          onClick={() => onViewChange("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
            activeView === "settings"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={20} />
          <span className="font-medium">Paramètres</span>
        </button>
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Rocket size={14} />
            Lancement Rapide
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => launchGame("valorant")}
              className="w-full group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-[#ff4655]/10 flex items-center justify-center group-hover:bg-[#ff4655]/20 transition-colors">
                <img
                  src="src/assets/valorant.png"
                  alt="Val"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Valorant</div>
                <div className="text-[10px] text-gray-500">Lancer le jeu</div>
              </div>
            </button>

            <button
              onClick={() => launchGame("league")}
              className="w-full group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <img
                  src="src/assets/league.png"
                  alt="LoL"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  League of Legends
                </div>
                <div className="text-[10px] text-gray-500">Lancer le jeu</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
