import { z } from "zod";

// Regex pour Riot ID : Pseudo#TAG
// Pseudo: 1+ chars
// Tag: 1 à 5 caractères alphanumériques (Limite officielle Riot)
const RIOT_ID_REGEX = /^.+#[a-zA-Z0-9]{1,5}$/;

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Le nom est requis"),
  gameType: z.enum(["league", "valorant"]),
  riotId: z.string().regex(RIOT_ID_REGEX, {
    message: "Format Riot ID invalide (attendu: Pseudo#TAG, ex: Player#EUW)",
  }),
  username: z.string().min(1, "Le nom d'utilisateur est requis").optional(),
  password: z.string().min(1, "Le mot de passe est requis").optional(),
  cardImage: z.string().optional(),
  isFavorite: z.boolean().optional(),
  lastUsed: z.string().optional(),
  timestamp: z.number().optional(),
});

export type ValidatedAccount = z.infer<typeof accountSchema>;
