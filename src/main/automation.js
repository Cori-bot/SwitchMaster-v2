const { spawn, exec } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs-extra");
const { clipboard, app } = require("electron");
const execAsync = util.promisify(exec);
const setTimeoutAsync = util.promisify(setTimeout);

const PROCESS_TERMINATION_DELAY = 2000;
const MAX_WINDOW_CHECK_ATTEMPTS = 30;
const WINDOW_CHECK_POLLING_MS = 1000;
const LOGIN_ACTION_DELAY_MS = 500;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const SCRIPTS_PATH = isDev ?
  path.join(__dirname, "..", "scripts") :
  path.join(process.resourcesPath, "scripts");

async function killRiotProcesses() {
  try {
    console.log("Killing existing Riot processes...");
    try {
      await execAsync('taskkill /F /IM "RiotClientServices.exe" /IM "LeagueClient.exe" /IM "VALORANT.exe"');
    } catch (e) {
      console.log("Taskkill failed (processes might not be running):", e.message);
    }
    await setTimeoutAsync(PROCESS_TERMINATION_DELAY);
  } catch (e) {
    console.log("Processes cleanup err:", e.message);
  }
}

async function launchRiotClient(clientPath) {
  console.log("Launching Riot Client from:", clientPath);
  if (await fs.pathExists(clientPath)) {
    const child = spawn(clientPath, [], { detached: true, stdio: "ignore" });
    child.unref();
  } else {
    throw new Error("Riot Client executable not found at: " + clientPath);
  }
}

async function performAutomation(username, password) {
  const psScript = path.join(SCRIPTS_PATH, "automate_login.ps1");

  const runPs = (action) => {
    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", [
        "-ExecutionPolicy", "Bypass", "-File", psScript, "-Action", action,
      ]);
      let output = "";
      ps.stdout.on("data", (d) => (output += d.toString()));
      ps.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`PS Action ${action} failed`));
        }
      });
    });
  };

  async function waitForWindowRecursive(currentAttempt = 0) {
    if (currentAttempt >= MAX_WINDOW_CHECK_ATTEMPTS) {
      return false;
    }
    try {
      const check = await runPs("Check");
      if (check && check.includes("Found")) {
        return true;
      }
    } catch (e) {
      console.warn("Window check attempt failed:", e.message);
    }
    await setTimeoutAsync(WINDOW_CHECK_POLLING_MS);
    return waitForWindowRecursive(currentAttempt + 1);
  }

  console.log("Waiting for window...");
  const isWindowFound = await waitForWindowRecursive();

  if (!isWindowFound) {
    throw new Error("Riot Client window not detected.");
  }
  console.log("Window found. Performing Login...");

  clipboard.writeText(username);
  await runPs("PasteTab");
  clipboard.clear();

  await setTimeoutAsync(LOGIN_ACTION_DELAY_MS);

  clipboard.writeText(password);
  await runPs("PasteEnter");
  clipboard.clear();
}

async function autoDetectPaths() {
  try {
    const psScript = path.join(SCRIPTS_PATH, "detect_games.ps1");
    const { stdout } = await execAsync(
      `powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`,
    );

    const results = JSON.parse(stdout);
    const riotEntry = results.find(
      (item) => item.DisplayName && item.DisplayName.includes("Riot Client"),
    );

    if (riotEntry && riotEntry.InstallLocation) {
      const riotPath = path.join(riotEntry.InstallLocation, "RiotClientServices.exe");
      if (await fs.pathExists(riotPath)) {
        return { riotPath };
      }
    }
    return null;
  } catch (e) {
    console.error("Auto detect error:", e);
    return null;
  }
}

module.exports = {
  killRiotProcesses,
  launchRiotClient,
  performAutomation,
  autoDetectPaths,
  SCRIPTS_PATH,
};
