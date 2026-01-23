import { render, screen } from "@testing-library/react";
import App from "../App";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock des images
vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));
vi.mock("@assets/valorant.png", () => ({ default: "mock-val" }));
vi.mock("@assets/league.png", () => ({ default: "mock-lol" }));

// Mock global window.ipc
beforeEach(() => {
  vi.clearAllMocks();
  (window as any).ipc = {
    invoke: vi.fn().mockResolvedValue({}),
    on: vi.fn(() => vi.fn()),
    send: vi.fn()
  };
});

// Mock des hooks globaux
vi.mock("../hooks/useAccounts", () => ({ useAccounts: () => ({ accounts: [], refreshAccounts: vi.fn() }) }));
vi.mock("../hooks/useConfig", () => ({ useConfig: () => ({ config: { hasSeenOnboarding: true }, refreshConfig: vi.fn() }) }));
vi.mock("../hooks/useSecurity", () => ({ useSecurity: () => ({ checkSecurityStatus: vi.fn().mockResolvedValue(false) }) }));
vi.mock("../hooks/useNotifications", () => ({ useNotifications: () => ({ notifications: [] }) }));
vi.mock("../hooks/useAppIpc", () => ({ useAppIpc: () => ({ status: { status: "Prêt" }, updateInfo: { isOpen: false } }) }));

// Mock des composants critiques
vi.mock("../components/LoadingScreen", () => ({ default: () => <div data-testid="ready">READY</div> }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("App Root", () => {
  it("doit monter l'application", async () => {
    render(<App />);
    expect(screen.getByTestId("ready")).toBeInTheDocument();
  });
});
