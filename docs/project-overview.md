# Project Overview: SwitchMaster-v2

**SwitchMaster** is a desktop application designed to manage and switch between multiple Riot Games accounts (Valorant & League of Legends) efficiently. Example features include "Fast Switch", auto-login, and the new **Visper** module (Valorant Assistant).

## Executive Summary

SwitchMaster solves the friction of managing multiple Riot accounts by automating the login process using local Riot Client APIs and process management. The project is currently expanding with **Visper**, an integrated assistant providing real-time game data (friends, party status, agent selection) directly within the app.

## Project Structure

The project follows a **Monolith** architecture using **Electron** to bridge the OS-level interactions (Riot Client processes) with a high-performance **React** frontend.

| Category | Technology | Version | Justification |
| :--- | :--- | :--- | :--- |
| **Core** | Electron | 39.2.7 | Desktop runtime for OS integration (process killing, file system). |
| **Frontend** | React | 19.2 | Component-based UI for the account manager and Visper overlay. |
| **Build Tool** | Vite | 7.3 | Extremely fast HMR and build pipeline for Electron/React. |
| **Language** | TypeScript | 5.9 | Type safety across Main and Renderer processes. |
| **Styling** | Tailwind CSS | 4.1 | Utility-first CSS for rapid UI development. |
| **Persistence** | electron-store | (implied) | Local storage for account credentials and settings. |

## Architecture Pattern

-   **Process-Isolated**: Clear separation between `Main` (System/API) and `Renderer` (UI).
-   **IPC-Driven**: All system actions (launch game, switch account, Visper API) are requested via `ipcRenderer.invoke` channels.
-   **Service-Oriented Main Process**: `RiotService` and `VisperSessionManager` handle business logic in the main process, exposing safe endpoints to the UI.

## Key Modules

1.  **Account Switcher**: Core feature. Manages `RiotClientServices.exe`, `lockfile`, and `Private.yaml` to force login.
2.  **Visper (In-Dev)**: Valorant companion. Uses internal Riot APIs (RSO/Cookies) to fetch friend status, party info, and manage agent selection.

## Links

-   [Architecture Documentation](./architecture.md)
-   [Source Tree Analysis](./source-tree-analysis.md)
-   [API Contracts (IPC)](./api-contracts.md)
