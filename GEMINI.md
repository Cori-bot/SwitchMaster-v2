# Contexte du Projet SwitchMaster-v2

Ce fichier sert de référence absolue pour toute interaction avec ce projet.

## 🚨 DIRECTIVES PRIMORDIALES (À RESPECTER IMPÉRATIVEMENT)

1.  **Langue :** TOUTES les interactions, explications, commentaires de code et commits doivent être en **FRANÇAIS**.
2.  **Gestionnaire de Paquets :** Utiliser EXCLUSIVEMENT **`pnpm`**. Ne jamais utiliser `npm` ou `yarn`.
3.  **Documentation Continue (`update.md`) :**
    *   À la fin de chaque tâche significative, ajouter une entrée dans le fichier `update.md` à la racine.
    *   Format : Date, Actions réalisées, Changements techniques.
    *   *Ne jamais supprimer l'historique existant.*
4.  **Taille des Fichiers :** Maintenir les fichiers sous **250 lignes**. Si un fichier dépasse cette limite, proposer et effectuer un refactoring (découpage).
5.  **Commentaires :** Utiliser `//` pour les commentaires. Commenter le "pourquoi" et non le "quoi".
6.  **Système Cible :** Windows 11 (win32). Les chemins et scripts doivent être compatibles Windows.
7.  **Vérification Prélable :** Avant toute réponse ou action, consulter `update.md` et le dernier commit pour comprendre l'état actuel.

## 📝 Présentation du Projet
**SwitchMaster** (v2.5.1) est une application desktop Electron permettant la gestion et le basculement rapide (Fast Switch) entre plusieurs comptes Riot Games (Valorant & League of Legends).

## 🛠 Stack Technique
*   **Core :** Electron 39.2.7
*   **Frontend :** React 19.2 + Vite 7.3 + TypeScript 5.9
*   **UI/UX :** Tailwind CSS 4.1 + Framer Motion 12 + Lucide React
*   **Build :** electron-builder 26.0
*   **Test :** Vitest 4.0
*   **Outils Clés :**
    *   `electron-store` / `fs-extra` : Persistance des données.
    *   `puppeteer` / `axios` (ou modules internes) : Gestion de l'authentification Riot.

## 🏗 Architecture du Code

### `src/main/` (Processus Principal)
*   **Point d'entrée :** `main.ts`
*   **`ipc/`** : Gestionnaires IPC (Communication Renderer <-> Main). Fichiers séparés par domaine (`riotHandlers`, `accountHandlers`, etc.).
*   **`valorant-api/`** : Logique d'authentification Riot (RSO, Cookies) et appels API.
*   **`appLogic.ts`** : Surveillance des processus (LeagueClient.exe, VALORANT.exe) et logique de lancement.
*   **`config.ts`** : Gestion de la configuration utilisateur chiffrée.

### `src/renderer/` (Interface Utilisateur)
*   **`App.tsx`** : Racine de l'application React.
*   **`components/`** : Composants UI modulaires.
*   **`hooks/`** : Custom hooks pour la logique métier (`useAccounts`, `useVisperAuth`).
*   **`assets/`** : Images et ressources statiques.

### `scripts/`
*   Scripts PowerShell (`.ps1`) pour l'automatisation (login, détection) et scripts Node de build.

## 🚀 Commandes de Développement

| Commande | Action |
| :--- | :--- |
| **`pnpm dev`** | Lance l'application en mode développement (Vite + Electron). |
| **`pnpm build`** | Compile le projet pour la production (crée l'installateur dans `dist/`). |
| **`pnpm test`** | Exécute la suite de tests unitaires avec Vitest. |
| **`pnpm up-dep`** | Met à jour toutes les dépendances via pnpm. |

## 🔄 Flux Critiques
1.  **Authentification Riot :** Utilise un flux complexe (RSO) pour obtenir des tokens. Ne pas modifier sans une compréhension totale du mécanisme de cookies/headers.
2.  **Lancement de Jeu :** SwitchMaster ferme les clients Riot existants, change les fichiers de config/lockfile si nécessaire, et relance le jeu avec les nouveaux identifiants.

## 📂 Structure des Dossiers Importants
*   `D:\code\switchmaster-v2\` : Racine du projet.
*   `src/shared/types.ts` : Types TypeScript partagés entre Main et Renderer (à maintenir synchronisés).
