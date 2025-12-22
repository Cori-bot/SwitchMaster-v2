import React from "react";
import { Image as ImageIcon, CheckCircle2 } from "lucide-react";

interface ImageSelectorProps {
  cardImage: string;
  setCardImage: (path: string) => void;
  onSelectLocal: () => Promise<void>;
  iconSizeMedium: number;
  iconSizeSmall: number;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  cardImage,
  setCardImage,
  onSelectLocal,
  iconSizeMedium,
  iconSizeSmall,
}) => {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
        Image de fond (URL ou Fichier)
      </label>
      <div className="space-y-3">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
            <ImageIcon size={iconSizeSmall} />
          </div>
          <input
            type="text"
            value={cardImage.startsWith("http") ? cardImage : ""}
            onChange={(e) => setCardImage(e.target.value)}
            placeholder="Entrez l'URL de l'image..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 
              text-white placeholder:text-gray-600 focus:outline-none 
              focus:border-blue-500/50 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            Ou
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <button
          type="button"
          onClick={onSelectLocal}
          className="w-full flex items-center justify-between p-3.5 bg-black/40 border 
            border-white/10 rounded-xl hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-blue-500 transition-colors shrink-0">
              <ImageIcon size={iconSizeMedium} />
            </div>
            <div className="text-left overflow-hidden">
              <div className="text-sm font-medium text-gray-300">
                {!cardImage.startsWith("http") && cardImage
                  ? "Fichier sélectionné"
                  : "Sélectionner un fichier local"}
              </div>
              {!cardImage.startsWith("http") && cardImage && (
                <div className="text-[10px] text-gray-500 truncate">
                  {cardImage}
                </div>
              )}
            </div>
          </div>
          {!cardImage.startsWith("http") && cardImage && (
            <CheckCircle2
              size={iconSizeSmall}
              className="text-green-500 shrink-0"
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageSelector;
