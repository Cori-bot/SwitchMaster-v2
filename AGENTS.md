# SwitchMaster Agent Guide

This repository contains **SwitchMaster**, an Electron application for switching between multi-accounts (Riot Games, etc.), built with React, TypeScript, Vite, and Tailwind CSS.

## 1. Project Overview & Environment

- **Runtime:** Electron 40.0.0 (Node 18+)
- **Frontend:** React 19, TypeScript 5.9
- **Build Tool:** Vite 7.3
- **Styling:** Tailwind CSS 4.1
- **State:** React Context + Hooks
- **Package Manager:** `pnpm` (Strictly required)

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
| **Lint/Format**   | `pnpm up-dep`              | Update dependencies (Careful!).                                         |

## 2. Directory Structure

- **`src/main/`**: Electron Main Process (Node.js environment).
  - **`services/`**: Core business logic classes (e.g., `ConfigService`, `AccountService`). Use Dependency Injection pattern.
  - `main.ts`: Entry point.
  - `ipc.ts`: IPC handlers.
- **`src/renderer/`**: React Renderer Process (Browser environment).
  - `components/`: Functional UI components (`PascalCase.tsx`).
  - `hooks/`: Custom hooks (`useHook.ts`).
  - `contexts/`: React Context providers.
  - `assets/`: Images and global styles.

## 3. Code Style & Conventions

### TypeScript & General

- **Strict Mode:** Enabled. **NO** `any` types. Use proper interfaces/types.
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
- **Styling:** **Tailwind CSS** only. Use `clsx` and `tailwind-merge` for class logic. No inline `style={{}}` unless dynamic (e.g., background images).
- **Icons:** Use `lucide-react`.
- **State:** Prefer local state or Context. Avoid Redux unless necessary.
- **Forms:** Use `zod` for validation.

### Electron (Main)

- **Architecture:** Service-based pattern in `src/main/services/`.
- **IPC:**
  - **Renderer:** `window.electron.ipcRenderer.invoke('channel', data)`
  - **Main:** `ipcMain.handle('channel', async (evt, data) => { ... })`
- **File System:** Use `fs-extra` for all FS operations.
- **Paths:** ALWAYS use `path.join()`. Never string concatenation for paths.
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
// Example Test Structure
describe("AccountCard", () => {
  it("should render account name", () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();
  });
});
```

## 5. Critical Rules for Agents

1.  **Read First:** Always inspect `package.json` and `tsconfig.json` before changing config.
2.  **No Blind Installs:** Do not run `npm install` or `pnpm install` for new packages without user permission.
3.  **Absolute Paths:** ALWAYS use full absolute paths for file operations (e.g., `D:\Code\SwitchMaster-v2\src\main\main.ts`).
4.  **Preserve Style:** Match indentation (2 spaces), quoting (double quotes), and existing patterns.
5.  **Verify:** Run `pnpm build` after significant refactoring to ensure type safety.
6.  **No Regressions:** Run `pnpm test` to verify changes.
7.  **Error Handling:** Use `try/catch` for all async operations (IPC, FS, Network).
