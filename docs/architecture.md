# Architecture Documentation: SwitchMaster-v2

## 1. Executive Summary

SwitchMaster-v2 is a hybrid Electron application. It combines low-level system automation (process management for Riot Client) with a modern React frontend. The architecture is designed to be **modular**, isolating the "Switcher" logic from the new "Visper" assistant logic.

## 2. High-Level Architecture

```mermaid
graph TD
    User[User] --> Frontend[React Frontend (Renderer)]
    Frontend -- IPC (Invoke) --> Main[Electron Main Process]
    
    subgraph "Main Process"
        Main --> IPC_Handlers[IPC Handlers]
        IPC_Handlers --> AccountSwitcher[Account Switcher Logic]
        IPC_Handlers --> VisperService[Visper / Riot Service]
        
        AccountSwitcher -- Spawns/Kills --> RiotProcess[Riot Client Process]
        VisperService -- HTTP/WSS --> RiotAPI[Riot Internal APIs]
        
        VisperService --> SessionMgr[Session Manager]
        SessionMgr --> Store[Electron Store (Persistence)]
    end
    
    subgraph "Renderer Process"
        Frontend --> Router[App Router]
        Router --> Dashboard[Dashboard (Switcher)]
        Router --> VisperUI[Visper Overlay]
        VisperUI --> PartyWidget[Party Widget]
    end
```

## 3. Core Components

### 3.1 Main Process (`src/main/`)
-   **`main.ts`**: Application entry point. Handles window creation and protocol registration.
-   **`automation/`**: Contains logic to find `RiotClientServices.exe`, kill processes, and manage the `lockfile`.
-   **`visper/`**:
    -   `riotService.ts`: The "Brain" of Visper. Handles all API calls (Matchmaking, Party, Friends).
    -   `sessionManager.ts`: Manages RSO tokens and cookie persistence to keep the user logged in.
    -   `riotWebviewAuth.ts`: Handles the OAuth2 flow via a hidden BrowserWindow.

### 3.2 Renderer Process (`src/renderer/`)
-   **Tech**: React 19, Vite, TailwindCSS.
-   **Widgets**: Visper uses a widget-based UI (`PartyWidget`, `FriendList`) relying on custom hooks (`useVisperParty`, `useVisperAuth`) to poll data from the Main process.

### 3.3 Data Persistence
-   **Tool**: `electron-store`.
-   **Data**:
    -   `accounts`: List of saved credentials (encrypted/safe storage).
    -   `visper_sessions`: Auth tokens for the assistant.
    -   `settings`: User preferences (paths, auto-launch).

## 4. Key Workflows

### 4.1 Account Switching
1.  User clicks "Switch" in Renderer.
2.  `switch-account` IPC called.
3.  Main process kills `RiotClientServices.exe`.
4.  Main process overwrites `Private.yaml` / config files.
5.  Main process re-launches Riot Client.

### 4.2 Visper Data Fetching
1.  Renderer calls `visper-get-party`.
2.  Main process checks invalid/expired tokens.
    -   If expired: Tries auto-refresh or prompts login.
3.  `RiotService` executes `glz` or `pd` API request with correct headers (`X-Riot-Entitlements-JWT`).
4.  JSON result returned to Renderer.

## 5. Security & Isolation
-   **Context Isolation**: Enabled. Renderer cannot access Node.js primitives directly.
-   **IPC Whitelist**: Only channels defined in `preload` (or via `safeHandle` map) are executable.
