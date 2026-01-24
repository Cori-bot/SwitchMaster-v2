import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemService } from "../main/services/SystemService";
import { app } from "electron";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    get execPath() {
      return "C:\\App.exe";
    },
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn().mockReturnValue({ openAtLogin: true }),
  },
}));

describe("SystemService", () => {
  let service: SystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SystemService();
    vi.stubGlobal("process", { ...process, execPath: "C:\\App.exe" });
  });

  it("setAutoStart cases", () => {
    (app as any).isPackaged = false;
    service.setAutoStart(true, true);
    expect(app.setLoginItemSettings).toHaveBeenCalled();

    (app as any).isPackaged = true;
    service.setAutoStart(true, false);
    expect(app.setLoginItemSettings).toHaveBeenCalled();

    service.setAutoStart(false, false);
    expect(app.setLoginItemSettings).toHaveBeenCalled();
  });

  it("getAutoStartStatus cases", () => {
    (app.getLoginItemSettings as any).mockReturnValue({
      openAtLogin: true,
      wasOpenedAtLogin: true,
    });
    expect(service.getAutoStartStatus().enabled).toBe(true);

    (app.getLoginItemSettings as any).mockReturnValue({});
    expect(service.getAutoStartStatus().enabled).toBe(false);
  });
});
