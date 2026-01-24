import { render, screen, fireEvent } from "@testing-library/react";
import Settings from "../components/Settings";
import { DesignProvider } from "../contexts/DesignContext";
import { vi, describe, it, expect } from "vitest";

describe("Settings Branches Coverage", () => {
  const mockHandlers = {
    onUpdate: vi.fn(),
    onSelectRiotPath: vi.fn(),
    onCheckUpdates: vi.fn(),
    onOpenPinModal: vi.fn(),
    onDisablePin: vi.fn(),
    onOpenGPUModal: vi.fn(),
  };

  it("doit rendre un état vide si pas de config", () => {
    render(
      <DesignProvider>
        <Settings config={null as any} {...mockHandlers} />
      </DesignProvider>,
    );
    expect(screen.queryByText(/Application/i)).not.toBeInTheDocument();
  });

  it("doit déclencher onUpdate sur le toggle autoStart en utilisant l'ID", () => {
    const config = { autoStart: false, hasPin: true, riotPath: "" };
    const { container } = render(
      <DesignProvider>
        <Settings config={config as any} {...mockHandlers} />
      </DesignProvider>,
    );

    // Utiliser container.querySelector pour être sûr de l'élément input exact

    const input = container.querySelector("#autoStart");
    if (!input) throw new Error("Input not found");

    fireEvent.click(input);
    expect(mockHandlers.onUpdate).toHaveBeenCalledWith({ autoStart: true });
  });
});
