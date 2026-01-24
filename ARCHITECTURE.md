# Plan d'Architecture Complet : SwitchMaster-v2

Ce document détaille l'audit de l'existant et la stratégie technique pour supporter le multi-launcher (Backend) et le multi-design (Frontend).

## 1. Audit de la Séparation Logique/Vue (État Actuel)

### Analyse Frontend (React)
- **Points Positifs :**
  - L'utilisation de `useAccounts.ts` montre déjà une volonté de séparer la logique d'accès aux données de la vue.
  - Le composant `AccountCard.tsx` est un composant de présentation ("dumb component") qui reçoit ses actions (`onSwitch`, `onDelete`) via des props. C'est une excellente base pour le pattern Container/Presenter.
- **Points à Améliorer :**
  - La logique de gestion des erreurs et de chargement semble dispersée ou gérée au niveau de chaque composant consommant le hook.
  - Il manque une couche d'abstraction pour "l'orchestration" : un hook qui combine la gestion des comptes, le lancement du jeu et les notifications pour fournir une API unifiée aux différents designs.

### Analyse Backend (Electron)
- **Points Critiques :**
  - Le service `RiotAutomationService.ts` est fortement couplé à l'implémentation spécifique de Riot (chemins d'exécutables en dur, scripts PowerShell spécifiques, noms de processus "LeagueClient.exe", etc.).
  - Il n'y a pas d'interface générique. Ajouter Steam ou Epic demanderait de dupliquer ce service et de modifier le `main.ts` pour gérer chaque cas, ce qui n'est pas scalable.
  - Les méthodes comme `killProcesses` ou `launchClient` sont spécifiques à Riot.

---

## 2. La Stratégie "Headless UI" (Solution Frontend)

L'objectif est de créer des hooks qui fournissent *tout* ce dont l'UI a besoin (états et fonctions) sans imposer aucun JSX. Les composants "Design A" et "Design B" ne seront que des "consommateurs" de ces hooks.

### Architecture des Hooks
Nous allons créer un hook composite `useAccountManager` qui orchestrera les appels IPC et la gestion d'état locale.

#### Exemple de Code : `useAccountManager`

```typescript
// src/renderer/hooks/useAccountManager.ts
import { useState, useCallback } from 'react';
import { useAccounts } from './useAccounts';
import { Account } from '@shared/types';

// Interface de retour du Hook (L'API publique pour vos Designs)
export interface UseAccountManagerResult {
  accounts: Account[];
  activeAccountId: string | null;
  isLoading: boolean;
  error: string | null;
  actions: {
    login: (account: Account) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    switchDesign: (design: 'A' | 'B') => void;
  };
}

export const useAccountManager = (): UseAccountManagerResult => {
  const { accounts, refreshAccounts, deleteAccount: ipcDelete, updateAccount } = useAccounts();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Logique métier centralisée (ex: connexion)
  const login = useCallback(async (account: Account) => {
    try {
      setError(null);
      setActiveAccountId(account.id); // Optimistic UI
      await window.ipc.invoke('launch-game', { 
        launcherType: account.launcherType, // 'riot' | 'steam' | 'epic'
        credentials: { username: account.username, password: account.password } 
      });
    } catch (err) {
      setError("Échec de la connexion");
      setActiveAccountId(null); // Rollback
    }
  }, []);

  return {
    accounts,
    activeAccountId,
    isLoading: false, // À connecter au state loading réel
    error,
    actions: {
      login,
      deleteAccount: async (id) => { await ipcDelete(id); await refreshAccounts(); },
      switchDesign: (d) => console.log("Switch design to", d), // À implémenter avec un Context
    }
  };
};
```

#### Utilisation dans Design A et Design B

```tsx
// src/renderer/layouts/DesignA/DesignA_Card.tsx (Actuel)
const DesignA: React.FC = () => {
  const { accounts, actions } = useAccountManager();
  
  return (
    <div className="grid-layout-a">
      {accounts.map(acc => (
        <AccountCard 
          key={acc.id} 
          account={acc} 
          onSwitch={() => actions.login(acc)} 
        />
      ))}
    </div>
  );
};

// src/renderer/layouts/DesignB/DesignB_List.tsx (Futur Design via Custom Hook)
const DesignB: React.FC = () => {
  const { accounts, actions } = useAccountManager();
  
  // Le Design B peut utiliser une liste ultra-minimaliste
  return (
    <ul className="minimal-list-b">
      {accounts.map(acc => (
        <li key={acc.id} onClick={() => actions.login(acc)}>
          {acc.username} - {acc.stats?.rank}
        </li>
      ))}
    </ul>
  );
};
```

---

## 3. Abstraction Multi-Launcher (Solution Backend)

Pour supporter Steam, Epic, etc., nous devons inverser les dépendances. Le contrôleur principal ne doit pas connaître "Riot", mais manipuler un `ILauncherService`.

### L'Interface TypeScript `ILauncherService`

```typescript
// src/main/interfaces/ILauncherService.ts

export interface ILauncherCredentials {
  username: string;
  password?: string;
  method?: 'oauth' | 'credentials';
}

export interface ILauncherService {
  /** Identifiant unique (ex: 'riot', 'steam') */
  readonly id: string;

  /** Lance le client du launcher (sans forcément lancer le jeu) */
  launchClient(): Promise<void>;

  /** Lance un jeu spécifique géré par ce launcher */
  launchGame(gameId: string): Promise<void>;

  /** Effectue l'authentification (si supporté) */
  login(credentials: ILauncherCredentials): Promise<void>;

  /** Tue tous les processus associés à ce launcher */
  killAll(): Promise<void>;

  /** Détecte si le launcher est installé sur la machine */
  detectInstallation(): Promise<string | null>;

  /** Vérifie si le client est en cours d'exécution */
  isRunning(): Promise<boolean>;
}
```

### Implémentation du Factory Pattern

Le Contrôleur Principal (`main.ts` ou `LauncherManager`) utilisera une Factory pour instancier le bon service à la volée.

```typescript
// src/main/services/LauncherFactory.ts
import { RiotAutomationService } from './RiotAutomationService';
import { SteamAutomationService } from './SteamAutomationService'; // Futur
import { ILauncherService } from '../interfaces/ILauncherService';

export class LauncherFactory {
  private services: Map<string, ILauncherService> = new Map();

  constructor() {
    // Enregistrement des services
    this.registerService(new RiotAutomationService());
    // this.registerService(new SteamAutomationService());
  }

  private registerService(service: ILauncherService) {
    this.services.set(service.id, service);
  }

  public getService(launcherId: string): ILauncherService {
    const service = this.services.get(launcherId);
    if (!service) {
      throw new Error(`Launcher service not support: ${launcherId}`);
    }
    return service;
  }
}
```

### Modification de `RiotAutomationService`

Il faudra refactoriser `RiotAutomationService.ts` pour qu'il implémente cette interface :

```typescript
export class RiotAutomationService implements ILauncherService {
  readonly id = 'riot';
  
  async launchGame(gameId: string) {
    // Logique existante adaptée...
  }
  
  async killAll() {
    // Appel à votre killProcesses existant
  }
  
  // ... implémentation des autres méthodes
}
```

### Flux de Contrôle

1. **Front** : L'utilisateur clique sur un compte Steam.
2. **Hook** : `useAccountManager` envoie `ipc.invoke('launch-game', { launcherType: 'steam', ... })`.
3. **Main** : Le handler IPC reçoit la demande.
4. **Factory** : `launcherFactory.getService('steam')` est appelé.
5. **Exécution** : Le service Steam exécute `login()` et `launchGame()`.

Cette architecture garantit que l'ajout d'un nouveau launcher (ex: Epic Games) ne nécessite **aucune modification de l'UI** (si ce n'est l'icône) et aucune modification de la logique d'orchestration globale.
