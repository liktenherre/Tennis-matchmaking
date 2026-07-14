-- pgTAP coverage for Free broadcast RPCs, privacy, Accept→match, and confirm_played.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000011', 'alice-free@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'bob-free@example.test'),
  ('00000000-0000-0000-0000-000000000013', 'eve-free@example.test'),
  ('00000000-0000-0000-0000-000000000014', 'cannes-free@example.test');

insert into public.profiles (
  id, first_name, birth_year, gender, level, formats, city, onboarding_completed_at
)
values
  ('00000000-0000-0000-0000-000000000011', 'Alice', 1992, 'woman', 'intermediate', '{singles}', 'Nice', now()),
  ('00000000-0000-0000-0000-000000000012', 'Bob', 1990, 'man', 'intermediate', '{singles}', 'Nice', now()),
  ('00000000-0000-0000-0000-000000000013', 'Eve', 1991, 'woman', 'advanced', '{singles}', 'Nice', now()),
  ('00000000-0000-0000-0000-000000000014', 'Cara', 1993, 'woman', 'intermediate', '{singles}', 'Cannes', now());

insert into public.locations (user_id, city, approximate_point)
values
  ('00000000-0000-0000-0000-000000000011', 'Nice', 'POINT(7.2620 43.7102)'),
  ('00000000-0000-0000-0000-000000000012', 'Nice', 'POINT(7.2700 43.7050)'),
  ('00000000-0000-0000-0000-000000000013', 'Nice', 'POINT(7.2650 43.7080)'),
  ('00000000-0000-0000-0000-000000000014', 'Cannes', 'POINT(7.0174 43.5528)');

insert into public.discovery_preferences (user_id, levels, preferred_format)
values
  ('00000000-0000-0000-0000-000000000011', '{intermediate}', 'singles'),
  ('00000000-0000-0000-0000-000000000012', '{intermediate}', 'singles'),
  ('00000000-0000-0000-0000-000000000013', '{advanced}', 'singles'),
  ('00000000-0000-0000-0000-000000000014', '{intermediate}', 'singles');

insert into public.court_preferences (user_id, court_name)
values
  ('00000000-0000-0000-0000-000000000011', 'Magnan'),
  ('00000000-0000-0000-0000-000000000012', 'Magnan');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$ select public.post_free_window('today_pm', null, null, 'Magnan') $$,
  'Alice can post a Paris Today PM Free window'
);

select is(
  (select count(*)::integer from public.free_windows where user_id = '00000000-0000-0000-0000-000000000011' and cancelled_at is null),
  1,
  'One active Free window after post'
);

select public.post_free_window('tomorrow_am', null, null, 'Cessole');
select is(
  (select count(*)::integer from public.free_windows where user_id = '00000000-0000-0000-0000-000000000011' and cancelled_at is null and ends_at > now()),
  1,
  'Repost cancels previous active window'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select public.post_free_window('tomorrow_pm', null, null, 'Magnan');

select is(
  (select count(*)::integer from public.list_free_nearby()),
  1,
  'Bob sees Alice Free card within Nice + level filter'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', true);
select is(
  (select count(*)::integer from public.list_free_nearby()),
  0,
  'Cannes soft gate returns empty Free board'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select public.express_free_interest(
  (select id from public.free_windows where user_id = '00000000-0000-0000-0000-000000000011' and cancelled_at is null order by created_at desc limit 1)
);

select is(
  (select count(*)::integer from public.free_interests),
  1,
  'Interested creates outbound free_interests row'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select is(
  (public.accept_free_interest(
    (select id from public.free_windows where user_id = '00000000-0000-0000-0000-000000000011' and cancelled_at is null order by created_at desc limit 1),
    '00000000-0000-0000-0000-000000000012'
  )->>'matched')::boolean,
  true,
  'Accept creates mutual Free match'
);

select is((select count(*)::integer from public.matches where status = 'active'), 1, 'Exactly one active match');
select is(
  (select count(*)::integer from public.messages),
  1,
  'Accept seeds a context chat message'
);
select is(
  (select source_window_id is not null from public.match_sessions),
  true,
  'match_sessions links source_window_id'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select throws_ok(
  $$ select public.confirm_played((select id from public.matches limit 1)) $$,
  'P0001',
  null,
  'Non-participant cannot forge confirm_played'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select is(
  ((public.confirm_played((select id from public.matches limit 1))->>'played_at') is null),
  true,
  'First We played does not set played_at yet'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select ok(
  (public.confirm_played((select id from public.matches limit 1))->>'played_at') is not null,
  'Second We played sets played_at'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select public.unmatch((select id from public.matches limit 1));
select is(
  (select count(*)::integer from public.free_interests
   where (from_user_id = '00000000-0000-0000-0000-000000000011' and to_user_id = '00000000-0000-0000-0000-000000000012')
      or (from_user_id = '00000000-0000-0000-0000-000000000012' and to_user_id = '00000000-0000-0000-0000-000000000011')),
  0,
  'Unmatch clears pairwise free_interests'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select lives_ok(
  $$ select public.express_free_interest(
    (select id from public.free_windows where user_id = '00000000-0000-0000-0000-000000000011' and cancelled_at is null order by created_at desc limit 1)
  ) $$,
  'Re-interest allowed after unmatch'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
select is(
  (select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000011'),
  0,
  'Direct profile SELECT still hides strangers (Free does not widen RLS)'
);

select ok(
  (select starts_at < ends_at from public.paris_free_preset_bounds('today_am')),
  'Paris today_am bounds are ordered'
);

select * from finish();
rollback;
