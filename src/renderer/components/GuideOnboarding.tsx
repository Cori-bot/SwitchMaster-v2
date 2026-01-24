import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    FolderOpen,
    Star,
    Zap,
    MousePointer2
} from "lucide-react";
import logoImg from "@assets/switchmaster/switchmaster-icon.svg";
import { Config } from "../../shared/types";

interface GuideOnboardingProps {
    config: Config | null;
    onUpdateConfig: (newConfig: Partial<Config>) => Promise<void>;
    onSelectRiotPath: () => void;
    onFinish: () => void;
}

const steps = [
    {
        id: "welcome",
        title: "Bienvenue sur SwitchMaster v2",
        description: "Le compagnon ultime pour vos comptes Riot Games. Simple, rapide et pratique",
    },
    {
        id: "config",
        title: "Configuration de Riot",
        description: "Nous avons besoin de savoir où se trouve votre Riot Client pour automatiser les connexions",
    },
    {
        id: "tips",
        title: "Quelques astuces",
        description: "Découvrez comment tirer le meilleur parti de l'application",
    },
    {
        id: "ready",
        title: "Vous êtes prêt !",
        description: "Il est temps d'ajouter votre premier compte et de dominer la Faille et d'enchaîner les headshoots sur Valorant",
    }
];

const GuideOnboarding: React.FC<GuideOnboardingProps> = ({
    config,
    onUpdateConfig,
    onSelectRiotPath,
    onFinish
}) => {
    const [currentStep, setCurrentStep] = useState(0);

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const prevStep = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleFinish = async () => {
        await onUpdateConfig({ hasSeenOnboarding: true });
        onFinish();
    };

    const renderWelcome = () => (
        <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-32 h-32 mb-4"
            >
                <img src={logoImg} alt="SwitchMaster Logo" className="w-full h-full object-contain" />
            </motion.div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter">SWITCHMASTER <span className="text-blue-500">V2</span></h2>
        </div>
    );

    const renderConfig = () => (
        <div className="flex flex-col space-y-8 w-full">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FolderOpen className="text-blue-500" size={20} />
                    Chemin Riot Client
                </h3>
                <p className="text-sm text-gray-400 mb-6 font-medium leading-relaxed">
                    SwitchMaster utilise cet exécutable pour lancer vos jeux automatiquement après la connexion
                </p>

                <div className="flex gap-3">
                    <input
                        type="text"
                        value={config?.riotPath || ""}
                        onChange={(e) => onUpdateConfig({ riotPath: e.target.value })}
                        placeholder="C:\Riot Games\Riot Client\RiotClientServices.exe"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 font-mono truncate focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button
                        onClick={onSelectRiotPath}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold flex items-center gap-2 whitespace-nowrap shadow-lg shadow-blue-600/20"
                    >
                        Parcourir
                    </button>
                </div>
                {config?.riotPath && (
                    <p className="mt-4 text-[11px] text-green-500 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={12} />
                        Chemin détecté avec succès
                    </p>
                )}
            </div>
        </div>
    );

    const renderTips = () => (
        <div className="grid grid-cols-1 gap-3 w-full">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                    <Star size={20} fill="currentColor" />
                </div>
                <div>
                    <h4 className="text-md font-bold text-white uppercase text-[12px] tracking-wider">Favoris</h4>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">Marquez vos comptes principaux pour y accéder plus vite depuis le Dashboard et la barre des tâches</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Zap size={20} />
                </div>
                <div>
                    <h4 className="text-md font-bold text-white uppercase text-[12px] tracking-wider">Changement Rapide</h4>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">Utilisez l'icône dans la zone de notification (systray) pour changer de compte sans même ouvrir l'application</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                    <MousePointer2 size={20} />
                </div>
                <div>
                    <h4 className="text-md font-bold text-white uppercase text-[12px] tracking-wider">Drag & Drop</h4>
                    <p className="text-[13px] text-gray-500 mt-1 leading-snug">Organisez vos comptes librement en les faisant glisser sur le Dashboard</p>
                </div>
            </div>
        </div>
    );

    const renderReady = () => (
        <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 2
                }}
                className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-2"
            >
                <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-3xl font-black text-white">Action !</h2>
            <p className="text-gray-400 max-w-sm">
                Tout est configuré. SwitchMaster est prêt à booster votre expérience de jeu
            </p>
        </div>
    );

    const stepContent = [
        renderWelcome(),
        renderConfig(),
        renderTips(),
        renderReady()
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-xl bg-[#111] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[650px] relative"
            >
                {/* Background Decorative Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600 blur-[80px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600 blur-[80px] rounded-full" />
                </div>

                {/* Progress Bar */}
                <div className="flex h-1 bg-white/5">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 transition-all duration-500 ${i <= currentStep ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" : ""}`}
                        />
                    ))}
                </div>

                {/* Header */}
                <div className="px-10 pt-10 pb-4 text-center relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 block">
                        Étape {currentStep + 1} sur {steps.length}
                    </span>
                    <h2 className="text-2xl font-black text-white">{steps[currentStep].title}</h2>
                    <p className="text-sm text-gray-500 mt-2">{steps[currentStep].description}</p>
                </div>

                {/* Content Area */}
                <div className={`flex-1 px-10 flex flex-col justify-center overflow-y-auto custom-scrollbar relative z-10 ${currentStep === 2 ? "" : "items-center"}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            {stepContent[currentStep]}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="p-8 px-10 bg-white/2 border-t border-white/5 flex items-center justify-between relative z-10">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 text-sm font-bold transition-all ${currentStep === 0 ? "opacity-0 pointer-events-none" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <ChevronLeft size={18} />
                        Précédent
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={currentStep === 1 && !config?.riotPath}
                        className={`bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {currentStep === steps.length - 1 ? "Commencer" : "Suivant"}
                        <ChevronRight size={18} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default GuideOnboarding;
