import { spawn, exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs-extra";
import { clipboard, app } from "electron";
const execAsync = util.promisify(exec);
const setTimeoutAsync = util.promisify(setTimeout);

import { devDebug, devError } from "./logger";

const PROCESS_TERMINATION_DELAY = 2000;
const MAX_WINDOW_CHECK_ATTEMPTS = 30;
const WINDOW_CHECK_POLLING_MS = 1000;
const LOGIN_ACTION_DELAY_MS = 500;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
export const SCRIPTS_PATH = isDev
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

  const runPs = (action: string, text: string = ""): Promise<string> => {
    return new Promise((resolve, reject) => {
      const args = [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScript,
        "-Action",
        action,
      ];

      // Use stdin for sensitive data (SetSecure action) to avoid process list exposure
      // Always use stdin for SetSecure to maintain consistent behavior, even if text is empty
      const useStdin = action === "SetSecure";

      if (text && !useStdin) {
        args.push("-Text", text);
      }

      const ps = spawn("powershell.exe", args);

      if (useStdin) {
        // Pass sensitive text via stdin
        if (text) {
          ps.stdin.write(text + "\n");
        }
      }

      // ALWAYS close stdin to prevent PowerShell from hanging waiting for input
      ps.stdin.end();

      let output = "";
      ps.stdout.on("data", (d) => (output += d.toString()));
      ps.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`PS Action ${action} failed`));
        }
      });

      ps.on("error", (err) => {
          devError(`PS Action ${action} spawn error:`, err);
          reject(err);
      });
    });
  };

  async function waitForWindowRecursive(
    currentAttempt: number = 0,
  ): Promise<boolean> {
    if (currentAttempt >= MAX_WINDOW_CHECK_ATTEMPTS) {
      return false;
    }
    try {
      const check = await runPs("Check");
      if (check && check.includes("Found")) {
        return true;
      }
    } catch (e) {
      // Window check attempt failed, ignore and retry
      devDebug("Window check retry...");
    }
    await setTimeoutAsync(WINDOW_CHECK_POLLING_MS);
    return waitForWindowRecursive(currentAttempt + 1);
  }

  const isWindowFound = await waitForWindowRecursive();

  if (!isWindowFound) {
    throw new Error("Riot Client window not detected.");
  }

  // Double Check Focus before typing
  await runPs("Focus");

  // Injection du Username (Sécurisé)
  await runPs("SetSecure", username);
  await runPs("PasteTab");
  await runPs("Clear");

  await setTimeoutAsync(LOGIN_ACTION_DELAY_MS);

  // Injection du Password (Sécurisé)
  await runPs("SetSecure", password);
  await runPs("PasteEnter");

  // Sécurité ultime : On vide le presse-papier après un court délai
  // pour s'assurer que le password n'y reste pas une seconde de trop
  setTimeout(() => {
    void runPs("Clear").catch(() => { });
    clipboard.clear(); // Double sécurité Electron + PS
  }, 2000);
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
