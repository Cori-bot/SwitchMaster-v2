import { describe, it, expect } from "vitest";
import { accountSchema } from "../shared/validation";

describe("Validation des Comptes (Zod)", () => {
  it("doit valider un compte correct", () => {
    const validAccount = {
      name: "Mon Compte",
      gameType: "valorant",
      riotId: "Player#EUW",
      username: "user123",
      password: "password123",
    };
    const result = accountSchema.safeParse(validAccount);
    expect(result.success).toBe(true);
  });

  it("doit rejeter un type de jeu invalide", () => {
    const invalidAccount = {
      name: "Mon Compte",
      gameType: "fortnite", // Invalide
      riotId: "Player#EUW",
    };
    const result = accountSchema.safeParse(invalidAccount);
    expect(result.success).toBe(false);
  });

  it("doit rejeter un Riot ID sans tag (ex: Player#)", () => {
    const invalidAccount = {
      name: "Mon Compte",
      gameType: "valorant",
      riotId: "Player#",
    };
    const result = accountSchema.safeParse(invalidAccount);
    expect(result.success).toBe(false);
  });

  it("doit rejeter un Riot ID avec tag invalide (ex: Player#Ta-g)", () => {
    const invalidAccount = {
      name: "Mon Compte",
      gameType: "valorant",
      riotId: "Player#Ta-g", // Caractère spécial interdit dans le tag
    };
    const result = accountSchema.safeParse(invalidAccount);
    expect(result.success).toBe(false);
  });

  it("doit rejeter un Riot ID avec un tag trop long (ex: Player#123456)", () => {
    const invalidAccount = {
      name: "Mon Compte",
      gameType: "valorant",
      riotId: "Player#123456", // 6 caractères, invalide
    };
    const result = accountSchema.safeParse(invalidAccount);
    expect(result.success).toBe(false);
  });

  it("doit valider un Riot ID correct (Pseudo#TAG)", () => {
     const validAccount = {
      name: "Mon Compte",
      gameType: "valorant",
      riotId: "Coridor#EUW",
      username: "user",
      password: "pwd"
    };
    const result = accountSchema.safeParse(validAccount);
    expect(result.success).toBe(true);
  });

  it("doit rejeter un nom vide", () => {
    const invalidAccount = {
      name: "",
      gameType: "league",
      riotId: "Player#EUW",
    };
    const result = accountSchema.safeParse(invalidAccount);
    expect(result.success).toBe(false);
  });
});
