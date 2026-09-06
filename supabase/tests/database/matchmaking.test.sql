-- Exercises RLS, mutual matching, blocking, and authorized chat at the database boundary.
-- Counts are scoped to fixture users so supabase/seed.sql players do not inflate results.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'alice@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'eve@example.test');

insert into public.profiles (
  id, first_name, birth_year, gender, level, formats, city, onboarding_completed_at
)
values
  ('00000000-0000-0000-0000-000000000001', 'Alice', 1992, 'woman', 'intermediate', '{singles}', 'Nice', now()),
  ('00000000-0000-0000-0000-000000000002', 'Bob', 1990, 'man', 'intermediate', '{singles}', 'Nice', now()),
  ('00000000-0000-0000-0000-000000000003', 'Eve', 1991, 'woman', 'advanced', '{singles}', 'Cannes', now());

insert into public.locations (user_id, city, approximate_point)
values
  ('00000000-0000-0000-0000-000000000001', 'Nice', 'POINT(7.2620 43.7102)'),
  ('00000000-0000-0000-0000-000000000002', 'Nice', 'POINT(7.2700 43.7050)'),
  ('00000000-0000-0000-0000-000000000003', 'Cannes', 'POINT(7.0174 43.5528)');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::integer from public.discover_profiles(
    25, 18, 70, '{intermediate}', 'singles', '{}', 'everyone'
  ) candidate
  where candidate.id in (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  )),
  1,
  'Discovery returns only a compatible nearby player'
);

select is(
  (public.record_swipe('00000000-0000-0000-0000-000000000002', true)->>'matched')::boolean,
  false,
  'First one-sided like remains private'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (public.record_swipe('00000000-0000-0000-0000-000000000001', true)->>'matched')::boolean,
  true,
  'Reciprocal like creates a match'
);
select is((select count(*)::integer from public.matches), 1, 'Mutual matching is unique');

insert into public.messages (match_id, body, client_id)
select id, 'On joue samedi ?', 'test-message-bob'
from public.matches;
select is((select count(*)::integer from public.messages), 1, 'A participant can send a message');

select public.unmatch((select id from public.matches));
select is((select count(*)::integer from public.swipes), 0, 'Unmatching consumes both likes');
select is(
  (select status::text from public.matches),
  'unmatched',
  'Unmatching closes the existing match'
);
select is(
  (public.record_swipe('00000000-0000-0000-0000-000000000001', true)->>'matched')::boolean,
  false,
  'One fresh like cannot reactivate an unmatched pair'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select public.record_swipe('00000000-0000-0000-0000-000000000002', true);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.messages), 0, 'A non-participant cannot read chat');
select is(
  (select count(*)::integer from public.profiles),
  1,
  'Direct profile queries expose only self without an active match'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
insert into public.blocks (blocked_user_id)
values ('00000000-0000-0000-0000-000000000002');
select is(
  (select status::text from public.matches),
  'blocked',
  'Blocking immediately closes the active match'
);
select is(
  (select count(*)::integer from public.profiles where id = '00000000-0000-0000-0000-000000000002'),
  0,
  'Blocked profiles disappear in both directions'
);

select * from finish();
rollback;
