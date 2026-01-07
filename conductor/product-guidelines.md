# Product Guidelines - SwitchMaster

## Principes de Design
- **Ton & Style :** L'application adopte un ton **moderne et technique**. La communication est directe, précise et centrée sur l'efficacité, traitant SwitchMaster comme un outil de performance pour joueurs sérieux.
- **Identité Visuelle :** 
    - **Immersion Riot :** L'interface s'inspire des codes graphiques de Riot Games (typographies, effets de lueur, palettes de couleurs sombres et saturées).
    - **Réactivité :** Utilisation de Framer Motion pour des transitions fluides et instantanées, renforçant la sensation de vitesse du "Fast Switching".

## Expérience Utilisateur (UX)
- **Feedback Immédiat :** Chaque interaction doit déclencher une réponse visuelle (changement d'état, animation). Les actions réussies sont confirmées par des **toasts non-intrusifs** en bas de l'écran.
- **Gestion du Temps :** Les processus longs (comme l'authentification) doivent être accompagnés d'animations de chargement explicites pour rassurer l'utilisateur.

## Directives de Développement
- **Architecture :** Application d'une **modularité stricte**. Les domaines (Auth Riot, Stats, Visper, IPC) sont isolés pour faciliter la maintenance et l'évolution indépendante.
- **Qualité du Code :** 
    - **TypeScript :** Utilisation rigoureuse du typage pour sécuriser les échanges de données, particulièrement entre le processus Main et le Renderer.
    - **Documentation :** Les décisions techniques complexes et les contournements liés aux API Riot doivent être documentés avec des commentaires expliquant le "pourquoi".

## Sécurité & Confidentialité
- **Protection des Données :** Chiffrement systématique de toutes les données sensibles (tokens, identifiants) stockées localement.
- **Confidentialité :** Aucune donnée de compte n'est transmise à des tiers. Les seuls serveurs contactés sont ceux de Riot Games.
- **Transparence :** L'utilisateur est toujours informé des actions de l'application sur son système (fermeture/lancement de processus).
