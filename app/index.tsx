// Redirects the root URL to the correct stage of the player journey.

import { Redirect } from 'expo-router';
import { use } from 'react';
import { SessionContext } from '@/providers/session-provider';

export default function IndexRoute() {
  const { session, isLoading, isOnboarded } = use(SessionContext);

  if (isLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  return <Redirect href="/discover" />;
}
