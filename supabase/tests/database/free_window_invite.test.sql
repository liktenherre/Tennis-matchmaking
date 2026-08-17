-- pgTAP coverage for App Clip Free invite card + short onboarding RPCs.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000021', 'poster-invite@example.test'),
  ('00000000-0000-0000-0000-000000000022', 'clip-user@example.test');

insert into public.profiles (
  id, first_name, birth_year, gender, level, formats, city, onboarding_completed_at
)
values
  (
    '00000000-0000-0000-0000-000000000021',
    'Pat',
    1991,
    'man',
    'intermediate',
    '{singles}',
    'Nice',
    now()
  );

insert into public.locations (user_id, city, approximate_point)
values
  ('00000000-0000-0000-0000-000000000021', 'Nice', 'POINT(7.2620 43.7102)');

insert into public.discovery_preferences (user_id, levels, preferred_format)
values
  ('00000000-0000-0000-0000-000000000021', '{intermediate}', 'singles');

insert into public.free_windows (id, user_id, starts_at, ends_at, court_names, area_label)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000021',
  now() + interval '1 hour',
  now() + interval '4 hours',
  '{Magnan}',
  'Magnan'
);

insert into public.free_windows (id, user_id, starts_at, ends_at, court_names, area_label, cancelled_at)
values (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000021',
  now() + interval '1 hour',
  now() + interval '4 hours',
  '{}',
  'Cessole',
  now()
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

select is(
  (public.get_free_window_invite('10000000-0000-0000-0000-000000000001')->>'first_name'),
  'Pat',
  'Anon can load active Free invite card'
);

select is(
  (public.get_free_window_invite('10000000-0000-0000-0000-000000000001') ? 'phone'),
  false,
  'Invite card never exposes phone'
);

select throws_ok(
  $$ select public.get_free_window_invite('10000000-0000-0000-0000-000000000002') $$,
  'P0001',
  'Free window unavailable',
  'Cancelled window is not invite-able'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.complete_clip_onboarding('Sam', 1994, 'intermediate', '{singles}') $$,
  'Clip user can complete short onboarding'
);

select is(
  (select city from public.profiles where id = '00000000-0000-0000-0000-000000000022'),
  'Nice',
  'Clip onboarding defaults city to Nice'
);

select ok(
  (select onboarding_completed_at is not null
   from public.profiles
   where id = '00000000-0000-0000-0000-000000000022'),
  'Clip onboarding sets onboarding_completed_at'
);

select lives_ok(
  $$ select public.express_free_interest('10000000-0000-0000-0000-000000000001') $$,
  'Clip-onboarded user can express interest'
);

select is(
  (select count(*)::integer from public.free_interests
   where window_id = '10000000-0000-0000-0000-000000000001'
     and from_user_id = '00000000-0000-0000-0000-000000000022'),
  1,
  'Interest row created after clip onboarding'
);

select * from finish();
rollback;
