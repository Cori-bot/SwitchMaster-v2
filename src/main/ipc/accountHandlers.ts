import { BrowserWindow } from "electron";
import {
  loadAccountsMeta,
  getAccountCredentials,
  addAccount,
  updateAccount,
  deleteAccount,
  saveAccountsMeta,
} from "../accounts";
import { fetchAccountStats } from "../statsService";
import { Account } from "../../shared/types";
import { safeHandle } from "./utils";

export function registerAccountHandlers() {
  safeHandle("get-accounts", async () => await loadAccountsMeta());
  safeHandle(
    "get-account-credentials",
    async (_e, id) => await getAccountCredentials(id as string),
  );
  safeHandle(
    "add-account",
    async (_e, data) => await addAccount(data as Partial<Account>),
  );
  safeHandle(
    "update-account",
    async (_e, data) => await updateAccount(data as Account),
  );
  safeHandle(
    "delete-account",
    async (_e, id) => await deleteAccount(id as string),
  );

  safeHandle("reorder-accounts", async (_e, idsRaw) => {
    const ids = idsRaw as string[];
    const accounts = await loadAccountsMeta();
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const reordered = ids
      .map((id) => accountMap.get(id))
      .filter((a): a is Account => !!a);
    accounts.forEach((a) => {
      if (!ids.includes(a.id)) reordered.push(a);
    });
    await saveAccountsMeta(reordered);

    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win) => win.webContents.send("accounts-updated", reordered));

    return true;
  });

  safeHandle("fetch-account-stats", async (_e, idRaw) => {
    const id = idRaw as string;
    const accounts = await loadAccountsMeta();
    const acc = accounts.find((a) => a.id === id);
    if (!acc || !acc.riotId)
      throw new Error("Invalid account or missing Riot ID");
    const stats = await fetchAccountStats(acc.riotId, acc.gameType);
    acc.stats = stats;
    await saveAccountsMeta(accounts);

    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win) => win.webContents.send("accounts-updated", accounts));

    return stats;
  });
}
