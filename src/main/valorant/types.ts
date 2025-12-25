import { ValorantGameState, ValorantStateUpdate, VALORANT_AGENTS } from "../../shared/valorant";

export type { ValorantGameState, ValorantStateUpdate };
export { VALORANT_AGENTS };

export interface LockfileData {
    port: string;
    password: string;
    protocol: string;
}
