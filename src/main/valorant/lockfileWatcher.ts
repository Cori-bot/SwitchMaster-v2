import fs from "fs-extra";
import path from "path";
import os from "os";
import { LockfileData } from "./types";
import { devLog } from "../logger";

export class LockfileWatcher {
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly LOCKFILE_PATH = path.join(
        process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
        "Riot Games",
        "Riot Client",
        "Config",
        "lockfile"
    );

    private onConnect: (data: LockfileData) => void;
    private onDisconnect: () => void;

    constructor(
        onConnect: (data: LockfileData) => void,
        onDisconnect: () => void
    ) {
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
    }

    public start() {
        devLog("[VALORANT-WATCHER] Starting watcher on:", this.LOCKFILE_PATH);
        // Initial check
        this.checkLockfile();

        // Poll every 2 seconds to detect game start/exit if filesystem events fail
        this.checkInterval = setInterval(() => this.checkLockfile(), 2000);
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    private async checkLockfile() {
        try {
            const exists = await fs.pathExists(this.LOCKFILE_PATH);
            if (exists) {
                const content = await fs.readFile(this.LOCKFILE_PATH, "utf-8");
                const data = this.parseLockfile(content);
                if (data) {
                    this.onConnect(data);
                }
            } else {
                this.onDisconnect();
            }
        } catch (e) {
            // Ignore read errors (file might be locked during writing)
        }
    }

    private parseLockfile(content: string): LockfileData | null {
        try {
            // name:pid:port:password:protocol
            const parts = content.split(":");
            if (parts.length < 5) return null;

            return {
                port: parts[2],
                password: parts[3],
                protocol: parts[4],
            };
        } catch (e) {
            return null;
        }
    }
}
