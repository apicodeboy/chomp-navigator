import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Tracks whether the user is signed in to a *real* account.
 *
 * The app uses anonymous auth (see `ensureAuth`) so navigation works without a
 * login wall. An anonymous session is NOT a real account — `is_anonymous` is
 * true. Customization (non-default characters and map styles) is gated on a real
 * account, so this returns `false` for both "no session" and "anonymous".
 */
export function useAuthAccount(): { signedIn: boolean; loading: boolean } {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    const evaluate = (session: { user?: { is_anonymous?: boolean } } | null) => {
      const real = !!session?.user && session.user.is_anonymous !== true;
      if (active) {
        setSignedIn(real);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => evaluate(session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { signedIn, loading };
}
