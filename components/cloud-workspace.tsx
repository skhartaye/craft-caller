"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  createClient,
  type SupabaseClient,
  type Session,
} from "@supabase/supabase-js";
import type { Service } from "../lib/studio";
type Config = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  aiConfigured: boolean;
  liveCallingEnabled: false;
};
export type CloudService = {
  id: string;
  document: Omit<Service, "id" | "archived">;
  archived: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};
type Cloud = {
  config: Config | null;
  loading: boolean;
  session: Session | null;
  client: SupabaseClient | null;
  error: string;
  request: <T>(path: string, body?: unknown) => Promise<T>;
};
const Context = createContext<Cloud | null>(null);
export function CloudProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null),
    [loading, setLoading] = useState(true),
    [session, setSession] = useState<Session | null>(null),
    [client, setClient] = useState<SupabaseClient | null>(null),
    [error, setError] = useState("");
  const clientRef = useRef<SupabaseClient | null>(null);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    fetch("/.netlify/functions/runtime-config", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((c: Config) => {
        if (cancelled) return;
        setConfig(c);
        if (c.supabaseUrl && c.supabaseAnonKey) {
          const db = createClient(c.supabaseUrl, c.supabaseAnonKey);
          clientRef.current = db;
          setClient(db);
          const { data } = db.auth.onAuthStateChange((_event, s) => {
            if (!cancelled) setSession(s);
          });
          unsubscribe = () => data.subscription.unsubscribe();
          db.auth.getSession().then(({ data }) => {
            if (!cancelled) setSession(data.session);
          });
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Cloud backend is unavailable on this preview. Browser drafts still work.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const db = clientRef.current;
    if (!db) throw Error("Cloud storage is not configured.");
    const { data } = await db.auth.getSession();
    if (!data.session) throw Error("Sign in to use cloud services.");
    const r = await fetch(`/.netlify/functions/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "Request failed. Try again.");
    const current = await db.auth.getSession();
    if (current.data.session?.user.id !== data.session.user.id)
      throw Error("Your account changed. Reopen the cloud workspace.");
    return result as T;
  }
  return (
    <Context.Provider
      value={{ config, loading, session, client, error, request }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCloud() {
  const cloud = useContext(Context);
  if (!cloud) throw Error("Cloud provider missing");
  return cloud;
}
export function CloudAccount() {
  const cloud = useCloud();
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="panel cloud-account">
      <div className="section-head">
        <h2>Cloud workspace</h2>
        <span className="pill">
          {cloud.loading
            ? "Checking…"
            : cloud.session
              ? "Signed in"
              : cloud.client
                ? "Sign in available"
                : "Not configured"}
        </span>
      </div>
      {cloud.loading ? (
        <p role="status">Checking the server connection…</p>
      ) : cloud.session ? (
        <>
          <p>
            Signed in as <strong>{cloud.session.user.email}</strong>.
          </p>
          <p className="callout">
            Browser drafts and cloud services stay separate. Save a cloud copy
            explicitly; use a cloud service for AI practice.
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { error } = await cloud.client!.auth.signOut();
              setMessage(
                error ? "Could not sign out. Try again." : "Signed out.",
              );
              setBusy(false);
            }}
          >
            Sign out
          </button>
        </>
      ) : cloud.client ? (
        <form
          aria-label={
            createAccount
              ? "Create cloud account"
              : "Sign in to cloud workspace"
          }
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              const { error } = createAccount
                ? await cloud.client!.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.origin },
                  })
                : await cloud.client!.auth.signInWithPassword({
                    email,
                    password,
                  });
              if (error) throw error;
              setPassword("");
              setMessage(
                createAccount
                  ? "Check your email to confirm your account, then sign in here."
                  : "Signed in. Open your cloud workspace to load your services.",
              );
            } catch {
              setMessage(
                createAccount
                  ? "Could not create the account. Use a strong password and a valid email, or try again later."
                  : "Could not sign in. Check your email and password, or confirm your email first.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="cloud-email">Email</label>
            <input
              id="cloud-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cloud-password">Password</label>
            <input
              id="cloud-password"
              name="password"
              type="password"
              autoComplete={createAccount ? "new-password" : "current-password"}
              minLength={createAccount ? 8 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : createAccount
                ? "Create account"
                : "Sign in"}
          </button>
          <button
            type="button"
            className="textbtn"
            disabled={busy}
            onClick={() => {
              setCreateAccount(!createAccount);
              setPassword("");
              setMessage("");
            }}
            style={{ marginLeft: 16 }}
          >
            {createAccount
              ? "Already have an account? Sign in"
              : "Create an account"}
          </button>
        </form>
      ) : (
        <p className="callout">
          {cloud.error ||
            "Connect the Supabase project on the server to enable sign-in and private cloud storage. Your browser drafts remain available."}
        </p>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
