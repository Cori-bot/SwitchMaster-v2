import { render, screen, fireEvent } from "@testing-library/react";
import { UpdateModal } from "../components/Modals/UpdateModal";
import { vi, describe, it, expect } from "vitest";


describe("UpdateModal Component", () => {
  const props = {
    isOpen: true,
    version: "2.0.0",
    releaseNotes: "Nouvelle version super cool",
    status: "available",
    progress: 0,
    onUpdate: vi.fn(),
    onCancel: vi.fn(),
  };

  it("doit afficher les notes de version et le bouton de téléchargement", () => {
    render(<UpdateModal {...props} />);
    expect(screen.getByText(/Nouvelle version super cool/i)).toBeInTheDocument();
    expect(screen.getByText(/Télécharger maintenant/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Télécharger maintenant/i));
    expect(props.onUpdate).toHaveBeenCalled();
  });

  it("doit afficher la progression du téléchargement", () => {
    render(<UpdateModal {...props} status="downloading" progress={45} />);
    expect(screen.getByText(/Téléchargement/i)).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("doit afficher le bouton d'installation quand prêt", () => {
    render(<UpdateModal {...props} status="downloaded" />);
    expect(screen.getByText(/Redémarrer et Installer/i)).toBeInTheDocument();
  });

  it("doit afficher une erreur", () => {
    render(<UpdateModal {...props} status="error" error="Crash!" />);
    expect(screen.getByText(/Crash!/i)).toBeInTheDocument();
  });
});
