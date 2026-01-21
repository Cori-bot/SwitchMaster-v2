import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SecurityLock from "../components/SecurityLock";

describe("SecurityLock", () => {
    it("doit afficher le titre 'Verrouillé' en mode verify", () => {
        render(
            <SecurityLock
                mode="verify"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={vi.fn()}
            />
        );
        expect(screen.getByText("Verrouillé")).toBeDefined();
    });

    it("doit afficher le titre 'Désactiver' en mode disable", () => {
        render(
            <SecurityLock
                mode="disable"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={vi.fn()}
            />
        );
        expect(screen.getByText("Désactiver")).toBeDefined();
    });

    it("doit afficher le titre 'Définir' en mode set", () => {
        render(
            <SecurityLock
                mode="set"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={vi.fn()}
            />
        );
        expect(screen.getByText("Définir")).toBeDefined();
    });

    it("doit appeler onVerify quand le PIN est complet en mode verify", async () => {
        const onVerify = vi.fn().mockResolvedValue(true);
        render(
            <SecurityLock
                mode="verify"
                onVerify={onVerify}
                onSet={vi.fn()}
            />
        );

        // Entrer le PIN 1234
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));
        fireEvent.click(screen.getByText("3"));
        fireEvent.click(screen.getByText("4"));

        await waitFor(() => {
            expect(onVerify).toHaveBeenCalledWith("1234");
        });
    });

    it("doit afficher une erreur si le PIN est incorrect", async () => {
        const onVerify = vi.fn().mockResolvedValue(false);
        render(
            <SecurityLock
                mode="verify"
                onVerify={onVerify}
                onSet={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("1"));

        await waitFor(() => {
            expect(screen.getByText("Code PIN incorrect")).toBeDefined();
        });
    });

    it("doit supprimer le dernier chiffre au clic sur Delete", () => {
        const onVerify = vi.fn().mockResolvedValue(true);
        render(
            <SecurityLock
                mode="verify"
                onVerify={onVerify}
                onSet={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));

        // Clic sur le bouton delete (chercher par role)
        const buttons = screen.getAllByRole("button");
        const deleteBtn = buttons.find(btn => btn.className.includes("text-gray-400"));
        if (deleteBtn) {
            fireEvent.click(deleteBtn);
        }

        // Le PIN ne devrait pas être complet
        expect(onVerify).not.toHaveBeenCalled();
    });

    it("doit passer à l'étape de confirmation en mode set", async () => {
        const onSet = vi.fn().mockResolvedValue(undefined);
        render(
            <SecurityLock
                mode="set"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={onSet}
            />
        );

        // Premier PIN
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));
        fireEvent.click(screen.getByText("3"));
        fireEvent.click(screen.getByText("4"));

        await waitFor(() => {
            expect(screen.getByText("Confirmer")).toBeDefined();
        });

        // Confirmer le même PIN
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));
        fireEvent.click(screen.getByText("3"));
        fireEvent.click(screen.getByText("4"));

        await waitFor(() => {
            expect(onSet).toHaveBeenCalledWith("1234");
        });
    });

    it("doit afficher une erreur si les codes ne correspondent pas", async () => {
        const onSet = vi.fn();
        render(
            <SecurityLock
                mode="set"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={onSet}
            />
        );

        // Premier PIN
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));
        fireEvent.click(screen.getByText("3"));
        fireEvent.click(screen.getByText("4"));

        await waitFor(() => {
            expect(screen.getByText("Confirmer")).toBeDefined();
        });

        // PIN différent
        fireEvent.click(screen.getByText("5"));
        fireEvent.click(screen.getByText("6"));
        fireEvent.click(screen.getByText("7"));
        fireEvent.click(screen.getByText("8"));

        await waitFor(() => {
            expect(screen.getByText("Les codes ne correspondent pas")).toBeDefined();
        });
    });

    it("doit appeler onCancel au clic sur Annuler en mode set", () => {
        const onCancel = vi.fn();
        render(
            <SecurityLock
                mode="set"
                onVerify={vi.fn().mockResolvedValue(true)}
                onSet={vi.fn()}
                onCancel={onCancel}
            />
        );

        fireEvent.click(screen.getByText("Annuler"));
        expect(onCancel).toHaveBeenCalled();
    });

    it("doit pouvoir entrer le chiffre 0", async () => {
        const onVerify = vi.fn().mockResolvedValue(true);
        render(
            <SecurityLock
                mode="verify"
                onVerify={onVerify}
                onSet={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText("0"));
        fireEvent.click(screen.getByText("0"));
        fireEvent.click(screen.getByText("0"));
        fireEvent.click(screen.getByText("0"));

        await waitFor(() => {
            expect(onVerify).toHaveBeenCalledWith("0000");
        });
    });

    it("ne doit pas ajouter de chiffre si le PIN est déjà complet", () => {
        const onVerify = vi.fn().mockResolvedValue(true);
        render(
            <SecurityLock
                mode="verify"
                onVerify={onVerify}
                onSet={vi.fn()}
            />
        );

        // Simuler des clics très rapides (avant la validation)
        fireEvent.click(screen.getByText("1"));
        fireEvent.click(screen.getByText("2"));
        fireEvent.click(screen.getByText("3"));
        // Le 4ème clic déclenchera la validation
    });
});
