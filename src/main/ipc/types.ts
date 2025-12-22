export interface IpcContext {
  launchGame: (gameId: "league" | "valorant") => Promise<void>;
  setAutoStart: (enable: boolean) => void;
  getAutoStartStatus: () => { enabled: boolean; wasOpenedAtLogin: boolean };
  getStatus: () => Promise<{
    status: string;
    accountId?: string;
    accountName?: string;
  }>;
}
