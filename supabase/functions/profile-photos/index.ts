// Returns short-lived private photo URLs only for self, active matches, or current candidates.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return new Response('Unauthorized', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return new Response('Unauthorized', { status: 401 });

  const requested = ((await request.json()) as { profileIds?: string[] }).profileIds ?? [];
  const requestedIds = [...new Set(requested)].slice(0, 50);
  if (requestedIds.length === 0) return Response.json({ urls: {} });

  const allowed = new Set<string>([userData.user.id]);
  const { data: matches } = await admin
    .from('matches')
    .select('user_a, user_b')
    .eq('status', 'active')
    .or(`user_a.eq.${userData.user.id},user_b.eq.${userData.user.id}`);
  for (const match of matches ?? []) {
    allowed.add(match.user_a === userData.user.id ? match.user_b : match.user_a);
  }

  const { data: preferences } = await userClient
    .from('discovery_preferences')
    .select('*')
    .maybeSingle();
  if (preferences) {
    const { data: candidates } = await userClient.rpc('discover_profiles', {
      maximum_distance_km: preferences.maximum_distance_km,
      minimum_age: preferences.minimum_age,
      maximum_age: preferences.maximum_age,
      preferred_levels: preferences.levels,
      preferred_format: preferences.preferred_format,
      preferred_availability: preferences.availability,
      preferred_gender: preferences.gender_preference,
    });
    for (const candidate of candidates ?? []) allowed.add(candidate.id);
  }

  const authorizedIds = requestedIds.filter((id) => allowed.has(id));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, photo_path')
    .in('id', authorizedIds)
    .not('photo_path', 'is', null);

  const entries = await Promise.all(
    (profiles ?? [])
      .filter(({ id, photo_path }) => photo_path.startsWith(`${id}/`))
      .map(async ({ id, photo_path }) => {
      const { data } = await admin.storage.from('profile-photos').createSignedUrl(photo_path, 60);
      return [id, data?.signedUrl ?? null] as const;
      }),
  );

  return Response.json({ urls: Object.fromEntries(entries) });
});
