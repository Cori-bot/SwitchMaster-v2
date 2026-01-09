# API Contracts (IPC)

This document details the Inter-Process Communication (IPC) channels between the Renderer (UI) and Main (Backend) processes.

## 1. Authentication (Visper)

| Channel | Params | Return | Description |
| :--- | :--- | :--- | :--- |
| `start-visper-login` | `silent: boolean`, `forceNew: boolean` | `VisperAuthSession` | Starts the RSO login flow (webview). |
| `get-visper-sessions` | `none` | `VisperAuthSession[]` | Returns all saved sessions. |
| `switch-visper-session` | `puuid: string` | `VisperAuthSession` | Activates a cached session. |
| `remove-visper-session` | `puuid: string` | `boolean` | Deletes a session. |

## 2. Party Management (Visper)

| Channel | Params | Return | Description |
| :--- | :--- | :--- | :--- |
| `visper-get-party` | `session` | `PartyData` | Gets current party state. |
| `visper-set-ready` | `session`, `partyId`, `isReady` | `boolean` | Toggles ready status. |
| `visper-change-queue` | `session`, `partyId`, `queueId` | `boolean` | Changes game mode (e.g. competitive). |
| `visper-start-matchmaking`| `session`, `partyId` | `boolean` | Enters queue. |
| `visper-leave-party` | `session`, `partyId` | `boolean` | Leaves current party. |

## 3. Account Switcher (Core)

| Channel | Params | Return | Description |
| :--- | :--- | :--- | :--- |
| `switch-account` | `id: string` | `{success, id}` | Kills Riot, swaps config, relaunches. |
| `select-riot-path` | `none` | `path: string` | Opens file dialog for Riot Client. |
| `launch-game` | `gameId: 'league' / 'valorant'` | `boolean` | Launches specific game. |

## 4. Agent Selection (New)

| Channel | Params | Return | Description |
| :--- | :--- | :--- | :--- |
| `visper-get-pregame-match` | `session` | `MatchID` | Gets current pregame ID. |
| `visper-select-agent` | `session`, `matchId`, `agentId` | `boolean` | Hovers/Selects an agent. |
| `visper-lock-agent` | `session`, `matchId`, `agentId` | `boolean` | Locks in the selected agent. |
