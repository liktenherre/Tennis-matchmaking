// Redirects the root URL to the correct stage of the player journey.

import { Redirect } from 'expo-router';
import { use, useEffect, useState } from 'react';
import { consumePendingFreeInviteRoute } from '@/lib/clip-session';
import { SessionContext } from '@/providers/session-provider';

export default function IndexRoute() {
  const { session, isLoading, isOnboarded } = use(SessionContext);
  const [pendingWindowId, setPendingWindowId] = useState<string | null | undefined>(
    undefined,
  );

  // Prefer a Free invite deep link left by the App Clip over the default Free tab.
  useEffect(() => {
    void consumePendingFreeInviteRoute().then(setPendingWindowId);
  }, []);

  if (isLoading || pendingWindowId === undefined) return null;
  if (pendingWindowId) {
    return <Redirect href={{ pathname: '/f/[windowId]', params: { windowId: pendingWindowId } }} />;
  }
  if (!session) return <Redirect href="/welcome" />;
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  return <Redirect href="/free" />;
}
