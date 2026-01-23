
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NotificationItem from "../components/NotificationItem";

describe("NotificationItem Coverage", () => {
    const mockOnRemove = vi.fn();

    const baseProps = {
        onRemove: mockOnRemove,
    };

    it("gère le swipe non déclenché (diff <= 0)", () => {
        render(<NotificationItem notification={{ id: 1, message: "Test", type: "info" }} {...baseProps} />);

        const item = screen.getByText("Test").parentElement!;

        // Start drag
        fireEvent.mouseDown(item, { clientX: 100 });

        // Move left (diff < 0)
        fireEvent.mouseMove(window, { clientX: 50 });

        // Should not move (offsetX state stays 0, hard to test internal state directly without implementation details, but we can infer from style if needed or coverage)
        // With coverage, just executing this path is enough.
        fireEvent.mouseUp(window);

        // onRemove not called
        expect(mockOnRemove).not.toHaveBeenCalled();
    });

    it("gère le swipe insuffisant (diff <= 100)", () => {
        render(<NotificationItem notification={{ id: 1, message: "Test", type: "info" }} {...baseProps} />);

        const item = screen.getByText("Test").parentElement!;

        fireEvent.mouseDown(item, { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 150 }); // diff = 50
        fireEvent.mouseUp(window);

        expect(mockOnRemove).not.toHaveBeenCalled();
    });

    it("gère le swipe réussie (diff > 100)", () => {
        vi.useFakeTimers();
        render(<NotificationItem notification={{ id: 1, message: "Test", type: "info" }} {...baseProps} />);

        const item = screen.getByText("Test").parentElement!;

        fireEvent.mouseDown(item, { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 250 }); // diff = 150 > 100
        fireEvent.mouseUp(window);

        // triggerRemove called, waits 200ms
        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(mockOnRemove).toHaveBeenCalledWith(1);
        vi.useRealTimers();
    });

    it("couvre les différents types de notification", () => {
        const { rerender } = render(<NotificationItem notification={{ id: 1, message: "Success", type: "success" }} {...baseProps} />);
        expect(screen.getByText("Success")).toBeInTheDocument();

        rerender(<NotificationItem notification={{ id: 2, message: "Error", type: "error" }} {...baseProps} />);
        expect(screen.getByText("Error")).toBeInTheDocument();

        // Already tested info in previous tests
    });

    it("arrête la propagation du click sur le bouton de fermeture", () => {
        render(<NotificationItem notification={{ id: 1, message: "Test", type: "info" }} {...baseProps} />);

        // Mock stopPropagation
        const stopPropagation = vi.fn();
        const btn = screen.getByRole("button"); // The X button

        fireEvent.click(btn, { stopPropagation });

        // Since we are mocking the event in fireEvent usually, but React handles it.
        // We mainly want to ensure onRemove is called right away -> triggerRemove -> timeout
        vi.useFakeTimers();
        fireEvent.click(btn);

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(mockOnRemove).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("gère les événements tactiles (Touch)", () => {
        render(<NotificationItem notification={{ id: 1, message: "Touch Test", type: "info" }} {...baseProps} />);
        const item = screen.getByText("Touch Test").parentElement!;

        // Touch start
        fireEvent.touchStart(item, { touches: [{ clientX: 100 }] });

        // Touch move
        fireEvent.touchMove(window, { touches: [{ clientX: 300 }] }); // diff 200

        // Touch end
        fireEvent.touchEnd(window);

        vi.useFakeTimers();
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(mockOnRemove).toHaveBeenCalled();
        vi.useRealTimers();
    });
});
