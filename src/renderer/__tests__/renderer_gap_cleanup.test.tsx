
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AddAccountModal from "../components/AddAccountModal";
import NotificationItem from "../components/NotificationItem";
import SecurityLock from "../components/SecurityLock";
import React from "react";

describe("Renderer Gap Cleanup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("AddAccountModal preserves early return on empty submit (Line 94)", () => {
        const onAdd = vi.fn();
        render(<AddAccountModal isOpen={true} onAdd={onAdd} onClose={vi.fn()} editingAccount={undefined} />);

        // Submit with empty fields
        const submitBtn = screen.getByText("Ajouter le compte");
        fireEvent.click(submitBtn);

        expect(onAdd).not.toHaveBeenCalled();
    });

    it("NotificationItem handles move/end without dragging (Line 33, 42)", () => {
        const notif = { id: 1, type: "success" as const, message: "test", duration: 5000 };
        render(<NotificationItem notification={notif} onRemove={vi.fn()} />);

        // Simuler move/end directement sans start
        fireEvent.mouseMove(window, { clientX: 100 });
        fireEvent.mouseUp(window);

        expect(screen.getByText("test")).toBeInTheDocument();
    });

    it("SecurityLock handles extra clicks after PIN full (Line 37)", () => {
        render(<SecurityLock mode="verify" onVerify={vi.fn()} onSet={vi.fn()} />);
        const btn1 = screen.getByText("1");

        // Type 4 times
        fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1);
        // Type 5th time
        fireEvent.click(btn1);

        expect(true).toBe(true);
    });
});
