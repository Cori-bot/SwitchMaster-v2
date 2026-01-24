import React from "react";
import {
  FolderOpen,
  Shield,
  Monitor,
  Info,
  RefreshCw,
  LayoutTemplate,
} from "lucide-react";
import { Config } from "../hooks/useConfig";
import logoImg from "@assets/logo.png";
import { useDesign } from "../contexts/DesignContext";

import {
  ICON_SIZE_NORMAL,
  ICON_SIZE_SMALL,
  ICON_SIZE_XSMALL,
} from "@/constants/ui";

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon: Icon,
  title,
  description,
  children,
}) => (
  <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-4">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0">
        <Icon size={ICON_SIZE_NORMAL} />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
    <div className="ml-14">{children}</div>
  </div>
);

interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  subLabel?: string;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  checked,
  onChange,
  subLabel,
  disabled,
}) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-3 py-2 ${
      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer group"
    }`}
  >
    <div className="relative flex items-center mt-1">
      <input
        type="checkbox"
        id={id}
        className="peer sr-only"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
      />
      <div
        className={`w-5 h-5 border-2 rounded-md transition-all duration-200 
        ${
          disabled
            ? "border-gray-700 bg-gray-800/50"
            : "border-gray-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-500"
        }`}
      />
      <svg
        className="absolute w-3.5 h-3.5 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100 left-[3px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
    <div className="flex-1">
      <div
        className={`text-sm font-medium transition-colors ${
          disabled ? "text-gray-600" : "text-gray-300 group-hover:text-white"
        }`}
      >
        {label}
      </div>
      {subLabel && (
        <div
          className={`text-[11px] mt-0.5 ${
            disabled ? "text-gray-700" : "text-gray-500"
          }`}
        >
          {subLabel}
        </div>
      )}
    </div>
  </label>
);

interface SettingsProps {
  config: Config | null;
  onUpdate: (newConfig: Partial<Config>) => void;
  onSelectRiotPath: () => void;
  onOpenPinModal: () => void;
  onDisablePin: () => void;
  onCheckUpdates: () => void;
  onOpenGPUModal: (targetValue: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({
  config,
  onUpdate,
  onSelectRiotPath,
  onOpenPinModal,
  onDisablePin,
  onCheckUpdates,
  onOpenGPUModal,
}) => {
  const { currentDesign, switchDesign } = useDesign();

  if (!config) return null;

  const handleChange = <K extends keyof Config>(key: K, value: Config[K]) => {
    onUpdate({ [key]: value });
  };

  const handleAutoStartChange = async (enabled: boolean) => {
    const updates: Partial<Config> = { autoStart: enabled };
    if (!enabled) {
      updates.startMinimized = false;
    }
    await onUpdate(updates);
    window.ipc.invoke("set-auto-start", enabled);
  };

  const handleStartMinimizedChange = async (enabled: boolean) => {
    await onUpdate({ startMinimized: enabled });

    window.ipc.invoke("set-auto-start", true);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Paramètres
        </h1>
        <p className="text-gray-400">
          Personnalisez votre expérience SwitchMaster
        </p>
      </header>

      <SettingItem
        icon={LayoutTemplate}
        title="Apparence"
        description="Choisissez l'interface qui vous convient."
      >
        <div className="flex gap-4">
          <button
            onClick={() => switchDesign("A")}
            className={`px-4 py-2 rounded-lg border transition-all ${
              currentDesign === "A"
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            Design A (Grille)
          </button>
          <button
            onClick={() => switchDesign("B")}
            className={`px-4 py-2 rounded-lg border transition-all ${
              currentDesign === "B"
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            Design B (Liste)
          </button>
        </div>
      </SettingItem>

      <SettingItem
        icon={Monitor}
        title="Application"
        description="Gérez le comportement général de l'application."
      >
        <div className="space-y-2">
          <Checkbox
            id="showQuitModal"
            label="Confirmation de fermeture"
            subLabel="Affiche une fenêtre de confirmation avant de quitter l'application."
            checked={config.showQuitModal}
            onChange={(val) => handleChange("showQuitModal", val)}
          />
          <Checkbox
            id="minimizeToTray"
            label="Réduire SwitchMaster dans la barre des taches"
            subLabel="L'application continue de tourner en arrière-plan une fois fermée."
            checked={config.minimizeToTray}
            onChange={(val) => handleChange("minimizeToTray", val)}
          />
          <Checkbox
            id="autoStart"
            label="Ouvrir SwitchMaster au démarrage"
            subLabel="Démarre automatiquement SwitchMaster à l'ouverture de Windows."
            checked={config.autoStart}
            onChange={handleAutoStartChange}
          />
          <Checkbox
            id="startMinimized"
            label="Démarrer en arrière-plan"
            subLabel={
              config.autoStart
                ? "L'application démarre cachée dans la barre système."
                : "Nécessite l'option 'Ouvrir SwitchMaster au démarrage' active."
            }
            checked={config.startMinimized}
            onChange={handleStartMinimizedChange}
            disabled={!config.autoStart}
          />
          <Checkbox
            id="enableGPU"
            label="Activer l'accélération matérielle"
            subLabel="Utilise le GPU pour soulager le CPU (Nécessite un redémarrage)."
            checked={config.enableGPU ?? false}
            onChange={(val) => onOpenGPUModal(val)}
          />
        </div>
      </SettingItem>

      <SettingItem
        icon={FolderOpen}
        title="Riot Client"
        description="Emplacement de l'exécutable Riot Client Services."
      >
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <input
              type="text"
              value={config.riotPath || ""}
              onChange={(e) => handleChange("riotPath", e.target.value)}
              placeholder="C:\Riot Games\Riot Client\RiotClientServices.exe"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm 
                text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
            />
          </div>
          <button
            onClick={onSelectRiotPath}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl 
              text-white transition-all duration-200 flex items-center gap-2 text-sm font-medium"
          >
            <FolderOpen size={ICON_SIZE_SMALL} />
            Parcourir
          </button>
        </div>
      </SettingItem>

      <SettingItem
        icon={Shield}
        title="Sécurité"
        description="Protégez vos comptes avec un code PIN au démarrage."
      >
        <Checkbox
          id="securityEnabled"
          label="Activer la protection par PIN"
          subLabel="Demande un code de sécurité à chaque ouverture de l'application."
          checked={config.security?.enabled ?? false}
          onChange={(val) => {
            if (val) {
              onOpenPinModal();
            } else {
              onDisablePin();
            }
          }}
        />
        {config.security?.enabled && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPinModal();
              }}
              className="text-sm font-bold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <Shield size={ICON_SIZE_XSMALL} />
              Définir / Modifier le code PIN
            </button>
          </div>
        )}
      </SettingItem>

      <SettingItem
        icon={Info}
        title="À propos"
        description="Informations sur la version et mises à jour."
      >
        <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
              <img
                src={logoImg}
                alt="SwitchMaster Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <div className="text-white font-bold">SwitchMaster v2.5.1</div>
              <div className="text-xs text-gray-500 font-medium">
                Développé par Coridor
              </div>
            </div>
          </div>
          <button
            onClick={onCheckUpdates}
            className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 
              px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200"
          >
            <RefreshCw size={ICON_SIZE_XSMALL} />
            Mettre à jour
          </button>
        </div>
      </SettingItem>
    </div>
  );
};

export default Settings;
