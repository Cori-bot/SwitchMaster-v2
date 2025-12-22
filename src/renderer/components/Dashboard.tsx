import React from "react";
import AccountCard from "./AccountCard";
import { PlusCircle } from "lucide-react";
import { Account } from "../hooks/useAccounts";

interface DashboardProps {
  accounts: Account[];
  activeAccountId?: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (account: Account) => void;
  onAddAccount: () => void;
  onReorder: (accountIds: string[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  activeAccountId,
  onSwitch,
  onDelete,
  onEdit,
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("accountId", id);
    setDraggedId(id);
    // Nécessaire pour certains navigateurs pour permettre le drop
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const newAccounts = [...localAccounts];
    const sourceIndex = newAccounts.findIndex((a) => a.id === draggedId);
    const targetIndex = newAccounts.findIndex((a) => a.id === targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const [removed] = newAccounts.splice(sourceIndex, 1);
      newAccounts.splice(targetIndex, 0, removed);
      setLocalAccounts(newAccounts);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedId(null);
    onReorder(localAccounts.map((a) => a.id));
  };

  if (accounts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mb-6 text-blue-500">
          <PlusCircle size={48} />
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
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/20 active:scale-95"
        >
          Ajouter mon premier compte
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
      {localAccounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          isActive={account.id === activeAccountId}
          onSwitch={onSwitch}
          onDelete={onDelete}
          onEdit={onEdit}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
        />
      ))}

      {/* Bouton Ajouter un Compte (Card) */}
      <button
        onClick={onAddAccount}
        className="group relative h-[220px] rounded-3xl border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-white/[0.02] hover:bg-blue-500/[0.05] transition-all duration-300 flex flex-col items-center justify-center gap-4 overflow-hidden cursor-pointer"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-blue-500/20 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110">
          <PlusCircle size={32} />
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
            Ajouter un compte
          </div>
          <div className="text-gray-500 text-sm mt-1">
            League of Legends / Valorant
          </div>
        </div>

        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute -inset-24 bg-blue-500/10 blur-[60px] rounded-full" />
        </div>
      </button>
    </div>
  );
};

export default Dashboard;
