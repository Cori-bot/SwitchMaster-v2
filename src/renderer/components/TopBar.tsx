import React from "react";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface TopBarProps {
  status: { status: string };
}

const TopBar: React.FC<TopBarProps> = ({ status }) => {
  const statusText = status.status || "Initialisation...";
  const isActive = statusText.includes("Actif");
  const isReady = statusText === "Prêt";
  const isSuccess = isActive || isReady;

  return (
    <header className="flex items-center justify-between px-6 pt-6 mb-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-6 bg-white/5 pl-5 pr-6 py-2 rounded-full border border-white/5">
          <div className="relative flex-shrink-0">
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
    </header>
  );
};

export default TopBar;
