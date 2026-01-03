import { useState, useEffect, useRef } from "react";

export interface VisperAuthSession {
    accessToken: string;
    entitlementsToken: string;
    puuid: string;
    gameName?: string;
    tagLine?: string;
    accountLevel?: number;
    competitiveTier?: number;
    playerCardId?: string;
    region?: string;
}

export interface VisperSavedSessionItem {
    puuid: string;
    gameName: string;
    tagLine: string;
    region: string;
    accountLevel: number;
    competitiveTier: number;
    playerCardId: string;
    timestamp: number;
}

export const useVisperAuth = () => {
    const [session, setSession] = useState<VisperAuthSession | null>(null);
    const [sessions, setSessions] = useState<VisperSavedSessionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    const fetchSessions = async () => {
        try {
            const saved = await (window as any).ipc.invoke("get-visper-sessions");
            setSessions(saved || []);
        } catch (err) {
            console.error("Failed to fetch sessions:", err);
        }
    };

    const login = async (silent: boolean = false, forceNew: boolean = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await (window as any).ipc.invoke("start-visper-login", silent, forceNew);
            if (res) {
                setSession(res);
                fetchSessions(); // Rafraîchir la liste après login réussi
            }
        } catch (err) {
            console.error("Login failed:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const switchSession = async (puuid: string) => {
        setLoading(true);
        try {
            const res = await (window as any).ipc.invoke("switch-visper-session", puuid);
            if (res) {
                setSession(res);
            }
        } catch (err) {
            console.error("Switch session failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const removeSession = async (puuid: string) => {
        try {
            await (window as any).ipc.invoke("remove-visper-session", puuid);
            fetchSessions();
            if (session?.puuid === puuid) {
                setSession(null);
            }
        } catch (err) {
            console.error("Remove session failed:", err);
        }
    };

    const logout = () => {
        setSession(null);
    };

    const hasAttemptedRef = useRef(false);

    // Auto-login au montage
    useEffect(() => {
        const autoLogin = async () => {
            fetchSessions(); // Charger les sessions connues

            if (hasAttemptedRef.current) return;
            hasAttemptedRef.current = true;

            await login(true);
            setChecking(false);
        };
        autoLogin();
    }, []);

    return { session, sessions, loading, checking, login, logout, switchSession, removeSession };
};
