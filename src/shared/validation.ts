import { z } from "zod";

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Le nom est requis"),
  gameType: z.enum(["league", "valorant"]),
  riotId: z.string().refine((val) => val.includes("#"), {
    message: "Riot ID invalide (ex: Pseudo#TAG)",
  }),
  username: z.string().min(1, "Le nom d'utilisateur est requis").optional(),
  password: z.string().min(1, "Le mot de passe est requis").optional(),
  cardImage: z.string().optional(),
  isFavorite: z.boolean().optional(),
  lastUsed: z.string().optional(),
  timestamp: z.number().optional(),
});

export type ValidatedAccount = z.infer<typeof accountSchema>;
