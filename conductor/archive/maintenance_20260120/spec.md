# Track Specification: Maintenance et Sécurité

## Overview
Cette track vise à consolider la base technique de SwitchMaster en mettant à jour les dépendances critiques et en renforçant la sécurité du stockage des identifiants.

## Goals
1.  **Mettre à jour** les dépendances principales (Electron, React, Vite) pour bénéficier des derniers correctifs de sécurité et performances.
2.  **Renforcer** la validation des données lors de l'ajout/modification de comptes.
3.  **Auditer** et améliorer la gestion des erreurs dans le module de chiffrement.

## Scope
- **Fichiers concernés** :
    - `package.json` / `pnpm-lock.yaml`
    - `src/main/ipc/securityHandlers.ts`
    - `src/main/ipc/accountHandlers.ts`
    - `src/shared/types.ts`
- **Exclusions** :
    - Refonte de l'interface utilisateur (hors corrections liées aux mises à jour).
    - Ajout de nouveaux lanceurs (réservé à une track future).

## Success Criteria
- Toutes les dépendances sont à jour sans vulnérabilités critiques (`npm audit` clean).
- L'application build et se lance correctement sur la dernière version d'Electron.
- Les tests unitaires couvrent 80% des modules de sécurité et de gestion des comptes.
- Impossible d'injecter des données malformées dans le stockage des comptes.
