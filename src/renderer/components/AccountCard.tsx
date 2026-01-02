import React from "react";
import {
  MoreVertical,
  Play,
  Trash2,
  Edit2,
  GripVertical,
  Star,
} from "lucide-react";
import { Account } from "../hooks/useAccounts";
import { devLog } from "../utils/logger";

import leagueIcon from "@assets/league.png";
import valorantIcon from "@assets/valorant.png";

import {
  ICON_SIZE_SMALL,
  ICON_SIZE_MEDIUM,
  ANIMATION_DURATION_LONG,
  ACTIVE_SCALE,
} from "@/constants/ui";

interface AccountCardProps {
  account: Account;
  isActive?: boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (account: Account) => void;
  onToggleFavorite: (account: Account) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

const GRADIENT_OPACITY = 0.55;

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isActive,
  onSwitch,
  onDelete,
  onEdit,
  onToggleFavorite,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragEnter,
  onDrop,
}) => {
  const { id, name, riotId, gameType, stats, cardImage, isFavorite } = account;

  // Dev logs for stats debugging
  React.useEffect(() => {
    if (stats) {
      devLog(`[DEV-STATS] ${name}:`, {
        rank: stats.rank,
      });
    }
  }, [name, stats]);

  const getRankColor = () => {
    return "text-gray-300"; // Unification de la couleur
  };

  const cardStyle = cardImage
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,${GRADIENT_OPACITY}), rgba(0,0,0,0.9)), url('${
          cardImage.startsWith("http")
            ? cardImage
            : `sm-img://${cardImage.replace(/\\/g, "/")}`
        }')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    (e.currentTarget as HTMLImageElement).style.display = "none";
  };

  const renderStats = () => {
    if (!riotId) return null;

    return (
      <div className="bg-black/20 rounded-xl p-3 mb-4 border border-white/5 backdrop-blur-sm">
        {stats ? (
          <div className="flex items-center gap-3">
            {stats.rankIcon && (
              <img
                src={stats.rankIcon}
                alt={stats.rank}
                className="w-10 h-10 object-contain"
                onError={handleImageError}
              />
            )}
            <div>
              <div
                className={`text-sm font-bold uppercase tracking-wider ${getRankColor()}`}
              >
                {stats.rank || "Unranked"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/5" />
            <div className="space-y-2">
              <div className="w-24 h-3 bg-white/5 rounded" />
              <div className="w-16 h-2 bg-white/5 rounded" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={cardStyle}
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragOver={(e) => onDragOver(e)}
      onDragEnd={(e) => onDragEnd(e)}
      onDragEnter={(e) => onDragEnter(e, id)}
      onDrop={(e) => onDrop(e, id)}
      className={`group relative bg-[#1a1a1a] rounded-2xl border-2 transition-all ${ANIMATION_DURATION_LONG} ease-in-out ${
        isActive
          ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
          : "border-white/5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10"
      } overflow-hidden ${cardImage ? "has-bg" : ""}`}
    >
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical size={ICON_SIZE_SMALL} className="text-gray-500" />
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white truncate max-w-[140px]">
                {name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(account);
                }}
                aria-label={
                  isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
                }
                className={`p-1 rounded-md transition-all duration-200 hover:scale-110 ${
                  isFavorite
                    ? "text-yellow-400"
                    : "text-gray-500 hover:text-yellow-400"
                }`}
              >
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
            {riotId && (
              <p className="text-sm text-gray-400 truncate font-mono">
                {riotId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <img
              src={gameType === "league" ? leagueIcon : valorantIcon}
              alt={gameType}
              className="w-6 h-6 object-contain opacity-80"
            />
            <div className="relative group/menu">
              <button
                aria-label="Plus d'options"
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <MoreVertical size={ICON_SIZE_MEDIUM} />
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#242424] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible group-focus-within/menu:opacity-100 group-focus-within/menu:visible transition-all duration-200 z-10 overflow-hidden">
                <button
                  onClick={() => onEdit(account)}
                  aria-label="Modifier le compte"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <Edit2 size={ICON_SIZE_SMALL} /> Modifier
                </button>
                <button
                  onClick={() => onDelete(account.id)}
                  aria-label="Supprimer le compte"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={ICON_SIZE_SMALL} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {renderStats()}

        <button
          onClick={() => onSwitch(account.id)}
          disabled={isActive}
          className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all duration-200 ${ACTIVE_SCALE} group/btn ${
            isActive
              ? "bg-green-500/10 text-green-500 border border-green-500/50 cursor-default"
              : "bg-white text-black hover:bg-gray-200 cursor-pointer"
          }`}
        >
          {isActive ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Connecté
            </>
          ) : (
            <>
              <Play
                size={ICON_SIZE_MEDIUM}
                className="fill-current group-hover/btn:scale-110 transition-transform"
              />
              Se connecter
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AccountCard;
