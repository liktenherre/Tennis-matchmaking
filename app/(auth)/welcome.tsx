// Animated Broadcast Scoreboard first screen before phone sign-in.

import { router } from 'expo-router';
import { useCallback, useRef } from 'react';
import { WelcomeIntro } from '@/components/welcome-intro';

export default function WelcomeScreen() {
  const navigated = useRef(false);

  const continueToSignIn = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace('/sign-in');
  }, []);

  return <WelcomeIntro onContinue={continueToSignIn} />;
}
