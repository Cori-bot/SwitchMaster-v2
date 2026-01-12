import { spawn, exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs-extra";
import { clipboard, app } from "electron";
const execAsync = util.promisify(exec);
const setTimeoutAsync = util.promisify(setTimeout);

import { devDebug, devError } from "./logger";

const PROCESS_TERMINATION_DELAY = 2000;

export const SCRIPTS_PATH = !app.isPackaged
  ? path.join(__dirname, "..", "scripts")
  : path.join(process.resourcesPath, "scripts");

export async function killRiotProcesses() {
  try {
    try {
      await execAsync(
        'taskkill /F /IM "RiotClientServices.exe" /IM "LeagueClient.exe" /IM "VALORANT.exe"',
      );
    } catch (e) {
      // Taskkill failed (processes might not be running), ignore
      devDebug(
        "Taskkill ignore (no processes):",
        e instanceof Error ? e.message : e,
      );
    }
    await setTimeoutAsync(PROCESS_TERMINATION_DELAY);
  } catch (e) {
    // Cleanup error, ignore
    devError("killRiotProcesses cleanup error:", e);
  }
}

export async function launchRiotClient(clientPath: string) {
  if (await fs.pathExists(clientPath)) {
    const child = spawn(clientPath, [], { detached: true, stdio: "ignore" });
    child.unref();
  } else {
    throw new Error("Riot Client executable not found at: " + clientPath);
  }
}

export async function performAutomation(username: string, password: string) {
  const psScript = path.join(SCRIPTS_PATH, "automate_login.ps1");

  return new Promise<void>((resolve, reject) => {
    const args = ["-ExecutionPolicy", "Bypass", "-File", psScript];

    const ps = spawn("powershell.exe", args);

    // Pass credentials via stdin to avoid process listing exposure
    const inputPayload = JSON.stringify({
      Username: username,
      Password: password,
    });
    ps.stdin.write(inputPayload);
    ps.stdin.end();

    let output = "";
    let errorOutput = "";

    ps.stdout.on("data", (d) => (output += d.toString()));
    ps.stderr.on("data", (d) => (errorOutput += d.toString()));

    ps.on("close", (code) => {
      // Sécurité supplémentaire : vider le presse-papier côté Electron
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


interface DetectionResult {
  DisplayName?: string;
  InstallLocation?: string;
}

export async function autoDetectPaths() {
  try {
    const psScript = path.join(SCRIPTS_PATH, "detect_games.ps1");
    const { stdout } = await execAsync(
      `powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`,
    );

    const results = JSON.parse(stdout) as DetectionResult[];
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
