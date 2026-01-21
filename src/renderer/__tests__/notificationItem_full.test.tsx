
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NotificationItem from "../components/NotificationItem";

describe("NotificationItem", () => {
    const defaultProps = {
        notification: {
            id: 1,
            message: "Test message",
            type: "success" as const,
        },
        onRemove: vi.fn(),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("doit déclencher onRemove après un délai en cas de swipe", () => {
        render(<NotificationItem {...defaultProps} />);

        const container = screen.getByText("Test message").closest(".group")!;

        // Start drag
        fireEvent.mouseDown(container, { clientX: 0 });

        // Move drag (> 100px)
        act(() => {
            const moveEvent = new MouseEvent("mousemove", { clientX: 150 });
            window.dispatchEvent(moveEvent);
        });

        // End drag
        act(() => {
            const upEvent = new MouseEvent("mouseup", {});
            window.dispatchEvent(upEvent);
        });

        // Should trigger remove logic which waits 200ms
        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(defaultProps.onRemove).toHaveBeenCalledWith(1);
    });

    it("ne doit pas déclencher onRemove si le swipe est insuffisant", () => {
        render(<NotificationItem {...defaultProps} />);

        const container = screen.getByText("Test message").closest(".group")!;

        // Start drag
        fireEvent.mouseDown(container, { clientX: 0 });

        // Move drag (< 100px)
        act(() => {
            const moveEvent = new MouseEvent("mousemove", { clientX: 50 });
            window.dispatchEvent(moveEvent);
        });

        // End drag
        act(() => {
            const upEvent = new MouseEvent("mouseup", {});
            window.dispatchEvent(upEvent);
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(defaultProps.onRemove).not.toHaveBeenCalled();
    });

    it("doit gérer les événements tactiles", () => {
        render(<NotificationItem {...defaultProps} />);
        const container = screen.getByText("Test message").closest(".group")!;

        fireEvent.touchStart(container, { touches: [{ clientX: 0 }] });

        act(() => {
            const moveEvent = new TouchEvent("touchmove", { touches: [{ clientX: 150 }] as any });
            window.dispatchEvent(moveEvent);
        });

        act(() => {
            const endEvent = new TouchEvent("touchend", {});
            window.dispatchEvent(endEvent);
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(defaultProps.onRemove).toHaveBeenCalledWith(1);
    });

    it("doit nettoyer les event listeners au démontage", () => {
        const { unmount } = render(<NotificationItem {...defaultProps} />);
        const removeSpy = vi.spyOn(window, "removeEventListener");

        // Trigger generic drag to attach listeners (listeners are attached in useEffect only if isDragging? No, conditional)
        // Actually code says: useEffect(() => ... [isDragging])
        // if (!isDragging) return;

        const container = screen.getByText("Test message").closest(".group")!;
        fireEvent.mouseDown(container, { clientX: 0 }); // isDragging = true

        unmount();

        expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    });

    it("doit supprimer la notification au clic sur le bouton fermer", () => {
        render(<NotificationItem {...defaultProps} />);
        const closeBtn = screen.getByRole("button"); // The X button

        fireEvent.click(closeBtn);

        act(() => {
            vi.advanceTimersByTime(200);
        });

    });

    it("doit appliquer les styles d'erreur", () => {
        render(<NotificationItem {...defaultProps} notification={{ ...defaultProps.notification, type: "error" }} />);
        const container = screen.getByText("Test message").closest(".group");
        expect(container?.className).toContain("bg-rose-500/10");
    });

    it("doit appliquer les styles info", () => {
        render(<NotificationItem {...defaultProps} notification={{ ...defaultProps.notification, type: "info" }} />);
        const container = screen.getByText("Test message").closest(".group");
        expect(container?.className).toContain("bg-blue-500/10");
    });
});
