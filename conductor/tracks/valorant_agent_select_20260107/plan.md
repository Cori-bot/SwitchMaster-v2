# Plan: Sélection d'agent Valorant (Visper)

Ce plan suit le workflow TDD (Test-Driven Development) défini dans `conductor/workflow.md`.

---

## Phase 1: Logique Backend & Intégration API

### [ ] Task: Implémenter la méthode de verrouillage d'agent dans `riotService`
- [ ] Sous-tâche: Écrire les tests unitaires pour la méthode `lockAgent` dans `riotService.test.ts`
- [ ] Sous-tâche: Implémenter la méthode `lockAgent` dans `src/main/visper/riotService.ts`
- [ ] Sous-tâche: Vérifier que les tests passent et la couverture > 80%

### [ ] Task: Configurer les gestionnaires IPC pour la sélection d'agent
- [ ] Sous-tâche: Écrire les tests pour les nouveaux IPC handlers dans `visperHandlers.test.ts`
- [ ] Sous-tâche: Ajouter les handlers `visper:lock-agent` dans `src/main/ipc/visperHandlers.ts`
- [ ] Sous-tâche: Mettre à jour les types partagés dans `src/shared/visper-types.ts`

### [ ] Task: Conductor - User Manual Verification 'Phase 1: Logique Backend' (Protocol in workflow.md)

---

## Phase 2: Interface Utilisateur (Renderer)

### [ ] Task: Créer le composant `AgentSelector`
- [ ] Sous-tâche: Écrire les tests unitaires pour `AgentSelector.tsx`
- [ ] Sous-tâche: Développer le composant UI avec Tailwind CSS
- [ ] Sous-tâche: Gérer les états (chargement, erreur, succès)

### [ ] Task: Intégrer `AgentSelector` dans le Dashboard/VisperWindow
- [ ] Sous-tâche: Écrire les tests d'intégration
- [ ] Sous-tâche: Ajouter le composant à la vue principale de Visper
- [ ] Sous-tâche: Connecter le composant aux IPC via `useAppIpc`

### [ ] Task: Conductor - User Manual Verification 'Phase 2: Interface Utilisateur' (Protocol in workflow.md)

---

## Phase 3: Finalisation & Polissage

### [ ] Task: Revue globale et optimisation
- [ ] Sous-tâche: Vérifier la cohérence visuelle avec les `product-guidelines.md`
- [ ] Sous-tâche: Optimiser les transitions avec Framer Motion
- [ ] Sous-tâche: Documentation finale du module dans le code

### [ ] Task: Conductor - User Manual Verification 'Phase 3: Finalisation' (Protocol in workflow.md)
