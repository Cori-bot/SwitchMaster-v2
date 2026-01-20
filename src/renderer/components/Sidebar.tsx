import React from "react";
import { LayoutDashboard, Settings } from "lucide-react";

import logoImg from "@assets/logo.png";


interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
}) => {

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
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${activeView === "dashboard"
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
        >
          <LayoutDashboard size={20} />
          <span className="font-medium">Comptes</span>
        </button>



        <button
          onClick={() => onViewChange("settings")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${activeView === "settings"
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

