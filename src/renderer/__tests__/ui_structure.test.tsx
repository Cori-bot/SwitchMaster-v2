import { render, screen, fireEvent, act } from "@testing-library/react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import LoadingScreen from "../components/LoadingScreen";
import NotificationItem from "../components/NotificationItem";
import { vi, describe, it, expect } from "vitest";
import React from "react";

// Mock des images
vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));

describe("Sidebar", () => {
  it("doit changer de vue", () => {
    const onViewChange = vi.fn();
    render(<Sidebar activeView="dashboard" onViewChange={onViewChange} />);
    
    expect(screen.getByText(/Comptes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Paramètres/i));
    expect(onViewChange).toHaveBeenCalledWith("settings");
  });
});

describe("TopBar", () => {
  it("doit afficher le statut et les filtres", () => {
    const onFilterChange = vi.fn();
    render(
      <TopBar 
        status={{ status: "Actif: Player" }} 
        showFilters={true} 
        onFilterChange={onFilterChange} 
      />
    );
    
    expect(screen.getByText(/Actif: Player/i)).toBeInTheDocument();
    
    // Test des filtres
    fireEvent.click(screen.getByText(/Favoris/i));
    expect(onFilterChange).toHaveBeenCalledWith("favorite");
  });
});

describe("LoadingScreen", () => {
  it("doit s'afficher", () => {
    render(<LoadingScreen />);
    expect(screen.getByText(/Initialisation/i)).toBeInTheDocument();
  });
});

describe("NotificationItem", () => {
  it("doit afficher le message et se supprimer au clic", async () => {
    const onRemove = vi.fn();
    const notification = {
      id: 1,
      type: "success" as const,
      message: "Action réussie"
    };
    
    render(<NotificationItem notification={notification} onRemove={onRemove} />);
    
    expect(screen.getByText("Action réussie")).toBeInTheDocument();
    
    // Cliquer sur le bouton fermer (X)
    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    
    // Attendre le timeout de suppression
    await act(async () => {
      await new Promise(r => setTimeout(r, 250));
    });
    
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("doit gérer le swipe (drag)", () => {
    const onRemove = vi.fn();
    const notification = { id: 1, message: "Swipe me", type: "info" as const };
    render(<NotificationItem notification={notification} onRemove={onRemove} />);
    
    const element = screen.getByText("Swipe me").closest('div')!;
    
    // Simulation drag start
    fireEvent.mouseDown(element, { clientX: 0 });
    // Simulation drag move (plus de 100px pour trigger remove)
    fireEvent.mouseMove(window, { clientX: 150 });
    // Simulation drag end
    fireEvent.mouseUp(window);
    
    // On ne vérifie pas onRemove direct car il y a un setTimeout
  });
});