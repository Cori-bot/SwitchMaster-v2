import React, { useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import AccountCard from "./AccountCard";
import { PlusCircle } from "lucide-react";
import { Account } from "../hooks/useAccounts";
import {
  ICON_SIZE_XLARGE,
  ICON_SIZE_LARGE,
  ACTIVE_SCALE,
  ANIMATION_DURATION_LONG,
} from "@/constants/ui";

interface DashboardProps {
  accounts: Account[];
  filter: "all" | "favorite" | "valorant" | "league";
  activeAccountId?: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (account: Account) => void;
  onToggleFavorite: (account: Account) => void;
  onAddAccount: () => void;
  onReorder: (accountIds: string[]) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  filter,
  activeAccountId,
  onSwitch,
  onDelete,
  onEdit,
  onToggleFavorite,
  onAddAccount,
  onReorder,
}) => {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [localAccounts, setLocalAccounts] = React.useState<Account[]>(accounts);

  // Synchroniser localAccounts avec les props quand on ne drag pas
  React.useEffect(() => {
    if (!draggedId) {
      setLocalAccounts(accounts);
    }
  }, [accounts, draggedId]);

  const filteredAccounts = localAccounts.filter((acc) => {
    if (filter === "favorite") return acc.isFavorite;
    if (filter === "valorant") return acc.gameType === "valorant";
    if (filter === "league") return acc.gameType === "league";
    return true;
  });

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    if (filter !== "all") return;
    e.dataTransfer.setData("accountId", id);
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }, [filter]);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    if (filter !== "all") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedId || draggedId === targetId) return;

    const sourceIndex = localAccounts.findIndex((a) => a.id === draggedId);
    const targetIndex = localAccounts.findIndex((a) => a.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;
    const relativeY = (e.clientY - rect.top) / rect.height;

    const shouldSwap = sourceIndex < targetIndex
      ? relativeX > 0.33 || relativeY > 0.33
      : relativeX < 0.67 || relativeY < 0.67;

    if (shouldSwap) {
      const newAccounts = [...localAccounts];
      const [removed] = newAccounts.splice(sourceIndex, 1);
      newAccounts.splice(targetIndex, 0, removed);

      const currentIds = localAccounts.map(a => a.id).join(',');
      const newIds = newAccounts.map(a => a.id).join(',');

      if (currentIds !== newIds) {
        setLocalAccounts(newAccounts);
      }
    }
  }, [filter, draggedId, localAccounts]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDraggedId(null);
    onReorder(localAccounts.map((a) => a.id));
  }, [localAccounts, onReorder]);

  const handleDragEnter = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
  }, []);


  if (accounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full"
      >
        <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 text-blue-500">
          <PlusCircle size={ICON_SIZE_XLARGE} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Aucun compte trouvé
        </h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Commencez par ajouter votre premier compte League of Legends ou
          Valorant pour simplifier vos changements de session.
        </p>
        <button
          onClick={onAddAccount}
          className={`bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/20 ${ACTIVE_SCALE}`}
        >
          Ajouter mon premier compte
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8"
      >
        <AnimatePresence mode="popLayout">
          {filteredAccounts.map((account) => (
            <motion.div
              key={account.id}
              variants={itemVariants}
              layout
              initial="hidden"
              animate="visible"
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <AccountCard
                account={account}
                isActive={account.id === activeAccountId}
                onSwitch={onSwitch}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggleFavorite={onToggleFavorite}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.button
          variants={itemVariants}
          whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.08)" }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddAccount}
          className={`group relative h-[220px] rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-white/2 transition-all ${ANIMATION_DURATION_LONG} flex flex-col items-center justify-center gap-4 overflow-hidden cursor-pointer`}
        >
          <div className={`w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-blue-500/20 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-all ${ANIMATION_DURATION_LONG}`}>
            <PlusCircle size={ICON_SIZE_LARGE} />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
              Ajouter un compte
            </div>
            <div className="text-gray-500 text-sm mt-1">
              League of Legends / Valorant
            </div>
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute -inset-24 bg-blue-500/10 blur-[60px] rounded-full" />
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Dashboard;
