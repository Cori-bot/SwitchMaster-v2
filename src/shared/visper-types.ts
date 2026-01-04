export interface PartyMember {
    Subject: string; // PUUID
    CompetitiveTier: number;
    PlayerIdentity: {
        Subject: string;
        PlayerCardID: string;
        PlayerTitleID: string;
        AccountLevel: number;
        PreferredLevelBorderID: string;
        Incognito: boolean;
        HideAccountLevel: boolean;
    };
    IsReady: boolean;
    Pings: { Ping: number; GamePodID: string }[];
}

export interface PartyData {
    ID: string;
    MUCName: string;
    VoiceRoomID: string;
    Version: number;
    ClientVersion: string;
    Members: PartyMember[];
    State: "DEFAULT" | "MATCHMAKING" | "MATCHMADE_GAME_STARTING" | "CUSTOM_GAME_SETUP";
    PreviousState: string;
    StateTransitionReason: string;
    Accessibility: "OPEN" | "CLOSED";
    CustomGameData: any;
    InviteCode?: string; // Code de groupe (si généré)
    MatchmakingData: {
        QueueID: string;
        PreferredPodIDs: string[];
        SkillDisparityRRPenalty: number;
    };
}

export interface PartyState {
    partyId: string;
    members: {
        puuid: string;
        name: string;
        tag: string;
        cardId: string;
        level: number;
        rank: number;
        isReady: boolean;
        isLeader: boolean;
        pings: Record<string, number>; // Map PodID -> Latency
    }[];
    state: string;
    queueId: string;
    accessibility: "OPEN" | "CLOSED";
    inviteCode?: string;
    preferredPods: string[];
}

export interface Friend {
    puuid: string;
    gameName: string;
    tagLine: string;
    status: "chat" | "dnd" | "away" | "offline" | "mobile";
    otherGame?: boolean; // Si sur LoL ou autre
    note?: string;
}

export const QUEUES = [
    { id: "unrated", label: "Non Classé" },
    { id: "competitive", label: "Compétitif" },
    { id: "swiftplay", label: "Vélocité" },
    { id: "spikerush", label: "Spike Rush" },
    { id: "deathmatch", label: "Combat à mort" },
    { id: "hurm", label: "Team Deathmatch" }, // TDM
    { id: "ggteam", label: "Escalade" },
    { id: "premier", label: "Premier" },
    { id: "snowball", label: "Bataille de Boules de Neige" }
];

export const GAME_PODS: Record<string, string> = {
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-paris-1": "Paris",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-frankfurt-1": "Frankfurt",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-london-1": "London",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-madrid-1": "Madrid",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-warsaw-1": "Warsaw",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-stockholm-1": "Stockholm",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-istanbul-1": "Istanbul",
    "aresriot.aws-rclusterprod-euw1-1.eu-gp-bahrain-1": "Bahrain"
};