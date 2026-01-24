import React, { createContext, useContext, useState, ReactNode } from "react";

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

  const switchDesign = (design: DesignType) => {
    setDesign(design);
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
