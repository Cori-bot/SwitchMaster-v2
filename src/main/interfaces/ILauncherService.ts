export interface ILauncherCredentials {
  username: string;
  password?: string;
  method?: "oauth" | "credentials";
}

export interface ILauncherService {
  /** Unique identifier (e.g., 'riot', 'steam') */
  readonly id: string;

  /** Launches the launcher client (without necessarily launching the game) */
  launchClient(): Promise<void>;

  /** Launches a specific game managed by this launcher */
  launchGame(gameId: string): Promise<void>;

  /** Performs authentication (if supported) */
  login(credentials: ILauncherCredentials): Promise<void>;

  /** Kills all processes associated with this launcher */
  killAll(): Promise<void>;

  /** Detects if the launcher is installed on the machine */
  detectInstallation(): Promise<string | null>;

  /** Checks if the client is currently running */
  isRunning(): Promise<boolean>;
}
