import { useState, useEffect, useCallback, useRef } from "react";
import { VisperAuthSession } from "./useVisperAuth";
import { PartyState, Friend } from "../../shared/visper-types";

export const useVisperParty = (session: VisperAuthSession | null) => {
    const [party, setParty] = useState<PartyState | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isPolling, setIsPolling] = useState(false);
    const [retryCountdown, setRetryCountdown] = useState(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const friendsIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchParty = useCallback(async () => {
        if (!session) return;

        // Si on est en erreur, on affiche l'état de polling visuel
        if (error) {
            setIsPolling(true);
            await new Promise(r => setTimeout(r, 3500));
        }

        try {
            const data = await (window as any).ipc.invoke("visper-get-party", session);
            if (data) {
                // Si c'est la première fois qu'on charge la party, on lance un refresh pings
                if (!party && data.partyId) {
                    (window as any).ipc.invoke("visper-refresh-pings", session, data.partyId).catch(() => { });
                }

                // On met à jour l'état même si on pense qu'il est identique, pour capter les changements subtils (leader, ready)
                setParty(prev => {
                    // Petite optimisation : si JSON stringify est identique, on ne trigger pas de re-render inutile
                    // Mais ici, on veut être sûr d'avoir la dernière version
                    return data;
                });
                setError(null);
                setInitialLoading(false);
                setRetryCountdown(0);
            } else {
                setParty(null);
                setError("SESSION_NOT_FOUND");
                if (!error) setRetryCountdown(10);
            }
        } catch (err: any) {
            const errorMessage = err?.message || String(err);
            if (errorMessage.includes("404") || errorMessage.includes("Status 404")) {
                console.log("[VisperParty] En attente du jeu (404 Not Found)...");
            } else {
                console.error("Failed to fetch party:", err);
            }
            setParty(null);
            setError("SESSION_NOT_FOUND");
            if (!error) setRetryCountdown(10);
        } finally {
            setIsPolling(false);
        }
    }, [session, error]); // Dépendance à error pour le retry

    const fetchFriends = useCallback(async () => {
        if (!session) return;
        try {
            const data = await (window as any).ipc.invoke("visper-get-friends", session);
            setFriends(data || []);
        } catch (err) {
            // Silencieux
        }
    }, [session]);

    // Timer initial de 5s
    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Gestion du compte à rebours (uniquement si erreur)
    useEffect(() => {
        if (error === "SESSION_NOT_FOUND" && !isPolling) {
            setRetryCountdown(10);
            countdownIntervalRef.current = setInterval(() => {
                setRetryCountdown(prev => {
                    if (prev <= 1) {
                        fetchParty();
                        return 10;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }

        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [error, isPolling, fetchParty]);

    // Initial fetch only
    useEffect(() => {
        if (session) {
            fetchParty();
        }
    }, [session]);

    // Polling Friends (30s)
    useEffect(() => {
        if (session) {
            fetchFriends();
            friendsIntervalRef.current = setInterval(fetchFriends, 30000);
        } else {
            setFriends([]);
            if (friendsIntervalRef.current) clearInterval(friendsIntervalRef.current);
        }
        return () => {
            if (friendsIntervalRef.current) clearInterval(friendsIntervalRef.current);
        };
    }, [session, fetchFriends]);

    // Polling Party SYSTÉMATIQUE (5s) si pas d'erreur
    // C'est ici que ça manquait peut-être de robustesse si le composant re-rendait
    useEffect(() => {
        if (session && !error) {
            intervalRef.current = setInterval(fetchParty, 5000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [session, error, fetchParty]);


    // Actions (inchangées)
    const setReady = async (isReady: boolean) => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-set-ready", session, party.partyId, isReady);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const changeQueue = async (queueId: string) => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-change-queue", session, party.partyId, queueId);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const setPreferredPods = async (podIds: string[]) => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-set-preferred-pods", session, party.partyId, podIds);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const toggleOpen = async (isOpen: boolean) => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-toggle-open", session, party.partyId, isOpen);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const startMatchmaking = async () => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-start-matchmaking", session, party.partyId);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const stopMatchmaking = async () => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-stop-matchmaking", session, party.partyId);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const leaveParty = async () => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-leave-party", session, party.partyId);
            setParty(null);
            setTimeout(fetchParty, 1000);
        } finally {
            setLoading(false);
        }
    };

    const generateCode = async () => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-generate-code", session, party.partyId);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const removeCode = async () => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-remove-code", session, party.partyId);
            await fetchParty();
        } finally {
            setLoading(false);
        }
    };

    const inviteByName = async (name: string, tag: string) => {
        if (!session || !party) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-invite-by-name", session, party.partyId, name, tag);
        } finally {
            setLoading(false);
        }
    };

    const joinByCode = async (code: string) => {
        if (!session) return;
        try {
            setLoading(true);
            await (window as any).ipc.invoke("visper-join-code", session, code);
            setTimeout(fetchParty, 1000);
        } finally {
            setLoading(false);
        }
    };

    const refreshPings = async () => {
        if (!session || !party) return;
        try {
            await (window as any).ipc.invoke("visper-refresh-pings", session, party.partyId);
            // Pas besoin de fetchParty immédiat, le prochain tick le prendra, ou le client mettra qques secondes
        } catch (e) {
            console.error(e);
        }
    };

    return {
        party,
        friends,
        loading,
        initialLoading,
        isPolling,
        retryCountdown,
        error,
        refresh: fetchParty,
        refreshFriends: fetchFriends,
        actions: {
            setReady,
            changeQueue,
            setPreferredPods,
            toggleOpen,
            startMatchmaking,
            stopMatchmaking,
            leaveParty,
            generateCode,
            removeCode,
            inviteByName,
            joinByCode,
            refreshPings
        }
    };
};
