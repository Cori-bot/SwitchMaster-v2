import path from "path";
import { AccountService } from "./AccountService";
import { RiotAutomationService } from "./RiotAutomationService";
import { ConfigService } from "./ConfigService";
import { devLog, devError } from "../logger";

export class SessionService {
  constructor(
    private accountService: AccountService,
    private automationService: RiotAutomationService,
    private configService: ConfigService,
  ) {}

  /**
   * Orchestrates the switching of a Riot account
   */
  public async switchAccount(accountId: string): Promise<boolean> {
    try {
      devLog(`SessionService: Starting switch to account ${accountId}`);

      // 1. Get credentials
      const account = await this.accountService.getCredentials(accountId);

      // 2. Kill existing Riot processes
      await this.automationService.killProcesses();

      // 3. Determine Riot Client Path
      const config = this.configService.getConfig();
      let clientPath = config.riotPath;
      if (!clientPath.endsWith(".exe")) {
        clientPath = path.join(clientPath, "RiotClientServices.exe");
      }

      // 4. Launch Riot Client
      await this.automationService.launchClient(clientPath);

      // 5. Perform login automation
      await this.automationService.login(
        account.username || "",
        account.password || "",
      );

      // 6. Update last used account ID in config
      await this.configService.saveConfig({ lastAccountId: accountId });

      devLog(`SessionService: Successfully switched to account ${accountId}`);
      return true;
    } catch (error) {
      devError(`SessionService: Failed to switch account ${accountId}:`, error);
      throw error;
    }
  }
}
