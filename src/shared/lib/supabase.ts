// ── Supabase Client ──────────────────────────────────────────────────────────
// Optional auth for Academy/Feed. Uses db.settings for session persistence.

import { createClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants";
import { db } from "./tauri";

// Custom storage adapter — persists Supabase session in SQLite via Tauri
// Sentinel value — getItem returns null when it sees this
const REMOVED = "__removed__";

const storageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await db.settings.get(`supabase_${key}`);
      if (!value || value === REMOVED) return null;
      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await db.settings.set(`supabase_${key}`, value);
    } catch {
      // Silently fail — auth is optional
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await db.settings.set(`supabase_${key}`, REMOVED);
    } catch {
      // Silently fail
    }
  },
};

// Guard: Supabase SDK throws on empty URL — gracefully degrade in tests/dev
export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // We handle deep links manually
      },
    })
  : (null as unknown as ReturnType<typeof createClient>);

export async function getSession(): Promise<{ session: Session | null; user: User | null }> {
  if (!supabase) return { session: null, user: null };
  const { data } = await supabase.auth.getSession();
  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
}

export function signInWithEmail(email: string, password: string) {
  if (!supabase) return Promise.resolve({ data: { session: null, user: null }, error: null });
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(provider: "github" | "google") {
  if (!supabase) return { url: null, error: null };
  // Generate OAuth URL — user opens it in external browser
  // Supabase PKCE flow handles state/verifier internally
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      skipBrowserRedirect: true,
      redirectTo: "https://kodiq.ai/auth/desktop-callback",
      queryParams: {
        // Force PKCE flow — prevents auth code interception
        flow_type: "pkce",
      },
    },
  });
  return { url: data?.url ?? null, error };
}

export function signOut() {
  if (!supabase) return Promise.resolve({ error: null });
  return supabase.auth.signOut();
}

export type { Session, User };
