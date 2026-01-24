import { Account, Config, AppStatus } from "../../shared/types";

export interface AccountActions {
    login: (account: Account, autoLaunch?: boolean) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    updateAccount: (account: Account) => Promise<void>;
    reorderAccounts: (ids: string[]) => Promise<void>;
    toggleFavorite: (account: Account) => Promise<void>;
    addAccount: (data: Partial<Account>) => Promise<void>;
}

export interface DesignProps {
    accounts: Account[];
    activeAccountId: string | null;
    config: Config;
    status: AppStatus;
    actions: AccountActions;

    // Core Navigation/Action
    onSwitchSession: (id: string, autoLaunch?: boolean) => Promise<void>;
    onOpenSettings: () => void;

    // System Metadata
    updateInfo?: any;

    // System Modals
    systemActions: {
        openSecurityModal: (mode: "set" | "disable") => void;
        openGpuModal: (target: boolean) => void;
        checkUpdates: () => void;
        selectRiotPath: () => void;
        updateConfig: (config: Partial<Config>) => Promise<void>;
    };
}
