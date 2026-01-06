import fs from "fs-extra";
import path from "path";
import { getPaths, encryptData, decryptData } from "../config";
import { devLog, devError } from "../logger";
import { session } from "electron";
import { VisperAuthSession } from "../valorant-api/riotWebviewAuth";

const VISPER_PARTITION = "persist:visper";

export interface VisperSavedSession {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: string;
  accountLevel: number;
  competitiveTier: number;
  playerCardId: string;
  cookies: string; // JSON string encoded/encrypted
  timestamp: number;
}

export class VisperSessionManager {
  private static getSessionsFile() {
    return path.join(
      path.dirname(getPaths().ACCOUNTS_FILE),
      "visper_sessions.json",
    );
  }

  static async getSessions(): Promise<VisperSavedSession[]> {
    try {
      const file = this.getSessionsFile();
      if (await fs.pathExists(file)) {
        return await fs.readJson(file);
      }
    } catch (e) {
      devError("[SessionManager] Failed to load sessions:", e);
    }
    return [];
  }

  static async saveSession(
    authData: VisperAuthSession,
  ): Promise<VisperSavedSession> {
    try {
      const sessions = await this.getSessions();

      // 1. Capturer les cookies actuels de la partition
      const ses = session.fromPartition(VISPER_PARTITION);
      const cookies = await ses.cookies.get({});

      // On chiffre les cookies pour la sécurité
      const encryptedCookies = encryptData(JSON.stringify(cookies));

      const newSession: VisperSavedSession = {
        puuid: authData.puuid,
        gameName: authData.gameName || "",
        tagLine: authData.tagLine || "",
        region: authData.region || "eu",
        accountLevel: authData.accountLevel || 0,
        competitiveTier: authData.competitiveTier || 0,
        playerCardId: authData.playerCardId || "",
        cookies: encryptedCookies,
        timestamp: Date.now(),
      };

      // Mise à jour ou ajout
      const index = sessions.findIndex((s) => s.puuid === authData.puuid);
      if (index !== -1) {
        sessions[index] = newSession;
      } else {
        sessions.push(newSession);
      }

      await fs.writeJson(this.getSessionsFile(), sessions, { spaces: 2 });
      devLog("[SessionManager] Session saved for:", authData.gameName);
      return newSession;
    } catch (e) {
      devError("[SessionManager] Failed to save session:", e);
      throw e;
    }
  }

  static async restoreSession(puuid: string): Promise<boolean> {
    try {
      const sessions = await this.getSessions();
      const target = sessions.find((s) => s.puuid === puuid);

      if (!target) {
        devError("[SessionManager] Session not found for PUUID:", puuid);
        return false;
      }

      const ses = session.fromPartition(VISPER_PARTITION);

      // Nettoyer les cookies actuels
      await ses.clearStorageData({ storages: ["cookies"] });

      // Décrypter et restaurer
      let cookies: Electron.Cookie[] = [];
      try {
        const decrypted = decryptData(target.cookies);
        if (decrypted) cookies = JSON.parse(decrypted);
      } catch (err) {
        devError("[SessionManager] Cookie decryption failed", err);
        return false;
      }

      if (!cookies || cookies.length === 0) return false;

      devLog(
        `[SessionManager] Restoring ${cookies.length} cookies for ${target.gameName}...`,
      );

      for (const cookie of cookies) {
        const scheme = cookie.secure ? "https" : "http";
        const url = `${scheme}://${cookie.domain?.startsWith(".") ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;

        await ses.cookies.set({
          url: url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
        });
      }

      devLog("[SessionManager] Session restored successfully.");
      return true;
    } catch (e) {
      devError("[SessionManager] Failed to restore session:", e);
      return false;
    }
  }

  static async removeSession(puuid: string): Promise<void> {
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.puuid !== puuid);
    await fs.writeJson(this.getSessionsFile(), filtered, { spaces: 2 });
  }
}
