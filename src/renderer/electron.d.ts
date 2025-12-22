export {};

declare global {
  interface Window {
    ipc: {
      invoke: (channel: string, ...args: unknown[]) => Promise<any>;
      send: (channel: string, ...args: unknown[]) => void;
      on: (
        channel: string,
        listener: (event: any, ...args: any[]) => void,
      ) => () => void;
      removeAllListeners: (channel: string) => void;
    };
    env: {
      isDev: boolean;
    };
  }
}
