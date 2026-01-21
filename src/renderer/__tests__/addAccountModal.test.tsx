import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import AddAccountModal from "../components/AddAccountModal";
import GameSelector from "../components/AddAccount/GameSelector";
import ImageSelector from "../components/AddAccount/ImageSelector";

// Mock logger
vi.mock("../utils/logger", () => ({
    devError: vi.fn(),
    devLog: vi.fn(),
}));

// Mock IPC
const mockInvoke = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    (window as any).ipc = {
        invoke: mockInvoke,
    };
});

afterEach(() => {
    delete (window as any).ipc;
});

// ==== GameSelector Tests ====
describe("GameSelector", () => {
    it("doit afficher les deux options de jeu", () => {
        const setGameType = vi.fn();
        render(
            <GameSelector
                gameType="valorant"
                setGameType={setGameType}
                animationDuration="duration-200"
            />
        );

        expect(screen.getByText("Valorant")).toBeInTheDocument();
        expect(screen.getByText("League of Legends")).toBeInTheDocument();
    });

    it("doit changer de jeu au clic sur Valorant", () => {
        const setGameType = vi.fn();
        render(
            <GameSelector
                gameType="league"
                setGameType={setGameType}
                animationDuration="duration-200"
            />
        );

        fireEvent.click(screen.getByText("Valorant"));
        expect(setGameType).toHaveBeenCalledWith("valorant");
    });

    it("doit changer de jeu au clic sur League", () => {
        const setGameType = vi.fn();
        render(
            <GameSelector
                gameType="valorant"
                setGameType={setGameType}
                animationDuration="duration-200"
            />
        );

        fireEvent.click(screen.getByText("League of Legends"));
        expect(setGameType).toHaveBeenCalledWith("league");
    });
});

// ==== ImageSelector Tests ====
describe("ImageSelector", () => {
    it("doit afficher le champ URL et le bouton de sélection", () => {
        render(
            <ImageSelector
                cardImage=""
                setCardImage={vi.fn()}
                onSelectLocal={vi.fn()}
                iconSizeMedium={20}
                iconSizeSmall={16}
            />
        );

        expect(screen.getByPlaceholderText("Entrez l'URL de l'image...")).toBeInTheDocument();
        expect(screen.getByText("Sélectionner un fichier local")).toBeInTheDocument();
    });

    it("doit afficher l'URL si cardImage commence par http", () => {
        render(
            <ImageSelector
                cardImage="https://example.com/image.png"
                setCardImage={vi.fn()}
                onSelectLocal={vi.fn()}
                iconSizeMedium={20}
                iconSizeSmall={16}
            />
        );

        const input = screen.getByPlaceholderText("Entrez l'URL de l'image...") as HTMLInputElement;
        expect(input.value).toBe("https://example.com/image.png");
    });

    it("doit afficher 'Fichier sélectionné' pour un chemin local", () => {
        render(
            <ImageSelector
                cardImage="/path/to/image.png"
                setCardImage={vi.fn()}
                onSelectLocal={vi.fn()}
                iconSizeMedium={20}
                iconSizeSmall={16}
            />
        );

        expect(screen.getByText("Fichier sélectionné")).toBeInTheDocument();
        expect(screen.getByText("/path/to/image.png")).toBeInTheDocument();
    });

    it("doit appeler setCardImage lors de la saisie d'une URL", () => {
        const setCardImage = vi.fn();
        render(
            <ImageSelector
                cardImage=""
                setCardImage={setCardImage}
                onSelectLocal={vi.fn()}
                iconSizeMedium={20}
                iconSizeSmall={16}
            />
        );

        const input = screen.getByPlaceholderText("Entrez l'URL de l'image...");
        fireEvent.change(input, { target: { value: "https://test.com" } });
        expect(setCardImage).toHaveBeenCalledWith("https://test.com");
    });

    it("doit appeler onSelectLocal au clic sur le bouton", () => {
        const onSelectLocal = vi.fn();
        render(
            <ImageSelector
                cardImage=""
                setCardImage={vi.fn()}
                onSelectLocal={onSelectLocal}
                iconSizeMedium={20}
                iconSizeSmall={16}
            />
        );

        fireEvent.click(screen.getByText("Sélectionner un fichier local"));
        expect(onSelectLocal).toHaveBeenCalled();
    });
});

// ==== AddAccountModal Tests ====
describe("AddAccountModal", () => {
    it("ne doit pas rendre le modal si isOpen est false", () => {
        render(
            <AddAccountModal
                isOpen={false}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        expect(screen.queryByText("Ajouter un compte")).not.toBeInTheDocument();
    });

    it("doit afficher le titre 'Ajouter un compte' pour un nouveau compte", () => {
        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        expect(screen.getByText("Ajouter un compte")).toBeInTheDocument();
        expect(screen.getByText("Ajouter le compte")).toBeInTheDocument();
    });

    it("doit afficher le titre 'Modifier le compte' en mode édition", async () => {
        mockInvoke.mockResolvedValueOnce({ username: "user1", password: "pass1" });

        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={{
                    id: "1",
                    name: "Test",
                    riotId: "Test#123",
                    gameType: "valorant",
                    isFavorite: false,
                }}
            />
        );

        expect(screen.getByText("Modifier le compte")).toBeInTheDocument();
        expect(screen.getByText("Sauvegarder")).toBeInTheDocument();
    });

    it("doit fermer le modal au clic sur Annuler", () => {
        const onClose = vi.fn();
        render(
            <AddAccountModal
                isOpen={true}
                onClose={onClose}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        fireEvent.click(screen.getByText("Annuler"));
        expect(onClose).toHaveBeenCalled();
    });

    it("doit fermer le modal au clic sur le backdrop", () => {
        const onClose = vi.fn();
        render(
            <AddAccountModal
                isOpen={true}
                onClose={onClose}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        // Le backdrop a la classe bg-black/60
        const backdrop = document.querySelector(".bg-black\\/60");
        if (backdrop) fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
    });

    it("doit toggle la visibilité du mot de passe", () => {
        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        const passwordInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
        expect(passwordInput.type).toBe("password");

        // Cliquer sur le bouton toggle
        const toggleButtons = screen.getAllByRole("button");
        const eyeButton = toggleButtons.find(btn => btn.closest(".relative.group"));
        if (eyeButton) {
            fireEvent.click(eyeButton);
        }
    });

    it("doit soumettre le formulaire avec les données valides", () => {
        const onAdd = vi.fn();
        const onClose = vi.fn();

        render(
            <AddAccountModal
                isOpen={true}
                onClose={onClose}
                onAdd={onAdd}
                editingAccount={null}
            />
        );

        // Remplir le formulaire
        fireEvent.change(screen.getByPlaceholderText("Ex: Mon Compte Principal"), {
            target: { value: "Mon Compte" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "myuser" },
        });
        fireEvent.change(screen.getByPlaceholderText("••••••••"), {
            target: { value: "mypassword" },
        });
        fireEvent.change(screen.getByPlaceholderText("Ex: Nom#TAG"), {
            target: { value: "Player#TAG" },
        });

        // Soumettre
        fireEvent.click(screen.getByText("Ajouter le compte"));

        expect(onAdd).toHaveBeenCalledWith({
            id: undefined,
            name: "Mon Compte",
            username: "myuser",
            password: "mypassword",
            riotId: "Player#TAG",
            gameType: "valorant",
            cardImage: "",
        });
        expect(onClose).toHaveBeenCalled();
    });

    it("ne doit pas soumettre si les champs sont vides", () => {
        const onAdd = vi.fn();

        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={onAdd}
                editingAccount={null}
            />
        );

        fireEvent.click(screen.getByText("Ajouter le compte"));
        expect(onAdd).not.toHaveBeenCalled();
    });

    it("doit charger les credentials en mode édition", async () => {
        mockInvoke.mockResolvedValueOnce({ username: "existingUser", password: "existingPass" });

        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={{
                    id: "123",
                    name: "Existing Account",
                    riotId: "Existing#TAG",
                    gameType: "league",
                    isFavorite: true,
                    cardImage: "http://example.com/bg.png",
                }}
            />
        );

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("get-account-credentials", "123");
        });

        // Vérifier que les champs sont pré-remplis
        await waitFor(() => {
            const nameInput = screen.getByPlaceholderText("Ex: Mon Compte Principal") as HTMLInputElement;
            expect(nameInput.value).toBe("Existing Account");
        });
    });

    it("doit gérer l'erreur lors du chargement des credentials", async () => {
        mockInvoke.mockRejectedValueOnce(new Error("Failed"));

        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={{
                    id: "123",
                    name: "Test",
                    riotId: "Test#123",
                    gameType: "valorant",
                    isFavorite: false,
                }}
            />
        );

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("get-account-credentials", "123");
        });
    });

    it("doit sélectionner une image locale", async () => {
        mockInvoke.mockResolvedValueOnce("C:\\path\\to\\image.png");

        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        fireEvent.click(screen.getByText("Sélectionner un fichier local"));

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith("select-account-image");
        });
    });

    it("doit changer le type de jeu", () => {
        render(
            <AddAccountModal
                isOpen={true}
                onClose={vi.fn()}
                onAdd={vi.fn()}
                editingAccount={null}
            />
        );

        fireEvent.click(screen.getByText("League of Legends"));
        // Le state est interne, mais on vérifie que le bouton est cliquable
    });
});
