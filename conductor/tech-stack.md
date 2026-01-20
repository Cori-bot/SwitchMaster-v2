# Technology Stack - SwitchMaster

## Core Technologies
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Application Framework**: [Electron](https://www.electronjs.org/) (v40+)
- **Frontend Framework**: [React 19](https://react.dev/) (Latest)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## UI & Styling
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Backend & Utilities (Main Process)
- **Logging**: [electron-log](https://github.com/megahertz/electron-log)
- **Updates**: [electron-updater](https://www.electron.build/auto-update)
- **File System**: [fs-extra](https://github.com/jprichardson/node-fs-extra)
- **Validation**: [Zod](https://zod.dev/)
- **Automation**: PowerShell scripts (`src/scripts/`)

## Quality & Tooling
- **Testing**: [Vitest](https://vitest.dev/)
- **Linting & Formatting**: [Prettier](https://prettier.io/)
- **Environment**: [concurrently](https://github.com/open-cli-tools/concurrently), [cross-env](https://github.com/kentcdodds/cross-env)

## Infrastructure
- **CI/CD**: GitHub Actions (electron-builder)
- **Distribution**: GitHub Releases
