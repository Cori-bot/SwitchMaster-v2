# Source Tree Analysis

## Critical Directories

```
d:\Code\SwitchMaster-v2\
├── src/
│   ├── main/                    # Main Process (Node.js/Electron)
│   │   ├── automation/          # Low-level process/file automation
│   │   ├── ipc/                 # IPC Handler Registrations
│   │   │   ├── riotHandlers.ts  # Switcher Logic
│   │   │   └── visperHandlers.ts# Visper API Logic
│   │   ├── visper/              # Visper Business Logic
│   │   │   ├── riotService.ts   # Riot API Wrapper
│   │   │   └── sessionManager.ts# Auth/Cookie Persistence
│   │   ├── main.ts              # Entry Point
│   │   └── config.ts            # Configuration Management
│   ├── renderer/                # Renderer Process (React)
│   │   ├── components/          # UI Components
│   │   │   ├── Visper/          # Visper Specific UI
│   │   │   │   ├── widgets/     # Party/Friend Widgets
│   │   │   │   └── VisperWindow.tsx
│   │   │   └── Settings.tsx     # App Settings
│   │   ├── hooks/               # Custom React Hooks
│   │   └── App.tsx              # UI Root
│   └── shared/                  # Code shared between Main/Renderer
│       ├── types.ts             # Generic Types
│       └── visper-types.ts      # Visper Specific Types (Party, Friend)
├── scripts/                     # Build/Utility scripts
├── dist-main/                   # Compiled Main Process
├── build/                       # Output Directory
└── package.json                 # Project Manifest
```

## Module Responsibilities

-   **`src/main/ipc`**: The API Layer. Translates UI events (clicks) into backend actions.
-   **`src/main/visper/riotService.ts`**: The "Service Layer". Contains the complexity of talking to Riot's internal endpoints.
-   **`src/renderer/components/Visper`**: The "Presentation Layer". Displays game data.

## Integration Points

-   **IPC Bridge**: defined in `preload` (not shown but implied), used via `window.electron`.
-   **Types**: `src/shared/visper-types.ts` is the contract between Main (provider) and Renderer (consumer) for data structures like `PartyData`.
