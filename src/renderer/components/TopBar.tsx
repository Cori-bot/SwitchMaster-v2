import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface TopBarProps {
  status: { status: string };
  currentFilter?: "all" | "favorite" | "valorant" | "league";
  onFilterChange?: (filter: "all" | "favorite" | "valorant" | "league") => void;
  showFilters?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  status,
  currentFilter = "all",
  onFilterChange,
  showFilters,
}) => {
  const statusText = status.status || "Initialisation...";
  const isActive = statusText.includes("Actif");
  const isReady = statusText === "Prêt";
  const isSuccess = isActive || isReady;

  const renderFilterButton = (id: typeof currentFilter, label: string) => (
    <button
      onClick={() => onFilterChange?.(id)}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
        currentFilter === id
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="flex items-center justify-between px-6 pt-6 mb-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6 bg-white/5 pl-5 pr-6 py-2 rounded-full border border-white/5">
          <div className="relative shrink-0">
            <div
              className={`w-2.5 h-2.5 rounded-full ${isSuccess ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]"}`}
            />
            {isActive && (
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
            )}
          </div>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <AlertCircle size={14} className="text-yellow-500" />
            )}
            <span className="text-sm font-medium text-gray-300">
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5">
          {renderFilterButton("all", "Tous")}
          {renderFilterButton("favorite", "Favoris")}
          {renderFilterButton("league", "League")}
          {renderFilterButton("valorant", "Valorant")}
        </div>
      )}
    </header>
  );
};

export default TopBar;
