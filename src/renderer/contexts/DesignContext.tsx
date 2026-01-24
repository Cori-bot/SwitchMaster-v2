import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type DesignType = "A" | "B";

interface DesignContextType {
  currentDesign: DesignType;
  switchDesign: (design: DesignType) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export const DesignProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentDesign, setDesign] = useState<DesignType>("A");

  // Load preferred design from config on mount
  useEffect(() => {
    const loadPreferredDesign = async () => {
      try {
        const config = await window.ipc.invoke("get-config");
        if (config?.preferredDesign) {
          setDesign(config.preferredDesign);
        }
      } catch {
        // Fallback to default
      }
    };
    void loadPreferredDesign();
  }, []);

  const switchDesign = (design: DesignType) => {
    setDesign(design);
    // Persist to config
    window.ipc.invoke("save-config", { preferredDesign: design }).catch(() => {
      // Silent fail, design is still applied locally
    });
  };

  return (
    <DesignContext.Provider value={{ currentDesign, switchDesign }}>
      {children}
    </DesignContext.Provider>
  );
};

export const useDesign = () => {
  const context = useContext(DesignContext);
  if (!context) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return context;
};
