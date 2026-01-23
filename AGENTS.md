# SwitchMaster Agent Guide

This repository contains **SwitchMaster**, an Electron application for switching between multi-accounts (Riot Games, etc.), built with React, TypeScript, Vite, and Tailwind CSS.

## 1. Project Overview & Environment

### Stack

- **Runtime:** Electron 40.0.0 (Node 18+)
- **Frontend:** React 19, TypeScript 5.9
- **Build Tool:** Vite 7.3
- **Styling:** Tailwind CSS 4.1
- **State:** React Context + Hooks
- **Package Manager:** `pnpm` (Strictly required)

### Setup & Commands

| Action            | Command              | Description                                                |
| ----------------- | -------------------- | ---------------------------------------------------------- |
| **Install**       | `pnpm install`       | Install all dependencies.                                  |
| **Dev**           | `pnpm dev`           | Start Electron + Vite dev server concurrently.             |
| **Build**         | `pnpm build`         | Run full production build (Renderer -> Main -> Builder).   |
| **Release**       | `pnpm release`       | Build and publish to GitHub Releases.                      |
| **Test**          | `pnpm test`          | Run all unit tests via Vitest.                             |
| **Test (Single)** | `pnpm test <file>`   | Run a specific test file (e.g., `pnpm test App.test.tsx`). |
| **Coverage**      | `pnpm test:coverage` | Generate test coverage report.                             |
| **Lint/Format**   | `pnpm up-dep`        | Update dependencies (Careful!).                            |

## 2. Directory Structure

- **`build/`**: Output directory for Electron installers (nsis).
- **`dist/`**: Compiled Renderer assets (Vite output).
- **`dist-main/`**: Compiled Main process assets.
- **`src/main/`**: Electron Main Process.
  - `main.ts`: Application entry point, window creation.
  - `preload.js`: Context bridge for IPC.
  - `ipc.ts`: IPC handler registration.
  - `appLogic.ts`: Core business logic (Game launching, Riot client interaction).
- **`src/renderer/`**: React Renderer Process.
  - `components/`: UI Components (Functional).
  - `contexts/`: React Contexts (Global state).
  - `hooks/`: Custom React hooks.
  - `assets/`: Static assets (Images, global CSS).
  - `__tests__/`: Unit tests.
- **`scripts/`**: Build scripts (e.g., `build-main.js`).

## 3. Code Style & Conventions

### TypeScript

- **Strict Mode:** Enabled. No `any` unless absolutely necessary.
- **Interfaces:** Prefer `interface` over `type` for object definitions.
- **Naming:**
  - Variables/Functions: `camelCase`
  - Components/Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `camelCase.ts` (logic), `PascalCase.tsx` (components).

### Imports

- **Absolute Imports:**
  - `@/` -> `src/renderer/` (Renderer only).
  - `@assets/` -> `src/assets/`.
- **Ordering:**
  1. External (React, Electron, etc.)
  2. Internal Absolute (`@/...`)
  3. Internal Relative (`./...`)
  4. Styles (`./index.css`)

### React (Renderer)

- **Functional Components:** Use `const Component = () => {}` syntax.
- **Hooks:** Extract complex logic into custom hooks (`useAuth`, `useGameStatus`).
- **Styling:**
  - Use **Tailwind CSS** for all styling.
  - Use `clsx` and `tailwind-merge` for conditional classes.
  - Avoid inline styles (`style={{}}`).
- **Icons:** Use `lucide-react`.
- **Validation:** Use `zod` for form/data validation.
- **Animation:** Use `framer-motion` for transitions.

### Electron (Main)

- **IPC Pattern:**
  - **Renderer:** `window.electron.ipcRenderer.invoke('channel', data)`
  - **Main:** `ipcMain.handle('channel', async (event, data) => { ... })`
- **Security:**
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - Expose only safe APIs via `preload.js`.
- **File System:**
  - Use `fs-extra` for simplified fs operations.
  - **Paths:** Always use `path.join()`. Never string concatenation.
  - **UserData:** Store user data in `app.getPath('userData')`.

## 4. Testing Guidelines

### Framework

- **Vitest:** Test runner.
- **React Testing Library:** Component testing.

### Writing Tests

- **Location:** `__tests__` folder in the same directory as the code or `src/renderer/__tests__`.
- **Naming:** `Filename.test.tsx` or `Filename.test.ts`.
- **Structure:**
  ```typescript
  describe("ComponentName", () => {
    it("should render correctly", () => {
      render(<ComponentName />);
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });
  });
  ```
- **Mocking:**
  - Mock `window.electron` methods in renderer tests.
  - Mock `fs-extra` or `electron` modules in main process tests.

## 5. Error Handling & Logging

- **Logging (Main):**
  - Use `devLog` and `devError` from `./logger`.
  - Do NOT use `console.log` in production code.
- **Logging (Renderer):**
  - `console.error` is acceptable for development debugging.
- **Error Boundaries:**
  - The renderer is wrapped in an `ErrorBoundary` component.
- **Async/Await:**
  - Always use `try/catch` blocks for async operations, especially file I/O and network requests.

## 6. Critical Rules for Agents

1.  **Read Before Write:** Always inspect `package.json`, `tsconfig.json`, and relevant source files before making changes.
2.  **No Blind Installs:** Do not install new `npm` packages without user approval.
3.  **Preserve Context:** When editing, keep surrounding comments and code style intact.
4.  **Absolute Paths:** ALWAYS use full absolute paths for file operations (e.g., `D:\Code\SwitchMaster-v2\src\...`).
5.  **Verify:** Run `pnpm type-check` (if available) or `pnpm build` after significant changes to ensure integrity.
6.  **No Regressions:** Ensure existing tests pass (`pnpm test`) before considering a task complete.
