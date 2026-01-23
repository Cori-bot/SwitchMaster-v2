import { spawn, exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs-extra";
import { clipboard, app, BrowserWindow } from "electron";
import { devDebug, devError } from "../logger";

const execAsync = util.promisify(exec);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RiotAutomationService {
  private readonly PROCESS_TERMINATION_DELAY = 2000;
  private readonly MONITOR_INTERVAL_MS = 30000;
  private readonly GAME_LAUNCH_DELAY_MS = 3000;

  constructor() {}

  // Helper to ensure scripts path is correct in dev environment
  private getScriptsPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "scripts");
    }
    return path.resolve(app.getAppPath(), "scripts");
  }

  public async killProcesses(): Promise<void> {
    try {
      try {
        await execAsync(
          'taskkill /F /IM "RiotClientServices.exe" /IM "LeagueClient.exe" /IM "VALORANT.exe"',
        );
      } catch (e) {
        devDebug(
          "Taskkill ignore (no processes):",
          e instanceof Error ? e.message : e,
        );
      }
      await wait(this.PROCESS_TERMINATION_DELAY);
    } catch (e) {
      devError("killRiotProcesses cleanup error:", e);
    }
  }

  public async launchClient(clientPath: string): Promise<void> {
    if (await fs.pathExists(clientPath)) {
      const child = spawn(clientPath, [], { detached: true, stdio: "ignore" });
      child.unref();
    } else {
      throw new Error("Riot Client executable not found at: " + clientPath);
    }
  }

  public async launchGame(
    clientPath: string,
    gameId: "league" | "valorant",
  ): Promise<void> {
    if (!(await fs.pathExists(clientPath))) {
      throw new Error("Executable Riot Client non trouvé à : " + clientPath);
    }

    // Small delay to allow client to stabilize
    await wait(this.GAME_LAUNCH_DELAY_MS);

    let args: string[] = [];
    if (gameId === "valorant") {
      args = ["--launch-product=valorant", "--launch-patchline=live"];
    } else if (gameId === "league") {
      args = ["--launch-product=league_of_legends", "--launch-patchline=live"];
    }

    spawn(clientPath, args, { detached: true, stdio: "ignore" }).unref();
  }

  public async login(username: string, password: string): Promise<void> {
    const psScript = path.join(this.getScriptsPath(), "automate_login.ps1");

    return new Promise<void>((resolve, reject) => {
      const args = [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScript,
        "-Username",
        username,
        "-Password",
        password,
      ];

      const ps = spawn("powershell.exe", args);
      let output = "";
      let errorOutput = "";

      ps.stdout.on("data", (d) => (output += d.toString()));
      ps.stderr.on("data", (d) => (errorOutput += d.toString()));

      ps.on("close", (code) => {
        clipboard.clear();

        if (code === 0 && output.includes("SUCCESS")) {
          devDebug("Login automation completed successfully");
          resolve();
        } else {
          devError("Login automation failed:", errorOutput || output);
          reject(new Error("Login automation failed"));
        }
      });

      ps.on("error", (err) => {
        clipboard.clear();
        devError("PowerShell spawn error:", err);
        reject(err);
      });
    });
  }

  public async autoDetectPaths(): Promise<{ riotPath: string } | null> {
    try {
      const psScript = path.join(this.getScriptsPath(), "detect_games.ps1");
      const { stdout } = await execAsync(
        `powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`,
      );

      const results = JSON.parse(stdout) as Array<{
        DisplayName?: string;
        InstallLocation?: string;
      }>;

      const riotEntry = results.find(
        (item) => item.DisplayName && item.DisplayName.includes("Riot Client"),
      );

      if (riotEntry && riotEntry.InstallLocation) {
        const riotPath = path.join(
          riotEntry.InstallLocation,
          "RiotClientServices.exe",
        );
        if (await fs.pathExists(riotPath)) {
          return { riotPath };
        }
      }
      return null;
    } catch (e) {
      devError("Auto detect error:", e);
      return null;
    }
  }

  public async isRiotClientRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV',
      );
      return stdout.includes("RiotClientServices.exe");
    } catch {
      return false;
    }
  }

  public async isValorantRunning(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq VALORANT-Win64-Shipping.exe" /FO CSV',
      );
      return stdout.includes("VALORANT-Win64-Shipping.exe");
    } catch {
      return false;
    }
  }

  public monitorRiotProcess(
    mainWindow: BrowserWindow | null,
    onClosed?: () => void,
  ) {
    setInterval(async () => {
      try {
        const isRunning = await this.isRiotClientRunning();
        if (!isRunning) {
          if (onClosed) onClosed();
          if (mainWindow) mainWindow.webContents.send("riot-client-closed");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        devDebug("Monitor interval error:", message);
      }
    }, this.MONITOR_INTERVAL_MS);
  }
}
