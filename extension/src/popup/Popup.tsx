import React, { useEffect, useState } from "react";
import { supabase } from "@ext/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function Popup() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (data.session?.access_token) {
        chrome.storage.local.set({ vto_auth_token: data.session.access_token });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        chrome.storage.local.set({ vto_auth_token: session.access_token });
      } else {
        chrome.storage.local.remove("vto_auth_token");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setRequests([]); return; }
    supabase
      .from("tryon_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRequests(data ?? []));
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const fn = authMode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    chrome.storage.local.remove(["vto_auth_token"]);
  };

  if (loading) {
    return (
      <div className="w-[380px] min-h-[420px] p-5 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-[380px] min-h-[420px] p-5 flex flex-col">
        {/* Logo */}
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-xl font-bold tracking-tight">VTO</span>
          <span className="text-[11px] text-muted-foreground font-medium">v1.0</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Virtual Try-On</p>

        {/* Auth form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-2">
          <input
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-shadow"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {authError && (
            <p className="text-xs text-destructive">{authError}</p>
          )}
          <button
            type="submit"
            className="mt-1 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            {authMode === "login" ? "Sign In" : "Sign Up"}
          </button>
          <button
            type="button"
            className="bg-transparent border-none text-muted-foreground text-xs text-center underline cursor-pointer"
            onClick={() => setAuthMode(m => m === "login" ? "signup" : "login")}
          >
            {authMode === "login" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-auto pt-5">
          We may earn affiliate commission from purchases.
        </p>
      </div>
    );
  }

  return (
    <div className="w-[380px] min-h-[420px] p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">VTO</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
        </div>
        <button
          className="bg-transparent border-none text-muted-foreground text-xs font-medium px-2 py-1 cursor-pointer hover:text-foreground transition-colors rounded"
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>

      <div className="h-px bg-border my-3" />

      {/* Showroom link */}
      <a
        href={`${import.meta.env.VITE_APP_URL || "https://ddsasdkse.lovable.app"}/showroom`}
        target="_blank"
        rel="noopener"
        className="block px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm text-center no-underline hover:opacity-90 transition-opacity"
      >
        Open Showroom ↗
      </a>

      <div className="h-px bg-border my-3" />

      {/* Recent try-ons */}
      <h2 className="text-sm font-semibold tracking-tight mb-2">Recent Try-Ons</h2>

      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No try-ons yet. Visit a product page and click "Try On"!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map(r => (
            <div
              key={r.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border"
            >
              {r.result_image_url && (
                <img
                  src={r.result_image_url}
                  alt="Result"
                  className="w-11 h-11 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title || "Untitled"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      r.status === "completed" ? "bg-success" : "bg-muted-foreground/40"
                    }`}
                  />
                  {r.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 text-center mt-auto pt-5">
        We may earn affiliate commission from purchases.
      </p>
    </div>
  );
}
