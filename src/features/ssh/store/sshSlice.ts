import type { StateCreator } from "zustand";
import type {
  SshConnectionConfig,
  SshActiveConnection,
  SavedSshConnection,
  SshAuthMethod,
  ActiveForward,
} from "@shared/lib/types";
import { ssh } from "@shared/lib/tauri";

/** Minimal data for the password prompt — never stores the password itself. */
interface PasswordPromptInfo {
  username: string;
  host: string;
  port: number;
  authMethod: SshAuthMethod;
  resolve: (pw: string | null) => void;
}

export interface SshSlice {
  // State
  activeConnectionId: string | null;
  activeConnections: SshActiveConnection[];
  savedConnections: SavedSshConnection[];
  activeForwards: ActiveForward[];
  sshConnecting: boolean;
  sshError: string | null;
  passwordPrompt: PasswordPromptInfo | null;

  // Actions
  sshConnect: (config: SshConnectionConfig, password?: string | null) => Promise<void>;
  sshDisconnect: (connectionId: string) => Promise<void>;
  sshSetActive: (connectionId: string | null) => void;
  sshLoadSaved: () => Promise<void>;
  sshSaveConnection: (config: SshConnectionConfig) => Promise<void>;
  sshDeleteSaved: (id: string) => Promise<void>;
  sshRefreshConnections: () => Promise<void>;
  sshPromptPassword: (config: SshConnectionConfig) => Promise<string | null>;
  sshResolvePassword: (password: string | null) => void;
  sshStartForward: (
    connectionId: string,
    localPort: number,
    remotePort: number,
    remoteHost?: string,
  ) => Promise<void>;
  sshStopForward: (forwardId: string) => Promise<void>;
  sshRefreshForwards: () => Promise<void>;
}

export const createSshSlice: StateCreator<SshSlice, [], [], SshSlice> = (set, get) => ({
  activeConnectionId: null,
  activeConnections: [],
  savedConnections: [],
  activeForwards: [],
  sshConnecting: false,
  sshError: null,
  passwordPrompt: null,

  sshConnect: async (config, password) => {
    set({ sshConnecting: true, sshError: null });
    try {
      const conn = await ssh.connect(config, password);
      set((s) => ({
        activeConnections: [...s.activeConnections.filter((c) => c.id !== conn.id), conn],
        activeConnectionId: conn.id,
        sshConnecting: false,
      }));
    } catch (e) {
      set({ sshError: String(e), sshConnecting: false });
      throw e;
    }
  },

  sshDisconnect: async (connectionId) => {
    try {
      await ssh.disconnect(connectionId);
    } catch {
      // ignore — may already be disconnected
    }
    set((s) => ({
      activeConnections: s.activeConnections.filter((c) => c.id !== connectionId),
      activeConnectionId: s.activeConnectionId === connectionId ? null : s.activeConnectionId,
    }));
  },

  sshSetActive: (connectionId) => set({ activeConnectionId: connectionId }),

  sshLoadSaved: async () => {
    try {
      const saved = await ssh.savedConnections.list();
      set({ savedConnections: saved });
    } catch (e) {
      console.error("[SSH] load saved:", e);
    }
  },

  sshSaveConnection: async (config) => {
    await ssh.savedConnections.save(config);
    await get().sshLoadSaved();
  },

  sshDeleteSaved: async (id) => {
    await ssh.savedConnections.delete(id);
    set((s) => ({
      savedConnections: s.savedConnections.filter((c) => c.id !== id),
    }));
  },

  sshRefreshConnections: async () => {
    try {
      const conns = await ssh.listConnections();
      set({ activeConnections: conns });
    } catch (e) {
      console.error("[SSH] refresh connections:", e);
    }
  },

  sshPromptPassword: (config) => {
    // Cancel any existing pending prompt first
    get().sshResolvePassword(null);

    return new Promise<string | null>((resolve) => {
      // Safety timeout — resolve null after 5 minutes
      const timeoutId = setTimeout(
        () => {
          if (get().passwordPrompt) {
            set({ passwordPrompt: null });
            resolve(null);
          }
        },
        5 * 60 * 1000,
      );

      set({
        passwordPrompt: {
          username: config.username,
          host: config.host,
          port: config.port,
          authMethod: config.authMethod,
          resolve: (pw) => {
            clearTimeout(timeoutId);
            resolve(pw);
          },
        },
      });
    });
  },

  sshResolvePassword: (password) => {
    const prompt = get().passwordPrompt;
    if (prompt) {
      prompt.resolve(password);
      set({ passwordPrompt: null });
    }
  },

  sshStartForward: async (connectionId, localPort, remotePort, remoteHost) => {
    await ssh.startForward(connectionId, localPort, remotePort, remoteHost);
    await get().sshRefreshForwards();
  },

  sshStopForward: async (forwardId) => {
    await ssh.stopForward(forwardId);
    set((s) => ({
      activeForwards: s.activeForwards.filter((f) => f.id !== forwardId),
    }));
  },

  sshRefreshForwards: async () => {
    try {
      const forwards = await ssh.listForwards();
      set({ activeForwards: forwards });
    } catch (e) {
      console.error("[SSH] refresh forwards:", e);
    }
  },
});
