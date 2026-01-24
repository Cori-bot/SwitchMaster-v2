# SwitchMaster Agent Guide

This repository contains **SwitchMaster**, an Electron application for switching between multi-accounts (Riot Games, etc.), built with React, TypeScript, Vite, and Tailwind CSS.

## 1. Project Overview & Environment

- **Runtime:** Electron 40.0.0 (Node 18+)
- **Frontend:** React 19, TypeScript 5.9
- **Build Tool:** Vite 7.3
- **Styling:** Tailwind CSS 4.1
- **State:** React Context + Custom Hooks
- **Package Manager:** `pnpm` (Strictly required - do NOT use npm/yarn)

### Setup & Commands

| Action            | Command                    | Description                                                             |
| :---------------- | :------------------------- | :---------------------------------------------------------------------- |
| **Install**       | `pnpm install`             | Install all dependencies.                                               |
| **Dev**           | `pnpm dev`                 | Start Electron + Vite dev server concurrently.                          |
| **Build**         | `pnpm build`               | Run full production build (Renderer -> Main -> Builder).                |
| **Release**       | `pnpm release`             | Build and publish to GitHub Releases.                                   |
| **Test**          | `pnpm test`                | Run all unit tests via Vitest.                                          |
| **Test (Single)** | `pnpm test <path/to/file>` | Run a specific test file (e.g., `pnpm test src/renderer/App.test.tsx`). |
| **Coverage**      | `pnpm test:coverage`       | Generate test coverage report.                                          |
| **Format**        | `npx prettier --write .`   | Format code using Prettier (Run before committing).                     |
| **Update Deps**   | `pnpm up-dep`              | Update dependencies (Use with extreme caution).                         |

## 2. Directory Structure

- **`src/main/`**: Electron Main Process (Node.js environment).
  - **`services/`**: Core business logic classes (e.g., `ConfigService`, `AccountService`).
    - _Pattern:_ Services are instantiated in `main.ts` and injected into IPC handlers.
  - `main.ts`: Application entry point, window creation, and service orchestration.
  - `ipc.ts`: IPC handler registration.
  - `logger.ts`: Custom logging wrapper (`devLog`, `devError`).
- **`src/renderer/`**: React Renderer Process (Browser environment).
  - `components/`: Functional UI components (`PascalCase.tsx`).
  - `hooks/`: Custom hooks (`useHook.ts`) for logic encapsulation.
  - `contexts/`: React Context providers for global state.
  - `assets/`: Static assets (images, fonts).
  - `layouts/`: Page layouts (e.g., `DesignB.tsx`).

## 3. Code Style & Conventions

### TypeScript & General

- **Strict Mode:** Enabled in `tsconfig.json`. **NO** `any` types. Use proper interfaces/types.
- **Interfaces:** Use `interface` for object definitions, `type` for unions/primitives.
- **Path Aliases:**
  - `@/` -> `src/renderer/` (Renderer only)
  - `@assets/` -> `src/assets/`
- **Naming:**
  - **Variables/Functions:** `camelCase`
  - **Components/Classes:** `PascalCase`
  - **Constants:** `UPPER_SNAKE_CASE`
  - **Files:** `camelCase.ts` (logic/utils), `PascalCase.tsx` (components/classes).

### React (Renderer)

- **Components:** Functional components only. `const Component = () => {}`.
- **Styling:** **Tailwind CSS** only.
  - Use `clsx` and `tailwind-merge` for conditional class logic.
  - **NO** inline `style={{}}` unless dynamic (e.g., user-defined background images).
- **Icons:** Use `lucide-react`.
- **State:**
  - Prefer `useState` for local component state.
  - Use `Context` + `useContext` for global state (Config, Accounts).
  - Encapsulate complex logic in custom hooks (e.g., `useAccountManager`).
- **Animation:** Use `framer-motion` for transitions (e.g., `AnimatePresence`, `motion.div`).

### Electron (Main)

- **Architecture:** Service-based pattern.
  - Logic belongs in `src/main/services/`, NOT in `main.ts` or `ipc.ts`.
  - Services should be singletons or instantiated once in `main.ts`.
- **IPC Communication:**
  - **Renderer:** `window.electron.ipcRenderer.invoke('channel', data)`
  - **Main:** `ipcMain.handle('channel', async (evt, data) => { ... })`
  - Always type the data payloads in `src/shared/types.ts` or `src/main/ipc/types.ts`.
- **File System:** Use `fs-extra` for all FS operations (provides Promise support).
- **Paths:** ALWAYS use `path.join()`. Never use string concatenation for file paths.
- **Logging:** Use `devLog`/`devError` from `./logger`. **NO** `console.log` in production code.

### Imports Ordering

1. **External:** `react`, `electron`, third-party libs.
2. **Internal Absolute:** `@/components/...`, `@assets/...`.
3. **Internal Relative:** `./utils`, `../hooks`.
4. **Styles:** `./index.css`.

## 4. Testing Guidelines

- **Framework:** Vitest + React Testing Library.
- **Location:** `__tests__` directory alongside code or in `src/renderer/__tests__`.
- **Naming:** `Component.test.tsx` or `logic.test.ts`.
- **Mocking:**
  - Mock `window.electron` in renderer tests.
  - Mock `fs-extra` in main process tests.

```typescript
// Example Renderer Test
import { render, screen } from "@testing-library/react";
import AccountCard from "./AccountCard";

describe("AccountCard", () => {
  it("should render account name", () => {
    const mockAccount = { id: "1", name: "PlayerOne", ... };
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();
  });
});

// Example Main Process Test
import { describe, it, expect, vi } from "vitest";
import { ConfigService } from "../services/ConfigService";

vi.mock("fs-extra"); // Auto-mock fs-extra

describe("ConfigService", () => {
  it("should load default config if file missing", async () => {
    const service = new ConfigService();
    const config = await service.getConfig();
    expect(config.enableGPU).toBe(false);
  });
});
```

## 5. Critical Rules for Agents

1.  **Read First:** Always inspect `package.json`, `tsconfig.json`, and related source files before changing configuration or architecture.
2.  **No Blind Installs:** Do not run `npm install` or `pnpm install` for new packages without explicit user permission.
3.  **Absolute Paths:** ALWAYS use full absolute paths for file operations (e.g., `D:\Code\SwitchMaster-v2\src\main\main.ts`).
4.  **Preserve Style:** Match indentation (2 spaces), quoting (double quotes), and existing code patterns.
5.  **Type Safety:** Verify changes with `pnpm build` (TypeScript check) after significant refactoring.
6.  **No Regressions:** Run `pnpm test` to verify changes don't break existing functionality.
7.  **Error Handling:**
    - Use `try/catch` for all async operations (IPC, FS, Network).
    - Log errors using `devError` in the Main process.
    - Handle UI errors gracefully (e.g., Error Boundaries or Toast notifications).
8.  **Atomic Changes:** Make small, focused changes. Don't rewrite entire files unless necessary.
9.  **Dependencies:** Use existing libraries (`date-fns`, `zod`, `clsx`, etc.) before suggesting new ones.

## 6. Common Patterns & Troubleshooting

- **"Module not found":** Check `tsconfig.json` path aliases. Renderer code cannot import Main process code directly (use `src/shared` for shared types).
- **IPC Errors:** Ensure the channel name matches exactly in `main/ipc.ts` and `renderer/hooks/useAppIpc.ts`.
- **Tailwind:** If styles aren't applying, check `tailwind.config.js` or `content` array configuration.
- **Window Management:** `BrowserWindow` instances are managed in `src/main/window.ts`. Use `mainWindow?.webContents.send` for push updates.
