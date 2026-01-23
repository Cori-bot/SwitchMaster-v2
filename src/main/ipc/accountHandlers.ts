import { BrowserWindow } from "electron";
import { Account } from "../../shared/types";
import { accountSchema } from "../../shared/validation";
import { safeHandle } from "./utils";
import { AccountService } from "../services/AccountService";

export function registerAccountHandlers(
  getMainWindow: () => BrowserWindow | null,
  accountService: AccountService,
) {
  const notifyUpdate = async () => {
    const accounts = await accountService.getAccounts();
    const mainWin = getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("accounts-updated", accounts);
    } else {
      const wins = BrowserWindow.getAllWindows();
      wins.forEach((win) => win.webContents.send("accounts-updated", accounts));
    }

    if ((global as any).refreshTray) {
      (global as any).refreshTray();
    }
  };

  safeHandle("get-accounts", async () => await accountService.getAccounts());

  safeHandle(
    "get-account-credentials",
    async (_e, id) => await accountService.getCredentials(id as string),
  );

  safeHandle("add-account", async (_e, data) => {
    const validatedData = accountSchema.parse(data);
    const acc = await accountService.addAccount(
      validatedData as Partial<Account>,
    );
    await notifyUpdate();
    return acc;
  });

  safeHandle("update-account", async (_e, data) => {
    const validatedData = accountSchema.parse(data);
    const acc = await accountService.updateAccount(validatedData as Account);
    await notifyUpdate();
    return acc;
  });

  safeHandle("delete-account", async (_e, id) => {
    const res = await accountService.deleteAccount(id as string);
    await notifyUpdate();
    return res;
  });

  safeHandle("reorder-accounts", async (_e, idsRaw) => {
    const ids = idsRaw as string[];
    const res = await accountService.reorderAccounts(ids);
    await notifyUpdate();
    return res;
  });

  safeHandle("fetch-account-stats", async (_e, idRaw) => {
    const id = idRaw as string;
    const stats = await accountService.fetchAndSaveStats(id);
    await notifyUpdate();
    return stats;
  });
}
