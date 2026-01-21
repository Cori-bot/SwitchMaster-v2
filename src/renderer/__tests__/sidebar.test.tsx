import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Sidebar from "../components/Sidebar";

// Mock des images
vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));

describe("Sidebar", () => {
    it("doit afficher le logo et les boutons de navigation", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);

        expect(screen.getByAltText("Logo")).toBeDefined();
        expect(screen.getByText("Comptes")).toBeDefined();
        expect(screen.getByText("Paramètres")).toBeDefined();
    });

    it("doit appeler onViewChange avec 'dashboard' au clic sur Comptes", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="settings" onViewChange={onViewChange} />);

        fireEvent.click(screen.getByText("Comptes"));
        expect(onViewChange).toHaveBeenCalledWith("dashboard");
    });

    it("doit appeler onViewChange avec 'settings' au clic sur Paramètres", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);

        fireEvent.click(screen.getByText("Paramètres"));
        expect(onViewChange).toHaveBeenCalledWith("settings");
    });

    it("doit appliquer le style actif sur le bouton dashboard quand activeView est 'dashboard'", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);

        const dashboardBtn = screen.getByText("Comptes").closest("button");
        expect(dashboardBtn?.className).toContain("bg-blue-600");
    });

    it("doit appliquer le style actif sur le bouton settings quand activeView est 'settings'", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="settings" onViewChange={onViewChange} />);

        const settingsBtn = screen.getByText("Paramètres").closest("button");
        expect(settingsBtn?.className).toContain("bg-blue-600");
    });

    it("doit gérer l'erreur de chargement du logo", () => {
        const onViewChange = vi.fn();
        render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);

        const logo = screen.getByAltText("Logo") as HTMLImageElement;
        fireEvent.error(logo);
        expect(logo.style.display).toBe("none");
    });
});
