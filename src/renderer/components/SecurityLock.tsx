import React, { useState, useEffect } from "react";
import { Shield, AlertCircle, Delete } from "lucide-react";

import {
  ICON_SIZE_MEDIUM,
  ICON_SIZE_XSMALL,
} from "@/constants/ui";

interface SecurityLockProps {
  mode?: "verify" | "set" | "disable";
  onVerify: (pin: string) => Promise<boolean>;
  onSet: (pin: string) => Promise<void>;
  onCancel?: () => void;
}

const SecurityLock: React.FC<SecurityLockProps> = ({
  mode = "verify",
  onVerify,
  onSet,
  onCancel,
}) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(1); // 1 for initial PIN, 2 for confirmation
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const PIN_LENGTH = 4;

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handleComplete();
    }
  }, [pin]);

  const handleNumberClick = (num: string | number) => {
    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + num);
      setError("");
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleComplete = async () => {
    setLoading(true);
    if (mode === "verify" || mode === "disable") {
      const isValid = await onVerify(pin);
      if (!isValid) {
        setError("Code PIN incorrect");
        setPin("");
      }
    } else if (mode === "set") {
      if (step === 1) {
        setConfirmPin(pin);
        setPin("");
        setStep(2);
      } else {
        if (pin === confirmPin) {
          await onSet(pin);
        } else {
          setError("Les codes ne correspondent pas");
          setPin("");
          setStep(1);
          setConfirmPin("");
        }
      }
    }
    setLoading(false);
  };

  const getHeaderTitle = () => {
    if (mode === "verify") return "Verrouillé";
    if (mode === "disable") return "Désactiver";
    return step === 1 ? "Définir" : "Confirmer";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-y-auto scrollbar-hide">
      <div className="w-full max-w-[320px] flex flex-col items-center py-4">
        <div className="flex items-center gap-4 mb-10">
          <div
            className={`w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-2xl shadow-blue-600/10 ${loading ? "animate-pulse" : ""}`}
          >
            <Shield size={ICON_SIZE_MEDIUM} />
          </div>
          <h2 className="text-2xl font-black text-white text-center">
            {getHeaderTitle()}
          </h2>
        </div>

        <div className="flex gap-6 mb-10">
          {[...Array(PIN_LENGTH)].map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? "bg-blue-500 border-blue-500 scale-125 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                  : "border-white/10"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-bold mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle size={ICON_SIZE_XSMALL} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-5 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={loading}
              className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-white text-2xl font-bold transition-all active:scale-90 border border-white/5 disabled:opacity-50 flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumberClick("0")}
            disabled={loading}
            className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 text-white text-2xl font-bold transition-all active:scale-90 border border-white/5 disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || pin.length === 0}
            className="w-20 h-20 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90 disabled:opacity-30 mx-auto"
          >
            <Delete size={28} />
          </button>
        </div>

        {mode !== "verify" && (
          <button
            onClick={onCancel || (() => {})}
            className="mt-10 text-gray-500 hover:text-white text-sm font-bold transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};

export default SecurityLock;
