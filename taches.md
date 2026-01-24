# Tâches - Système de Design Modulaire

- [ ] **Architecture**
    - [ ] Créer le dossier `src/renderer/designs`.
    - [ ] Définir l'interface `DesignProps` dans `src/renderer/designs/types.ts`.
    - [ ] Créer le registre `src/renderer/designs/registry.ts`.

- [ ] **Refactoring Classic (V2)**
    - [ ] Créer `src/renderer/designs/classic/ClassicLayout.tsx`.
    - [ ] Déplacer les composants existants (Sidebar, Dashboard...) vers `classic/components` (ou les laisser partager `src/renderer/components` si réutilisables, mais l'assemblage se fait dans `ClassicLayout`). *Décision: Laisser dans `src/renderer/components` pour l'instant pour minimiser les diffs de fichiers, mais importer dans `ClassicLayout`.*
    - [ ] Adapter `App.tsx` pour utiliser `ClassicLayout` par défaut.

- [ ] **Implémentation Modern (V3)**
    - [ ] Créer la structure `src/renderer/designs/modern`.
    - [ ] Copier/Adapter les fichiers CSS (`modern.css` scopé).
    - [ ] Créer `ModernLayout.tsx` (Adaptation de `App.tsx` du code fourni V3).
    - [ ] Implémenter `AccountsPage`, `GamesPage`, `SettingsPage` en utilisant les hooks de l'app (`useAccountManager`).
    - [ ] Mapper les `Account` vers l'interface visuelle V3.

- [ ] **Intégration**
    - [ ] Ajouter l'option de changement de design dans les Settings (V2 et V3).
    - [ ] Tester le basculement à chaud.
