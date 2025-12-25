import * as fs from "fs";
import * as path from "path";
import { devLog, devError } from "../logger";

export interface GlzServerInfo {
    region: string; // na, latam, br, eu, ap, kr
    shard: string;  // na, pbe, eu, ap, kr
}

// Client platform encoded in base64 (required header for GLZ API)
export const CLIENT_PLATFORM = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

// Get the path to ShooterGame.log
function getLogPath(): string {
    const localAppData = process.env.LOCALAPPDATA || "";
    return path.join(localAppData, "VALORANT", "Saved", "Logs", "ShooterGame.log");
}

// Parse ShooterGame.log to extract region and shard
export function parseGlzServerInfo(): GlzServerInfo | null {
    const logPath = getLogPath();

    try {
        if (!fs.existsSync(logPath)) {
            devLog("[LOG-PARSER] ShooterGame.log not found");
            return null;
        }

        // Read only the last portion of the file (it can be very large)
        const stats = fs.statSync(logPath);
        const readSize = Math.min(stats.size, 1024 * 1024); // Max 1MB from end
        const fd = fs.openSync(logPath, "r");
        const buffer = Buffer.alloc(readSize);
        fs.readSync(fd, buffer, 0, readSize, Math.max(0, stats.size - readSize));
        fs.closeSync(fd);

        const content = buffer.toString("utf-8");

        // Regex to extract region and shard from GLZ URLs
        // Example: https://glz-eu-1.eu.a.pvp.net
        const glzRegex = /https:\/\/glz-([a-z]+)-1\.([a-z]+)\.a\.pvp\.net/g;

        let lastMatch: RegExpExecArray | null = null;
        let match: RegExpExecArray | null;

        // Find the last occurrence (most recent)
        while ((match = glzRegex.exec(content)) !== null) {
            lastMatch = match;
        }

        if (lastMatch) {
            const region = lastMatch[1];
            const shard = lastMatch[2];
            devLog(`[LOG-PARSER] Found GLZ server: region=${region}, shard=${shard}`);
            return { region, shard };
        }

        devLog("[LOG-PARSER] No GLZ URL found in ShooterGame.log");
        return null;
    } catch (err) {
        devError("[LOG-PARSER] Error reading ShooterGame.log:", err);
        return null;
    }
}

// Parse client version from ShooterGame.log
export function parseClientVersion(): string | null {
    const logPath = getLogPath();

    try {
        if (!fs.existsSync(logPath)) {
            return null;
        }

        // Read only the first portion of the file (version is usually at the start)
        const fd = fs.openSync(logPath, "r");
        const buffer = Buffer.alloc(50 * 1024); // 50KB from start
        fs.readSync(fd, buffer, 0, 50 * 1024, 0);
        fs.closeSync(fd);

        const content = buffer.toString("utf-8");

        // Regex to extract client version
        // Example: CI server version: release-11.11-shipping-10-4091853
        const versionRegex = /CI server version:\s*([\w-]+)/;
        const match = content.match(versionRegex);

        if (match) {
            devLog(`[LOG-PARSER] Found client version: ${match[1]}`);
            return match[1];
        }

        // Alternative pattern from branch info
        const branchRegex = /Branch:\s*([\w-]+)/;
        const branchMatch = content.match(branchRegex);

        if (branchMatch) {
            devLog(`[LOG-PARSER] Found branch version: ${branchMatch[1]}`);
            return branchMatch[1];
        }

        devLog("[LOG-PARSER] Client version not found in log");
        return null;
    } catch (err) {
        devError("[LOG-PARSER] Error parsing client version:", err);
        return null;
    }
}
