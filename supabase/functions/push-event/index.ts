// Sends privacy-safe Expo notifications for new matches and messages from database webhooks.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE';
  table: 'matches' | 'messages';
  record: Record<string, string>;
  old_record?: Record<string, string>;
};

Deno.serve(async (request) => {
  const webhookSecret = Deno.env.get('DATABASE_WEBHOOK_SECRET');
  if (!webhookSecret || request.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await request.json()) as WebhookPayload;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let recipientIds: string[] = [];
  let notificationKind: 'match' | 'message' = 'message';
  let data: Record<string, string> = {};

  if (payload.table === 'matches') {
    if (
      payload.record.status !== 'active' ||
      (payload.type === 'UPDATE' && payload.old_record?.status === 'active')
    ) {
      return Response.json({ sent: 0 });
    }
    recipientIds = [payload.record.user_a, payload.record.user_b];
    notificationKind = 'match';
    data = { type: 'match', matchId: payload.record.id };
  } else {
    if (payload.type !== 'INSERT') return Response.json({ sent: 0 });
    const { data: match } = await admin
      .from('matches')
      .select('user_a, user_b')
      .eq('id', payload.record.match_id)
      .eq('status', 'active')
      .single();
    if (!match) return Response.json({ sent: 0 });
    recipientIds = [match.user_a, match.user_b].filter(
      (id) => id !== payload.record.sender_id,
    );
    notificationKind = 'message';
    data = { type: 'message', matchId: payload.record.match_id };
  }

  const { data: recipients } = await admin
    .from('profiles')
    .select('id, locale')
    .in('id', recipientIds)
    .eq('notifications_enabled', true);
  const locales = new Map((recipients ?? []).map(({ id, locale }) => [id, locale]));
  if (locales.size === 0) return Response.json({ sent: 0 });

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', [...locales.keys()]);

  const copy = {
    fr: {
      match: ["C'est un match !", 'Proposez un court et une heure pour jouer.'],
      message: ['Nouveau message', 'Votre partenaire de tennis vous a écrit.'],
    },
    en: {
      match: ["It's a match!", 'Suggest a court and time to play.'],
      message: ['New message', 'Your tennis partner sent you a message.'],
    },
  } as const;

  const messages = (tokens ?? []).map(({ user_id, token }) => {
    const locale = locales.get(user_id) === 'en' ? 'en' : 'fr';
    const [title, body] = copy[locale][notificationKind];
    return { to: token, title, body, data, sound: 'default' };
  });

  if (messages.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  }

  return Response.json({ sent: messages.length });
});
