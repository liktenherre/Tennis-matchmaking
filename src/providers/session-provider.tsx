// Exposes authentication and onboarding state to protected Expo Router routes.

import type { Session } from '@supabase/supabase-js';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { importClipSessionIfNeeded } from '@/lib/clip-session';
import { supabase } from '@/lib/supabase';

type SessionState = {
  session: Session | null;
  isLoading: boolean;
  isOnboarded: boolean;
  profileError: string;
  refreshProfile: () => Promise<void>;
};

export const SessionContext = createContext<SessionState>({
  session: null,
  isLoading: true,
  isOnboarded: false,
  profileError: '',
  refreshProfile: async () => undefined,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [profileError, setProfileError] = useState('');

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) {
      setIsOnboarded(false);
      setProfileError('');
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    setProfileError('');
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      setProfileError(error.message);
      setIsProfileLoading(false);
      return;
    }

    setIsOnboarded(Boolean(data?.onboarding_completed_at));
    setIsProfileLoading(false);
  }, [session]);

  useEffect(() => {
    let mounted = true;

    // Import App Clip App Group tokens (if any), then hydrate the local session.
    void (async () => {
      await importClipSessionIfNeeded();
      if (!mounted) return;

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setIsAuthLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsProfileLoading(Boolean(nextSession));
      if (!nextSession) {
        setIsOnboarded(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      session,
      isLoading: isAuthLoading || isProfileLoading,
      isOnboarded,
      profileError,
      refreshProfile,
    }),
    [session, isAuthLoading, isProfileLoading, isOnboarded, profileError, refreshProfile],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
