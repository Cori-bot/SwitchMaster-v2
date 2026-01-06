import React from "react";
import { LayoutDashboard, Settings } from "lucide-react";

import logoImg from "@assets/logo.png";
import visperLogo from "@assets/visper_logo.png";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <aside className="w-64 bg-[#1a1a1a] flex flex-col border-r border-white/5">
      <div className="p-6 flex items-center justify-center">
        <img
          src={logoImg}
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
          onClick={() => window.ipc.invoke("open-visper")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-gray-400 hover:bg-white/5 hover:text-white group"
        >
          <div className="p-1 rounded-lg bg-transparent group-hover:bg-blue-600/10 transition-colors">
            <img
              src={visperLogo}
              alt="Visper"
              className="w-5 h-5 object-contain"
            />
          </div>
          <span className="font-medium">Visper</span>
          <div className="ml-auto relative group/beta">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 group-hover/beta:opacity-60 transition duration-500"></div>
            <div className="relative px-2 py-0.5 bg-black/40 border border-blue-500/30 rounded-full backdrop-blur-sm flex items-center">
              <span className="w-1 h-1 rounded-full bg-blue-400 mr-1.5 animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_4px_rgba(96,165,250,0.6)]"></span>
              <span className="text-[9px] font-black tracking-widest text-blue-200 uppercase drop-shadow-sm">
                Beta
              </span>
            </div>
          </div>
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
    </aside>
  );
};

export default Sidebar;
