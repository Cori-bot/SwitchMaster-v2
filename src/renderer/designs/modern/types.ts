// Types locaux pour le design Modern
import { Account } from "../../../../shared/types";

export interface Wallpaper {
    id: string;
    image: string;
    title: string;
    category: string;
    details: string;
    game?: string;
    rank?: string;
    account?: Account; // Reference to original account
}

export type PageName = 'Accounts' | 'Games' | 'Settings';
