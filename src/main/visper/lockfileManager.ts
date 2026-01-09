
import path from "path";
import fs from "fs-extra";
import os from "os";

export interface LockfileData {
    name: string;
    pid: number;
    port: number;
    password: string;
    protocol: string;
}

export class LockfileManager {
    static getLockfilePath(): string {
        return path.join(process.env.LOCALAPPDATA || "", "Riot Games", "Riot Client", "Config", "lockfile");
    }

    static async readLockfile(): Promise<LockfileData | null> {
        try {
            const lockfilePath = this.getLockfilePath();
            if (!await fs.pathExists(lockfilePath)) return null;

            // Le lockfile est parfois verrouillé en écriture par Riot, mais la lecture devrait passer.
            // Une petite retry loop pourrait être utile en prod, mais simple lecture ici.
            const content = await fs.readFile(lockfilePath, 'utf-8');
            const parts = content.split(':');

            if (parts.length < 5) return null;

            return {
                name: parts[0],
                pid: parseInt(parts[1], 10),
                port: parseInt(parts[2], 10),
                password: parts[3],
                protocol: parts[4]
            };
        } catch (e) {
            // Silencieux car c'est normal si le jeu n'est pas lancé
            return null;
        }
    }

    static async getLocalHeaders(): Promise<Record<string, string> | null> {
        const data = await this.readLockfile();
        if (!data) return null;

        const auth = Buffer.from(`riot:${data.password}`).toString('base64');
        return {
            "Authorization": `Basic ${auth}`
        };
    }

    static async getBaseUrl(): Promise<string | null> {
        const data = await this.readLockfile();
        if (!data) return null;
        return `${data.protocol}://127.0.0.1:${data.port}`;
    }
}
