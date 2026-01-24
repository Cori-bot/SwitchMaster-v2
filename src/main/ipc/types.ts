export interface IpcContext {
  launchGame: (data: {
    launcherType: string;
    gameId: string;
    credentials?: any;
  }) => Promise<void>;
  setAutoStart: (enable: boolean) => void;
  getAutoStartStatus: () => { enabled: boolean; wasOpenedAtLogin: boolean };
  getStatus: () => Promise<{
    status: string;
    accountId?: string;
    accountName?: string;
  }>;
  isValorantRunning: () => Promise<boolean>;
}
