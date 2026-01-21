
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateModal } from "../components/Modals/UpdateModal";

// Mock window.ipc
beforeEach(() => {
    vi.clearAllMocks();
    (window as any).ipc = { invoke: vi.fn() };
});

describe("UpdateModal Component", () => {
    const defaultProps = {
        isOpen: true,
        status: "available",
        progress: 0,
        version: "2.0.0",
        releaseNotes: "New features added",
        error: undefined,
        onUpdate: vi.fn(),
        onCancel: vi.fn(),
    };

    describe("rendering states", () => {
        it("ne doit rien afficher si isOpen est false", () => {
            const { container } = render(<UpdateModal {...defaultProps} isOpen={false} />);
            expect(container.firstChild).toBeNull();
        });

        it("doit afficher le status 'checking'", () => {
            render(<UpdateModal {...defaultProps} status="checking" />);
            expect(screen.getByText("Recherche...")).toBeInTheDocument();
            expect(screen.getByText("Vérification des mises à jour...")).toBeInTheDocument();
        });

        it("doit afficher le status 'available'", () => {
            render(<UpdateModal {...defaultProps} status="available" />);
            expect(screen.getByText("Mise à jour disponible")).toBeInTheDocument();
            expect(screen.getByText("v2.0.0")).toBeInTheDocument();
            expect(screen.getByText("Télécharger maintenant")).toBeInTheDocument();
        });

        it("doit afficher le status 'downloading' avec la progression", () => {
            render(<UpdateModal {...defaultProps} status="downloading" progress={50} />);
            expect(screen.getByText("Téléchargement...")).toBeInTheDocument();
            expect(screen.getByText("50%")).toBeInTheDocument();
        });

        it("doit afficher le status 'downloaded'", () => {
            render(<UpdateModal {...defaultProps} status="downloaded" />);
            expect(screen.getByText("Mise à jour prête")).toBeInTheDocument();
            expect(screen.getByText("Redémarrer et Installer")).toBeInTheDocument();
        });

        it("doit afficher le status 'not-available'", () => {
            render(<UpdateModal {...defaultProps} status="not-available" />);
            expect(screen.getByText("Application à jour")).toBeInTheDocument();
            expect(screen.getByText("Super !")).toBeInTheDocument();
        });

        it("doit afficher le status 'error'", () => {
            render(<UpdateModal {...defaultProps} status="error" error="Network error" />);
            expect(screen.getByText("Erreur")).toBeInTheDocument();
            expect(screen.getByText("Network error")).toBeInTheDocument();
        });

        it("doit afficher le message d'erreur par défaut", () => {
            render(<UpdateModal {...defaultProps} status="error" />);
            expect(screen.getByText("Erreur lors de la mise à jour.")).toBeInTheDocument();
        });

        it("doit afficher le status par défaut", () => {
            render(<UpdateModal {...defaultProps} status="unknown" />);
            expect(screen.getByText("Mise à jour")).toBeInTheDocument();
        });
    });

    describe("release notes", () => {
        it("doit afficher les release notes si présentes", () => {
            render(<UpdateModal {...defaultProps} releaseNotes="<p>Bug fixes</p>" />);
            expect(screen.getByText("Bug fixes")).toBeInTheDocument();
        });

        it("doit supprimer les balises HTML des release notes", () => {
            render(<UpdateModal {...defaultProps} releaseNotes="<h1>Title</h1><p>Content</p>" />);
            expect(screen.getByText("TitleContent")).toBeInTheDocument();
        });

        it("ne doit pas afficher les release notes si absentes", () => {
            render(<UpdateModal {...defaultProps} releaseNotes={undefined} />);
            expect(screen.queryByText("New features added")).not.toBeInTheDocument();
        });
    });

    describe("interactions", () => {
        it("doit appeler onUpdate quand on clique sur télécharger", () => {
            render(<UpdateModal {...defaultProps} status="available" />);
            fireEvent.click(screen.getByText("Télécharger maintenant"));
            expect(defaultProps.onUpdate).toHaveBeenCalled();
        });

        it("doit appeler onCancel quand on clique sur le bouton X", () => {
            render(<UpdateModal {...defaultProps} />);
            const closeButton = screen.getByRole("button", { name: "" }); // X button has no text
            fireEvent.click(closeButton);
            expect(defaultProps.onCancel).toHaveBeenCalled();
        });

        it("doit appeler onCancel quand on clique sur 'Super !'", () => {
            render(<UpdateModal {...defaultProps} status="not-available" />);
            fireEvent.click(screen.getByText("Super !"));
            expect(defaultProps.onCancel).toHaveBeenCalled();
        });

        it("doit appeler install-update quand on clique sur redémarrer", () => {
            render(<UpdateModal {...defaultProps} status="downloaded" />);
            fireEvent.click(screen.getByText("Redémarrer et Installer"));
            expect((window as any).ipc.invoke).toHaveBeenCalledWith("install-update");
        });

        it("doit appeler onCancel quand on clique sur Fermer (error)", () => {
            render(<UpdateModal {...defaultProps} status="error" />);
            fireEvent.click(screen.getByText("Fermer"));
            expect(defaultProps.onCancel).toHaveBeenCalled();
        });
    });
});
