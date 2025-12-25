import https from "https";
import { LockfileData } from "./types";
import { devLog, devError } from "../logger";

export class ValorantApi {
    private lockfileData: LockfileData | null = null;
    private agent: https.Agent;

    constructor() {
        // Create an agent that ignores self-signed certificate errors (required for local Riot API)
        this.agent = new https.Agent({
            rejectUnauthorized: false,
        });
    }

    public setCredentials(data: LockfileData) {
        this.lockfileData = data;
        devLog("[VALORANT-API] Credentials updated");
    }

    public clearCredentials() {
        this.lockfileData = null;
    }

    public get isReady(): boolean {
        return !!this.lockfileData;
    }

    public async get<T>(endpoint: string): Promise<T | null> {
        return this.request<T>("GET", endpoint);
    }

    public async post<T>(endpoint: string, body: any = {}): Promise<T | null> {
        return this.request<T>("POST", endpoint, body);
    }

    private async request<T>(method: string, endpoint: string, body?: any): Promise<T | null> {
        if (!this.lockfileData) {
            throw new Error("API not ready: Missing credentials");
        }

        const url = `${this.lockfileData.protocol}://127.0.0.1:${this.lockfileData.port}${endpoint}`;
        const headers: any = {
            Authorization: `Basic ${Buffer.from(`riot:${this.lockfileData.password}`).toString("base64")}`,
        };

        if (body && method === "POST") {
            headers["Content-Type"] = "application/json";
        }

        return new Promise((resolve, reject) => {
            const options = {
                method,
                headers,
                agent: this.agent,
            };

            const req = https.request(url, options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            if (!data || data.trim() === "") {
                                resolve({} as T);
                                return;
                            }
                            const json = JSON.parse(data);
                            resolve(json);
                        } catch (e) {
                            devError(`[VALORANT-API] Parse error for ${endpoint}:`, e);
                            reject(e);
                        }
                    } else {
                        if (res.statusCode === 404) {
                            resolve(null);
                            return;
                        }
                        devError(`[VALORANT-API] Error ${res.statusCode} for ${endpoint}`);
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on("error", (err) => {
                devError(`[VALORANT-API] Network error for ${endpoint}:`, err);
                reject(err);
            });

            if (body && method === "POST") {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }
}
