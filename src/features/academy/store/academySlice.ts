// ── Academy Slice ────────────────────────────────────────────────────────────
// Manages app mode switching and optional Academy/Feed authentication.

import type { StateCreator } from "zustand";
import type { AppMode } from "@shared/lib/types";
import type { Session, User } from "@shared/lib/supabase";
import {
  getSession,
  signInWithEmail,
  signInWithOAuth as oauthSignIn,
  signOut as authSignOut,
} from "@shared/lib/supabase";
import { open } from "@tauri-apps/plugin-shell";

// ── Types ────────────────────────────────────────────────

export interface AcademySlice {
  // Mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Auth (optional)
  academyUser: User | null;
  academySession: Session | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "github" | "google") => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;

  // WebView state
  academyWebviewReady: boolean;
  setAcademyWebviewReady: (ready: boolean) => void;
}

// ── Slice ────────────────────────────────────────────────

export const createAcademySlice: StateCreator<AcademySlice, [], [], AcademySlice> = (set) => ({
  // Mode
  appMode: "developer",
  setAppMode: (mode) => set({ appMode: mode }),

  // Auth
  academyUser: null,
  academySession: null,
  isAuthenticated: false,
  authLoading: false,
  authError: null,

  signIn: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        set({ authLoading: false, authError: error.message });
        return;
      }
      const { session, user } = await getSession();
      set({
        academyUser: user,
        academySession: session,
        isAuthenticated: !!session,
        authLoading: false,
      });
    } catch (e) {
      set({ authLoading: false, authError: String(e) });
    }
  },

  signInWithOAuth: async (provider) => {
    set({ authLoading: true, authError: null });
    try {
      const { url, error } = await oauthSignIn(provider);
      if (error) {
        set({ authLoading: false, authError: error.message });
        return;
      }
      if (url) {
        await open(url); // Opens in external browser
      }
      // Auth will complete via deep link callback
      set({ authLoading: false });
    } catch (e) {
      set({ authLoading: false, authError: String(e) });
    }
  },

  signOut: async () => {
    await authSignOut();
    set({
      academyUser: null,
      academySession: null,
      isAuthenticated: false,
      authError: null,
    });
  },

  loadSession: async () => {
    try {
      const { session, user } = await getSession();
      set({
        academyUser: user,
        academySession: session,
        isAuthenticated: !!session,
      });
    } catch {
      // Auth is optional — silently fail
    }
  },

  // WebView
  academyWebviewReady: false,
  setAcademyWebviewReady: (ready) => set({ academyWebviewReady: ready }),
});
