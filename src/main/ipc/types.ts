import { ILauncherCredentials } from "../interfaces/ILauncherService";

export interface LaunchGameData {
  launcherType: string;
  gameId: string;
  accountId?: string;
  credentials?: ILauncherCredentials;
  autoLaunch?: boolean;
}

export interface IpcContext {
  launchGame: (data: LaunchGameData) => Promise<void>;
  setAutoStart: (enable: boolean) => void;
  getAutoStartStatus: () => { enabled: boolean; wasOpenedAtLogin: boolean };
  getStatus: () => Promise<{
    status: string;
    accountId?: string;
    accountName?: string;
  }>;
  isValorantRunning: () => Promise<boolean>;
}
