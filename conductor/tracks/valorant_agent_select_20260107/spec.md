# Spec: Sélection d'agent Valorant (Visper)

## Vue d'ensemble
L'objectif est de permettre aux utilisateurs de SwitchMaster de sélectionner et de verrouiller (lock) un agent directement depuis l'application pendant la phase de sélection des agents de Valorant. Cette fonctionnalité s'appuie sur le module Visper qui communique avec l'API locale de Riot (LUR).

## Fonctionnalités
- Affichage de la liste des agents disponibles.
- Sélection d'un agent par simple clic.
- Verrouillage (Lock) de l'agent sélectionné.
- Retour visuel sur l'état du verrouillage.

## Architecture Technique
- **Main Process :**
    - Extension du `riotService.ts` pour inclure les appels API `POST /glz/v1/parties/{partyId}/agents/{agentId}/lock`.
    - Nouveaux gestionnaires IPC dans `visperHandlers.ts`.
- **Renderer Process :**
    - Nouveau composant `AgentSelector.tsx`.
    - Hook `useVisperGame` pour gérer l'état de la partie en cours.

## Sécurité
- Les appels API sont effectués localement via les identifiants extraits du lockfile de Riot.
- Aucune donnée n'est envoyée à des serveurs tiers.

## Acceptance Criteria
- L'utilisateur peut voir la liste des agents.
- Cliquer sur un agent envoie une requête de sélection.
- Le bouton "Lock" verrouille définitivement l'agent.
- L'interface affiche une erreur si l'action échoue (ex: agent déjà pris).
