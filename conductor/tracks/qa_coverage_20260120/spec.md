# Track Specification: Quality Assurance - 80% Code Coverage

## Overview
Cette track a pour objectif d'atteindre une couverture de code de 80% sur l'ensemble du projet SwitchMaster. Cela garantira la robustesse de l'application, facilitera la maintenance future et réduira les risques de régressions.

## Goals
1.  **Backend Coverage** : Tester exhaustivement tous les modules Electron (Main Process), y compris la configuration, le logging, l'automatisation et les services.
2.  **Frontend Coverage** : Tester les composants React et les Hooks personnalisés.
3.  **Mocking Strategy** : Mettre en place des mocks robustes pour les dépendances externes (Système de fichiers, Processus enfants, API réseau, Electron APIs).

## Scope
- **Backend** : `src/main/**/*.ts`
- **Frontend** : `src/renderer/**/*.{ts,tsx}`
- **Shared** : `src/shared/**/*.ts`

## Success Criteria
- Rapport de couverture global indiquant 80% pour Statements, Branches, Functions et Lines.
- Tous les tests passent (`pnpm test`).
- Pas de "false positives" (tests qui passent sans rien vérifier).

## Technical Approach
- Utilisation de `Vitest` pour tous les tests.
- `vi.mock()` pour isoler les modules.
- `@testing-library/react` pour les composants UI.
