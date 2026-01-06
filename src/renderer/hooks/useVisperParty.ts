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

    // Si on est en erreur, on affiche l'état de polling
    if (error) {
      setIsPolling(true);
      await new Promise((r) => setTimeout(r, 3500)); // Augmenté à 3.5s pour durer ~4s avec l'IPC
    }

    try {
      const data = await (window as any).ipc.invoke(
        "visper-get-party",
        session,
      );
      if (data) {
        setParty(data);
        setError(null);
        setInitialLoading(false);
        setRetryCountdown(0); // Reset countdown on success
      } else {
        setParty(null);
        setError("SESSION_NOT_FOUND");
        if (!error) setRetryCountdown(10); // Start countdown if new error
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
  }, [session, error]);

  const fetchFriends = useCallback(async () => {
    if (!session) return;
    try {
      const data = await (window as any).ipc.invoke(
        "visper-get-friends",
        session,
      );
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

  // Gestion du compte à rebours
  useEffect(() => {
    if (error === "SESSION_NOT_FOUND" && !isPolling) {
      setRetryCountdown(10); // Reset à 10s au début de l'attente
      countdownIntervalRef.current = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            // À la fin du compte à rebours, on déclenche un fetch
            fetchParty();
            return 10; // Reset pour le prochain cycle (sera écrasé si fetch réussit)
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
    };
  }, [error, isPolling, fetchParty]); // Dépendance à isPolling pour pauser le countdown pendant le fetch

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

  // Actions
  const setReady = async (isReady: boolean) => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-set-ready",
        session,
        party.partyId,
        isReady,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const changeQueue = async (queueId: string) => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-change-queue",
        session,
        party.partyId,
        queueId,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const setPreferredPods = async (podIds: string[]) => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-set-preferred-pods",
        session,
        party.partyId,
        podIds,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async (isOpen: boolean) => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-toggle-open",
        session,
        party.partyId,
        isOpen,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const startMatchmaking = async () => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-start-matchmaking",
        session,
        party.partyId,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const stopMatchmaking = async () => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-stop-matchmaking",
        session,
        party.partyId,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const leaveParty = async () => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-leave-party",
        session,
        party.partyId,
      );
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
      await (window as any).ipc.invoke(
        "visper-generate-code",
        session,
        party.partyId,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const removeCode = async () => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-remove-code",
        session,
        party.partyId,
      );
      await fetchParty();
    } finally {
      setLoading(false);
    }
  };

  const inviteByName = async (name: string, tag: string) => {
    if (!session || !party) return;
    try {
      setLoading(true);
      await (window as any).ipc.invoke(
        "visper-invite-by-name",
        session,
        party.partyId,
        name,
        tag,
      );
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

  return {
    party,
    friends,
    loading,
    initialLoading,
    isPolling,
    retryCountdown, // Exposé pour l'UI
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
    },
  };
};
