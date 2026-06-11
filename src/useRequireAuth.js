import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Protect a private page. Checks for a Supabase session on mount; if there's no
// session, it redirects to /login. Returns { session, loading } so the page can
// avoid flashing content before the check finishes.
//
// Usage in any private page:
//   const { loading } = useRequireAuth();
//   if (loading) return null;        // (or a spinner)
//   ...render the protected content
export function useRequireAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        window.location.assign("/login"); // no session → go to login
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    // Also react to sign-out / token loss while the page is open.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!s) window.location.assign("/login");
      else setSession(s);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
