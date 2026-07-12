// Notifies the private moderation channel when a high-risk safety report arrives.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ReportWebhook = {
  type: 'INSERT';
  table: 'reports';
  record: {
    id: string;
    reason: string;
    created_at: string;
  };
};

Deno.serve(async (request) => {
  const webhookSecret = Deno.env.get('DATABASE_WEBHOOK_SECRET');
  if (!webhookSecret || request.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await request.json()) as ReportWebhook;
  if (payload.table !== 'reports') return Response.json({ accepted: false });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await admin.from('moderation_events').insert({
    report_id: payload.record.id,
    priority: payload.record.reason === 'safety_concern' ? 'urgent' : 'normal',
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ accepted: true });
});
