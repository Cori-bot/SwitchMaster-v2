import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AddAccountModal from "../components/AddAccountModal";

vi.mock("../utils/logger", () => ({
    devError: vi.fn(),
}));

describe("AddAccountModal - Full Branch Coverage", () => {
    const mockOnClose = vi.fn();
    const mockOnAdd = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (window as any).ipc = {
            invoke: vi.fn().mockImplementation((channel: string) => {
                if (channel === "get-account-credentials") {
                    return Promise.resolve({ username: "testuser", password: "testpass" });
                }
                if (channel === "select-account-image") {
                    return Promise.resolve("/path/to/image.png");
                }
                return Promise.resolve(null);
            }),
        };
    });

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        onAdd: mockOnAdd,
        editingAccount: null,
    };

    it("ne doit pas appeler onAdd si name est vide (ligne 93-94)", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Remplir tous les champs SAUF le nom
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), {
            target: { value: "testpass" },
        });
        fireEvent.change(screen.getByPlaceholderText("Ex: Nom#TAG"), {
            target: { value: "Test#TAG" },
        });

        // Cliquer sur le bouton submit
        fireEvent.click(screen.getByText("Ajouter le compte"));

        // onAdd ne doit pas être appelé
        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("ne doit pas appeler onAdd si username est vide (ligne 93-94)", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Remplir tous les champs SAUF username
        fireEvent.change(screen.getByPlaceholderText("Ex: Mon Compte Principal"), {
            target: { value: "My Account" },
        });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), {
            target: { value: "testpass" },
        });
        fireEvent.change(screen.getByPlaceholderText("Ex: Nom#TAG"), {
            target: { value: "Test#TAG" },
        });

        // Cliquer sur le bouton submit
        fireEvent.click(screen.getByText("Ajouter le compte"));

        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("ne doit pas appeler onAdd si password est vide (ligne 93-94)", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Remplir tous les champs SAUF password
        fireEvent.change(screen.getByPlaceholderText("Ex: Mon Compte Principal"), {
            target: { value: "My Account" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("Ex: Nom#TAG"), {
            target: { value: "Test#TAG" },
        });

        fireEvent.click(screen.getByText("Ajouter le compte"));

        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("ne doit pas appeler onAdd si riotId est vide (ligne 93-94)", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Remplir tous les champs SAUF riotId
        fireEvent.change(screen.getByPlaceholderText("Ex: Mon Compte Principal"), {
            target: { value: "My Account" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), {
            target: { value: "testpass" },
        });

        fireEvent.click(screen.getByText("Ajouter le compte"));

        expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it("doit appeler onAdd quand tous les champs sont remplis", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Remplir tous les champs
        fireEvent.change(screen.getByPlaceholderText("Ex: Mon Compte Principal"), {
            target: { value: "My Account" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "testuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), {
            target: { value: "testpass" },
        });
        fireEvent.change(screen.getByPlaceholderText("Ex: Nom#TAG"), {
            target: { value: "Test#TAG" },
        });

        fireEvent.click(screen.getByText("Ajouter le compte"));

        expect(mockOnAdd).toHaveBeenCalledWith({
            id: undefined,
            name: "My Account",
            username: "testuser",
            password: "testpass",
            riotId: "Test#TAG",
            gameType: "valorant",
            cardImage: "",
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it("doit gérer l'erreur lors de la récupération des credentials (ligne 76-78)", async () => {
        const { devError } = await import("../utils/logger");

        (window as any).ipc.invoke = vi.fn().mockRejectedValue(new Error("IPC Error"));

        const editingAccount = {
            id: "123",
            name: "Test Account",
            riotId: "Test#TAG",
            gameType: "valorant" as const,
            isFavorite: false,
            cardImage: "",
        };

        await act(async () => {
            render(<AddAccountModal {...defaultProps} editingAccount={editingAccount} />);
        });

        await waitFor(() => {
            expect(devError).toHaveBeenCalledWith("Failed to fetch credentials:", expect.any(Error));
        });
    });

    it("doit gérer le cas où creds est null (ligne 72)", async () => {
        (window as any).ipc.invoke = vi.fn().mockResolvedValue(null);

        const editingAccount = {
            id: "123",
            name: "Test Account",
            riotId: "Test#TAG",
            gameType: "valorant" as const,
            isFavorite: false,
            cardImage: "",
        };

        await act(async () => {
            render(<AddAccountModal {...defaultProps} editingAccount={editingAccount} />);
        });

        // Le composant doit être rendu sans erreur
        expect(screen.getByText("Modifier le compte")).toBeDefined();
    });

    it("doit toggle la visibilité du mot de passe", () => {
        render(<AddAccountModal {...defaultProps} />);

        const passwordInput = screen.getByPlaceholderText("••••••••");
        expect(passwordInput).toHaveProperty("type", "password");

        // Cliquer sur le bouton toggle
        const toggleButtons = screen.getAllByRole("button");
        const eyeButton = toggleButtons.find(btn => btn.closest(".relative.group"));
        if (eyeButton) {
            fireEvent.click(eyeButton);
        }
    });

    it("doit sélectionner une image via le bouton local", async () => {
        render(<AddAccountModal {...defaultProps} />);

        // Trouver et cliquer sur le bouton de sélection d'image
        const localButton = screen.getByText("Sélectionner un fichier local");

        await act(async () => {
            fireEvent.click(localButton);
        });

        await waitFor(() => {
            expect((window as any).ipc.invoke).toHaveBeenCalledWith("select-account-image");
        });
    });
});
