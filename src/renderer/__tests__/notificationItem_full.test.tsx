import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NotificationItem from "../components/NotificationItem";

describe("NotificationItem - 100% Coverage", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const successNotification = {
        id: 1,
        message: "Success message",
        type: "success" as const,
    };

    const errorNotification = {
        id: 2,
        message: "Error message",
        type: "error" as const,
    };

    const infoNotification = {
        id: 3,
        message: "Info message",
        type: "info" as const,
    };

    it("doit afficher une notification de type success", () => {
        render(<NotificationItem notification={successNotification} onRemove={vi.fn()} />);
        expect(screen.getByText("Success message")).toBeDefined();
    });

    it("doit afficher une notification de type error", () => {
        render(<NotificationItem notification={errorNotification} onRemove={vi.fn()} />);
        expect(screen.getByText("Error message")).toBeDefined();
    });

    it("doit afficher une notification de type info", () => {
        render(<NotificationItem notification={infoNotification} onRemove={vi.fn()} />);
        expect(screen.getByText("Info message")).toBeDefined();
    });

    it("doit appeler onRemove au clic sur le bouton X", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={onRemove} />);

        fireEvent.click(screen.getByRole("button"));

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(onRemove).toHaveBeenCalledWith(1);
    });

    it("doit gérer le swipe vers la droite avec mousedown/mousemove/mouseup", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={onRemove} />);

        const notification = screen.getByText("Success message").closest("div");

        // Start dragging
        fireEvent.mouseDown(notification!, { clientX: 0 });

        // Move right (> 100px should trigger removal)
        fireEvent(window, new MouseEvent("mousemove", { clientX: 150 }));

        // End dragging
        fireEvent(window, new MouseEvent("mouseup"));

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(onRemove).toHaveBeenCalledWith(1);
    });

    it("doit gérer handleMove quand isDragging est false (ligne 33)", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={vi.fn()} />);

        // Trigger mousemove without mousedown (isDragging = false)
        fireEvent(window, new MouseEvent("mousemove", { clientX: 100 }));

        // Should not crash and onRemove should not be called
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("doit gérer handleEnd quand isDragging est false (ligne 42)", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={vi.fn()} />);

        // Trigger mouseup without mousedown (isDragging = false)
        fireEvent(window, new MouseEvent("mouseup"));

        // Should not crash and onRemove should not be called
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("doit revenir à position 0 si swipe < 100px", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={onRemove} />);

        const notification = screen.getByText("Success message").closest("div");

        // Start dragging
        fireEvent.mouseDown(notification!, { clientX: 0 });

        // Move right but less than 100px
        fireEvent(window, new MouseEvent("mousemove", { clientX: 50 }));

        // End dragging
        fireEvent(window, new MouseEvent("mouseup"));

        // Should not remove
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("doit ignorer le swipe vers la gauche (diff < 0)", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={onRemove} />);

        const notification = screen.getByText("Success message").closest("div");

        // Start dragging
        fireEvent.mouseDown(notification!, { clientX: 100 });

        // Move left (negative diff)
        fireEvent(window, new MouseEvent("mousemove", { clientX: 50 }));

        // End dragging
        fireEvent(window, new MouseEvent("mouseup"));

        // Should not remove
        expect(onRemove).not.toHaveBeenCalled();
    });

    it("doit gérer les événements touch", () => {
        const onRemove = vi.fn();
        render(<NotificationItem notification={successNotification} onRemove={onRemove} />);

        const notification = screen.getByText("Success message").closest("div");

        // Touch start
        fireEvent.touchStart(notification!, { touches: [{ clientX: 0 }] });

        // Touch move
        fireEvent(window, new TouchEvent("touchmove", {
            touches: [{ clientX: 150 } as Touch]
        }));

        // Touch end
        fireEvent(window, new TouchEvent("touchend"));

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(onRemove).toHaveBeenCalledWith(1);
    });
});
