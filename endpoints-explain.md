# Glossaire Technique des Endpoints Valorant

Ce fichier détaille le fonctionnement, les pré-requis et les dépendances de chaque endpoint listé dans `endpoints.md`.

> **Note Globale sur les Headers :**
> Sauf mention contraire (Local Client), tous les endpoints distants (`pd`, `glz`, `shared`) nécessitent :
> 1. `Authorization: Bearer <access_token>` (Obtenu via **Auth Request**)
> 2. `X-Riot-Entitlements-JWT: <entitlements_token>` (Obtenu via **Entitlement Token**)
> 3. `X-Riot-ClientVersion: <version>` (Souvent requis pour GLZ/Party)

---

## 🔐 Authentification (Le point de départ)

*Ces endpoints doivent être appelés dans l'ordre pour initialiser une session.*

- **Auth Cookies** (`POST`)
  - **Fonction :** Prépare le "Cookie Jar" pour accepter la connexion.
  - **Requis :** Rien (Premier appel).
  - **Sortie :** Cookies de session (`asid`, `did`, etc.).

- **Auth Request** (`PUT`)
  - **Fonction :** Envoie les identifiants (Login/Pass) pour se connecter.
  - **Requis :** Avoir fait **Auth Cookies** avant.
  - **Sortie :** `access_token` et `id_token` (si pas de 2FA).

- **Auth MFA** (`PUT`)
  - **Fonction :** Valide le code Email/SMS si le compte est protégé.
  - **Requis :** **Auth Request** doit avoir retourné `type: "multifactor"`.
  - **Sortie :** `access_token` final.

- **Cookie Reauth** (`GET`)
  - **Fonction :** Tente de récupérer un nouveau token sans identifiants si le cookie "Remember Me" est présent.
  - **Requis :** Cookies persistants valides.

- **Entitlement Token** (`POST`)
  - **Fonction :** Échange l'Access Token contre un Entitlement Token (droit d'accès au jeu).
  - **Requis :** `Authorization: Bearer <access_token>`.
  - **Sortie :** `entitlements_token` (Header obligatoire pour tout le reste).

- **Player Info (UserInfo)** (`GET`)
  - **Fonction :** Récupère le `sub` (PUUID), crucial pour toutes les requêtes suivantes.
  - **Requis :** `access_token`.
  - **Sortie :** `sub` (PUUID), `acct` (GameName#Tag).

- **PAS Token** (`GET`)
  - **Fonction :** Token pour se connecter au chat XMPP.
  - **Requis :** `access_token` + `entitlements_token`.

---

## ⚔️ PVP (Données Persistantes)
*URL Base : `pd.{shard}.a.pvp.net` (ex: `pd.eu...`)*

- **Fetch Content**
  - **Besoin :** Savoir quels IDs de saison/actes sont actifs pour filtrer les stats.

- **Account XP**
  - **Requis :** `puuid`.
  - **Fonction :** Affiche la barre d'XP et le niveau.

- **Player Loadout / Set Player Loadout**
  - **Requis :** `puuid`. Pour `Set`, nécessite les UUIDs valides des skins/chromas (obtenus via l'API publique `valorant-api.com`).
  - **Fonction :** Lit ou écrase l'équipement complet.

- **Player MMR**
  - **Requis :** `puuid` + Header `X-Riot-ClientPlatform`.
  - **Fonction :** Seul moyen d'avoir le vrai rang (TierID) et la RR (Ranked Rating).

- **Match History**
  - **Requis :** `puuid`.
  - **Fonction :** Liste les IDs de matchs.
  - **Dépendance :** Sert à obtenir les `matchId` pour appeler **Match Details**.

- **Match Details**
  - **Requis :** `matchId` (venant de Match History).
  - **Fonction :** Scoreboard complet de fin de partie.

- **Name Service** (`PUT`)
  - **Requis :** Liste de `puuid`s dans le body `["id1", "id2"]`.
  - **Fonction :** Indispensable pour afficher les noms des joueurs dans l'historique ou le lobby, car les autres endpoints ne renvoient souvent que les PUUIDs.

---

## 🛒 Boutique (Store)

- **Storefront**
  - **Requis :** `puuid`.
  - **Fonction :** Donne les UUIDs des skins en vente. Nécessite une API externe pour avoir les images correspondantes.

- **Wallet**
  - **Requis :** `puuid`.
  - **Fonction :** Vérifier si l'utilisateur a assez de VP pour acheter.

- **Owned Items**
  - **Requis :** `puuid` + `ItemTypeID` (ex: UUID des agents ou des skins).
  - **Fonction :** Vérifie si un item est déjà possédé avant achat/équipement.

---

## 🎉 Party (Groupe & Lobby)
*URL Base : `glz-{region}-1.{shard}.a.pvp.net` (ex: `glz-eu-1...`)*
*Ces endpoints sont très sensibles à la région.*

- **Party Player**
  - **Fonction :** Point d'entrée. Donne le `CurrentPartyID` du joueur.
  - **Dépendance :** Requis avant d'appeler **Party** (détails).

- **Party** (Details)
  - **Requis :** `partyId` (obtenu via **Party Player**).
  - **Fonction :** Liste les membres, l'état (MATCHMAKING, IDLE) et la configuration du groupe.

- **Enter / Leave Matchmaking Queue**
  - **Requis :** `partyId`. Le joueur doit être le leader du groupe.
  - **Fonction :** Lance ou annule la recherche.

- **Change Queue**
  - **Requis :** `partyId`.
  - **Fonction :** Change le mode (ex: `competitive`, `unrated`, `deathmatch`).

- **Start Custom Game**
  - **Requis :** `partyId`. Le groupe doit être en mode `custom`.

---

## 🎮 Pré-Game (Sélection des Agents)
*Flux critique : Détecter le match -> Sélectionner -> Verrouiller.*

- **Pre-Game Player**
  - **Fonction :** Vérifie si le joueur est entré en sélection.
  - **Sortie :** `MatchID` (Temporaire pour la phase de sélection).
  - **Note :** À poller (vérifier régulièrement) quand le joueur est en recherche.

- **Pre-Game Match**
  - **Requis :** `MatchID` (Pré-Game).
  - **Fonction :** Donne l'état de la sélection (qui a pick quoi, temps restant, map).

- **Pre-Game Select Character**
  - **Requis :** `MatchID` + `CharacterID` (UUID de l'agent).
  - **Fonction :** "Hover" un agent (montre l'intention). Ne verrouille pas.

- **Pre-Game Lock Character**
  - **Requis :** `MatchID` + `CharacterID`. Avoir déjà sélectionné l'agent (parfois optionnel selon l'API, mais recommandé).
  - **Fonction :** "Insta-lock". Irréversible.

- **Pre-Game Quit**
  - **Fonction :** Dodge la partie. Entraîne une pénalité de temps (**Penalties**).

---

## 🕹️ Partie en Cours (Core Game)
*Se déclenche une fois que tous les joueurs ont verrouillé et que le chargement serveur est fini.*

- **Current Game Player**
  - **Fonction :** Vérifie si le joueur est en jeu (et non plus en Pré-Game).
  - **Sortie :** `MatchID` (Définitif pour la partie).

- **Current Game Match**
  - **Requis :** `MatchID` (Core Game).
  - **Fonction :** Donne IP/Port du serveur de jeu pour la connexion (géré par le client, informatif pour nous).

- **Current Game Loadouts**
  - **Fonction :** Permet de voir les skins des autres joueurs de la partie (utile pour les overlays).

---

## 💻 Client Local (Riot Client Services)
*Ne fonctionne que si le jeu/client Riot tourne sur la machine.*
*Auth : Basic `riot:<lockfile_password>` sur `127.0.0.1:<lockfile_port>`*

- **Presence**
  - **Fonction :** Le moyen le plus rapide de savoir ce que fait le joueur (Status: "Menus", "InGame", "ChampSelect") sans poller les APIs distantes.
  - **Format :** Base64 encodé dans un JSON XMPP.

- **Local WebSocket**
  - **Fonction :** Écouteur d'événements passifs.
  - **Usage :** Évite de spammer les requêtes HTTP. Le client notifie quand l'état change (ex: `OnJsonApiEvent_chat_v4_presences`).

- **Sessions**
  - **Fonction :** Vérifie si le processus `Valorant` est lancé ou juste le `Riot Client`.

- **Entitlements (Local)**
  - **Fonction :** Peut récupérer les tokens (Access/Entitlement) directement depuis le client local sans se reloguer, si le jeu tourne déjà. Très utile pour les outils externes.