-- Availability Broadcast: Free windows, interests, played sessions, RPC-only DTOs.

-- Contingency table (soft Nice city gate is default; switch list filter if flooded).
create table public.beta_invitees (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  invited_at timestamptz not null default now(),
  note text
);

alter table public.beta_invitees enable row level security;
-- No authenticated policies: service-role / founder SQL only.

create table public.free_windows (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  court_names text[] not null default '{}',
  area_label text not null default '',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '24 hours'),
  check (char_length(area_label) <= 80)
);

create index free_windows_active_idx
  on public.free_windows (user_id, ends_at)
  where cancelled_at is null;

create table public.free_interests (
  window_id uuid not null references public.free_windows(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (window_id, from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index free_interests_inbound_idx
  on public.free_interests (window_id, to_user_id, created_at desc);

create table public.match_sessions (
  match_id uuid primary key references public.matches(id) on delete cascade,
  confirmed_by uuid[] not null default '{}',
  played_at timestamptz,
  founder_mediated boolean not null default false,
  source_window_id uuid references public.free_windows(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.free_windows enable row level security;
alter table public.free_interests enable row level security;
alter table public.match_sessions enable row level security;

-- Own-row only; stranger Free data is RPC-only (mirrors discover_profiles).
create policy "Players manage their own free windows"
on public.free_windows for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Players see interests they sent or received"
on public.free_interests for select to authenticated
using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "Players insert their own outbound interests"
on public.free_interests for insert to authenticated
with check (from_user_id = auth.uid());

create policy "Participants can view their match sessions"
on public.match_sessions for select to authenticated
using (
  exists (
    select 1 from public.matches
    where matches.id = match_sessions.match_id
      and auth.uid() in (matches.user_a, matches.user_b)
  )
);

-- Expand analytics allowlist for Free funnel + played.
alter table public.analytics_events drop constraint if exists analytics_events_name_check;
alter table public.analytics_events add constraint analytics_events_name_check check (
  name in (
    'onboarding_completed',
    'discovery_loaded',
    'match_created',
    'first_message_sent',
    'user_blocked',
    'user_reported',
    'operation_failed',
    'free_posted',
    'interest_expressed',
    'session_confirmed',
    'played'
  )
);

create or replace function public.paris_free_preset_bounds(preset text)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
set search_path = ''
as $$
declare
  local_today date;
  start_local timestamp;
  end_local timestamp;
begin
  local_today := (timezone('Europe/Paris', now()))::date;

  if preset = 'today_am' then
    start_local := local_today + time '08:00';
    end_local := local_today + time '12:00';
  elsif preset = 'today_pm' then
    start_local := local_today + time '14:00';
    end_local := local_today + time '20:00';
  elsif preset = 'tomorrow_am' then
    start_local := (local_today + 1) + time '08:00';
    end_local := (local_today + 1) + time '12:00';
  elsif preset = 'tomorrow_pm' then
    start_local := (local_today + 1) + time '14:00';
    end_local := (local_today + 1) + time '20:00';
  else
    raise exception 'Unknown Free preset'
      using errcode = 'P0001',
            hint = 'Use today_am, today_pm, tomorrow_am, tomorrow_pm, or custom bounds.';
  end if;

  starts_at := timezone('Europe/Paris', start_local);
  ends_at := timezone('Europe/Paris', end_local);
  return next;
end;
$$;

create or replace function public.ensure_active_match(user_x uuid, user_y uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  low_user uuid;
  high_user uuid;
  created_match_id uuid;
begin
  if user_x is null or user_y is null or user_x = user_y then
    raise exception 'Invalid match pair'
      using errcode = 'P0001',
            hint = 'Both users must be distinct authenticated profiles.';
  end if;

  low_user := least(user_x, user_y);
  high_user := greatest(user_x, user_y);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(low_user::text || ':' || high_user::text, 0)
  );

  insert into public.matches (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do update
    set status = 'active', matched_at = now(), ended_at = null
  returning id into created_match_id;

  return created_match_id;
end;
$$;

create or replace function public.record_swipe(target_user_id uuid, liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_match_id uuid;
begin
  if auth.uid() is null or target_user_id = auth.uid() then
    raise exception 'Invalid swipe';
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_user_id = target_user_id)
       or (blocker_id = target_user_id and blocked_user_id = auth.uid())
  ) then
    raise exception 'Profile unavailable';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(auth.uid(), target_user_id)::text || ':' || greatest(auth.uid(), target_user_id)::text,
      0
    )
  );

  if (
    select count(*) >= 500 from public.swipes
    where swiper_id = auth.uid() and created_at > now() - interval '1 day'
  ) then
    raise exception 'Daily swipe limit reached';
  end if;

  insert into public.profile_impressions (viewer_id, viewed_id)
  values (auth.uid(), target_user_id)
  on conflict (viewer_id, viewed_id) do nothing;

  insert into public.swipes (swiper_id, target_id, liked)
  values (auth.uid(), target_user_id, liked)
  on conflict (swiper_id, target_id) do nothing;

  if not liked or not exists (
    select 1 from public.swipes
    where swiper_id = target_user_id and target_id = auth.uid() and swipes.liked
  ) then
    return jsonb_build_object('matched', false, 'match_id', null);
  end if;

  created_match_id := public.ensure_active_match(auth.uid(), target_user_id);

  return jsonb_build_object('matched', true, 'match_id', created_match_id);
end;
$$;

create or replace function public.post_free_window(
  preset text,
  starts_at_input timestamptz,
  ends_at_input timestamptz,
  area_label_input text
)
returns public.free_windows
language plpgsql
security definer
set search_path = ''
as $$
declare
  bounds record;
  window_starts timestamptz;
  window_ends timestamptz;
  courts text[];
  new_window public.free_windows;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001',
            hint = 'Sign in before posting a Free window.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and onboarding_completed_at is not null
  ) then
    raise exception 'Complete onboarding first'
      using errcode = 'P0001',
            hint = 'Finish profile setup, then post Free.';
  end if;

  if preset is not null and preset <> 'custom' then
    select * into bounds from public.paris_free_preset_bounds(preset);
    window_starts := bounds.starts_at;
    window_ends := bounds.ends_at;
  else
    if starts_at_input is null or ends_at_input is null then
      raise exception 'Custom Free window needs start and end'
        using errcode = 'P0001',
              hint = 'Provide starts_at and ends_at, or choose a Paris preset.';
    end if;
    window_starts := starts_at_input;
    window_ends := ends_at_input;
  end if;

  if window_ends <= window_starts then
    raise exception 'Free window end must be after start'
      using errcode = 'P0001',
            hint = 'Pick a later end time.';
  end if;

  if window_ends > window_starts + interval '24 hours' then
    raise exception 'Free window cannot exceed 24 hours'
      using errcode = 'P0001',
            hint = 'Shorten the window to 24 hours or less.';
  end if;

  if window_ends <= now() then
    raise exception 'Free window already ended'
      using errcode = 'P0001',
            hint = 'Choose a future or current window.';
  end if;

  select coalesce(array_agg(court_name order by court_name), '{}')
  into courts
  from public.court_preferences
  where user_id = auth.uid();

  update public.free_windows
  set cancelled_at = now()
  where user_id = auth.uid()
    and cancelled_at is null
    and ends_at > now();

  insert into public.free_windows (
    user_id, starts_at, ends_at, court_names, area_label
  )
  values (
    auth.uid(),
    window_starts,
    window_ends,
    courts,
    coalesce(nullif(trim(area_label_input), ''), '')
  )
  returning * into new_window;

  return new_window;
end;
$$;

create or replace function public.cancel_free_window()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  update public.free_windows
  set cancelled_at = now()
  where user_id = auth.uid()
    and cancelled_at is null
    and ends_at > now();
end;
$$;

create or replace function public.get_my_free_window()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  my_window public.free_windows;
  inbound jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into my_window
  from public.free_windows
  where user_id = auth.uid()
    and cancelled_at is null
    and ends_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('window', null, 'inbound', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'from_user_id', fi.from_user_id,
      'first_name', p.first_name,
      'level', p.level,
      'formats', p.formats,
      'created_at', fi.created_at,
      'accepted', exists (
        select 1 from public.free_interests back
        where back.window_id = fi.window_id
          and back.from_user_id = auth.uid()
          and back.to_user_id = fi.from_user_id
      )
    )
    order by fi.created_at asc
  ), '[]'::jsonb)
  into inbound
  from public.free_interests fi
  join public.profiles p on p.id = fi.from_user_id
  where fi.window_id = my_window.id
    and fi.to_user_id = auth.uid()
    and not public.is_blocked_pair(fi.from_user_id);

  return jsonb_build_object(
    'window', jsonb_build_object(
      'id', my_window.id,
      'starts_at', my_window.starts_at,
      'ends_at', my_window.ends_at,
      'court_names', my_window.court_names,
      'area_label', my_window.area_label,
      'created_at', my_window.created_at
    ),
    'inbound', inbound
  );
end;
$$;

create or replace function public.list_free_nearby()
returns table (
  window_id uuid,
  user_id uuid,
  first_name text,
  distance_km numeric,
  level public.tennis_level,
  formats public.match_format[],
  starts_at timestamptz,
  ends_at timestamptz,
  area_label text,
  court_names text[],
  overlap_minutes integer,
  shared_court_count integer,
  interested boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  viewer_city text;
  viewer_point extensions.geography;
  viewer_levels public.tennis_level[];
  viewer_format public.match_format;
  viewer_window public.free_windows;
  use_invite_gate boolean;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select p.city, l.approximate_point, dp.levels, dp.preferred_format
  into viewer_city, viewer_point, viewer_levels, viewer_format
  from public.profiles p
  join public.locations l on l.user_id = p.id
  left join public.discovery_preferences dp on dp.user_id = p.id
  where p.id = auth.uid();

  if viewer_city is null then
    raise exception 'Complete onboarding first'
      using errcode = 'P0001',
            hint = 'Add your city before browsing Free.';
  end if;

  use_invite_gate := exists (select 1 from public.beta_invitees limit 1);

  if use_invite_gate then
    if not exists (select 1 from public.beta_invitees where user_id = auth.uid()) then
      return;
    end if;
  elsif lower(trim(viewer_city)) <> 'nice' then
    -- Soft Nice gate week 1: empty board for wrong city (copy handled client-side).
    return;
  end if;

  select * into viewer_window
  from public.free_windows
  where free_windows.user_id = auth.uid()
    and cancelled_at is null
    and ends_at > now()
  order by created_at desc
  limit 1;

  return query
  with candidates as (
    select
      fw.id as window_id,
      fw.user_id,
      p.first_name,
      case
        when l.approximate_point is not null and viewer_point is not null
          then extensions.st_distance(l.approximate_point, viewer_point) / 1000
        when l.city = viewer_city then 5
        else 50
      end as distance_km,
      p.level,
      p.formats,
      fw.starts_at,
      fw.ends_at,
      fw.area_label,
      fw.court_names,
      case
        when viewer_window.id is not null then
          greatest(
            0,
            floor(
              extract(
                epoch from (
                  least(fw.ends_at, viewer_window.ends_at)
                  - greatest(fw.starts_at, viewer_window.starts_at)
                )
              ) / 60
            )::integer
          )
        else 0
      end as overlap_minutes,
      (
        select count(*)::integer
        from unnest(fw.court_names) as poster_court(court_name)
        join public.court_preferences cp
          on cp.user_id = auth.uid() and cp.court_name = poster_court.court_name
      ) as shared_court_count,
      exists (
        select 1 from public.free_interests fi
        where fi.window_id = fw.id
          and fi.from_user_id = auth.uid()
          and fi.to_user_id = fw.user_id
      ) as interested
    from public.free_windows fw
    join public.profiles p on p.id = fw.user_id
    join public.locations l on l.user_id = p.id
    where fw.cancelled_at is null
      and fw.ends_at > now()
      and fw.user_id <> auth.uid()
      and p.onboarding_completed_at is not null
      and (
        use_invite_gate
        or lower(trim(p.city)) = 'nice'
      )
      and (
        not use_invite_gate
        or exists (select 1 from public.beta_invitees bi where bi.user_id = p.id)
      )
      and p.level = any(coalesce(viewer_levels, enum_range(null::public.tennis_level)))
      and (
        coalesce(viewer_format, 'either') = 'either'
        or coalesce(viewer_format, 'either') = any(p.formats)
        or 'either' = any(p.formats)
      )
      and not public.is_blocked_pair(fw.user_id)
  )
  select
    candidates.window_id,
    candidates.user_id,
    candidates.first_name,
    round(candidates.distance_km::numeric, 1),
    candidates.level,
    candidates.formats,
    candidates.starts_at,
    candidates.ends_at,
    candidates.area_label,
    -- Prefer area on cards; still return court snapshot for overlap hints (no coords/phone).
    candidates.court_names,
    candidates.overlap_minutes,
    candidates.shared_court_count,
    candidates.interested
  from candidates
  where candidates.distance_km <= 15
  order by
    case when viewer_window.id is not null then candidates.overlap_minutes else 0 end desc,
    candidates.distance_km asc,
    candidates.shared_court_count desc,
    candidates.ends_at asc
  limit 50;
end;
$$;

create or replace function public.express_free_interest(window_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_window public.free_windows;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into target_window
  from public.free_windows
  where id = window_id_input
    and cancelled_at is null
    and ends_at > now();

  if target_window.id is null then
    raise exception 'Free window unavailable'
      using errcode = 'P0001',
            hint = 'It may have expired or been cancelled.';
  end if;

  if target_window.user_id = auth.uid() then
    raise exception 'Cannot express interest on your own window'
      using errcode = 'P0001',
            hint = 'Wait for inbound Interested taps instead.';
  end if;

  if public.is_blocked_pair(target_window.user_id) then
    raise exception 'Profile unavailable';
  end if;

  insert into public.free_interests (window_id, from_user_id, to_user_id)
  values (target_window.id, auth.uid(), target_window.user_id)
  on conflict do nothing;
end;
$$;

create or replace function public.accept_free_interest(
  window_id_input uuid,
  from_user_id_input uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_window public.free_windows;
  created_match_id uuid;
  other_name text;
  other_level public.tennis_level;
  seed_body text;
  window_label text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into my_window
  from public.free_windows
  where id = window_id_input
    and user_id = auth.uid()
    and cancelled_at is null
    and ends_at > now();

  if my_window.id is null then
    raise exception 'Free window unavailable'
      using errcode = 'P0001',
            hint = 'Repost Free before accepting.';
  end if;

  if not exists (
    select 1 from public.free_interests
    where window_id = my_window.id
      and from_user_id = from_user_id_input
      and to_user_id = auth.uid()
  ) then
    raise exception 'No inbound interest to accept'
      using errcode = 'P0001',
            hint = 'Interest may have been withdrawn.';
  end if;

  if public.is_blocked_pair(from_user_id_input) then
    raise exception 'Profile unavailable';
  end if;

  insert into public.free_interests (window_id, from_user_id, to_user_id)
  values (my_window.id, auth.uid(), from_user_id_input)
  on conflict do nothing;

  created_match_id := public.ensure_active_match(auth.uid(), from_user_id_input);

  insert into public.match_sessions (match_id, source_window_id)
  values (created_match_id, my_window.id)
  on conflict (match_id) do update
    set source_window_id = coalesce(match_sessions.source_window_id, excluded.source_window_id),
        updated_at = now();

  select first_name, level into other_name, other_level
  from public.profiles where id = from_user_id_input;

  window_label := to_char(timezone('Europe/Paris', my_window.starts_at), 'HH24:MI')
    || '–'
    || to_char(timezone('Europe/Paris', my_window.ends_at), 'HH24:MI');

  seed_body := trim(both from format(
    'Free match · %s · %s%s · %s / %s',
    window_label,
    case when my_window.area_label <> '' then my_window.area_label || ' · ' else '' end,
    case
      when cardinality(my_window.court_names) > 0
        then array_to_string(my_window.court_names[1:2], ', ')
      else 'courts TBD'
    end,
    (select level::text from public.profiles where id = auth.uid()),
    other_level::text
  ));

  insert into public.messages (match_id, sender_id, body, client_id)
  values (
    created_match_id,
    auth.uid(),
    seed_body,
    'free-seed-' || created_match_id::text || '-' || my_window.id::text
  )
  on conflict (sender_id, client_id) do nothing;

  return jsonb_build_object(
    'matched', true,
    'match_id', created_match_id,
    'other_first_name', other_name
  );
end;
$$;

create or replace function public.confirm_played(match_id_input uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.match_sessions;
  is_participant boolean;
  next_confirmed uuid[];
  just_played boolean := false;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select exists (
    select 1 from public.matches
    where id = match_id_input
      and status = 'active'
      and auth.uid() in (user_a, user_b)
  ) into is_participant;

  if not is_participant then
    raise exception 'Not a match participant'
      using errcode = 'P0001',
            hint = 'Only the two players in the match can confirm played.';
  end if;

  insert into public.match_sessions (match_id, confirmed_by, founder_mediated)
  values (match_id_input, array[auth.uid()], false)
  on conflict (match_id) do update
    set confirmed_by = case
          when auth.uid() = any(match_sessions.confirmed_by) then match_sessions.confirmed_by
          else array_append(match_sessions.confirmed_by, auth.uid())
        end,
        updated_at = now()
  returning * into session_row;

  -- Re-read after upsert for cardinality.
  select * into session_row from public.match_sessions where match_id = match_id_input;
  next_confirmed := session_row.confirmed_by;

  if session_row.played_at is null and cardinality(next_confirmed) >= 2 then
    update public.match_sessions
    set played_at = now(), updated_at = now()
    where match_id = match_id_input
    returning * into session_row;
    just_played := true;
  end if;

  return jsonb_build_object(
    'match_id', match_id_input,
    'confirmed_by', to_jsonb(session_row.confirmed_by),
    'played_at', session_row.played_at,
    'founder_mediated', session_row.founder_mediated,
    'just_played', just_played
  );
end;
$$;

create or replace function public.get_match_session(match_id_input uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  session_row public.match_sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1 from public.matches
    where id = match_id_input and auth.uid() in (user_a, user_b)
  ) then
    raise exception 'Not a match participant';
  end if;

  select * into session_row from public.match_sessions where match_id = match_id_input;

  if session_row.match_id is null then
    return jsonb_build_object(
      'match_id', match_id_input,
      'confirmed_by', '[]'::jsonb,
      'played_at', null,
      'founder_mediated', false,
      'i_confirmed', false
    );
  end if;

  return jsonb_build_object(
    'match_id', session_row.match_id,
    'confirmed_by', to_jsonb(session_row.confirmed_by),
    'played_at', session_row.played_at,
    'founder_mediated', session_row.founder_mediated,
    'i_confirmed', auth.uid() = any(session_row.confirmed_by)
  );
end;
$$;

-- Service-role helper for founder-mediated intros (never count toward ≥3 success).
create or replace function public.founder_mark_mediated(match_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role only';
  end if;

  insert into public.match_sessions (match_id, founder_mediated)
  values (match_id_input, true)
  on conflict (match_id) do update
    set founder_mediated = true, updated_at = now();
end;
$$;

create or replace function public.unmatch(match_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair record;
begin
  select user_a, user_b into pair
  from public.matches
  where id = match_id_input
    and auth.uid() in (user_a, user_b);

  if pair.user_a is null then
    return;
  end if;

  update public.matches
  set status = 'unmatched', ended_at = now()
  where id = match_id_input;

  delete from public.swipes
  where (swiper_id = pair.user_a and target_id = pair.user_b)
     or (swiper_id = pair.user_b and target_id = pair.user_a);

  delete from public.free_interests
  where (from_user_id = pair.user_a and to_user_id = pair.user_b)
     or (from_user_id = pair.user_b and to_user_id = pair.user_a);
end;
$$;

-- ensure_active_match is internal: called only by security-definer Free/swipe RPCs.
revoke all on function public.ensure_active_match(uuid, uuid) from public, anon, authenticated;
grant execute on function public.paris_free_preset_bounds(text) to authenticated;
grant execute on function public.post_free_window(text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.cancel_free_window() to authenticated;
grant execute on function public.get_my_free_window() to authenticated;
grant execute on function public.list_free_nearby() to authenticated;
grant execute on function public.express_free_interest(uuid) to authenticated;
grant execute on function public.accept_free_interest(uuid, uuid) to authenticated;
grant execute on function public.confirm_played(uuid) to authenticated;
grant execute on function public.get_match_session(uuid) to authenticated;
grant execute on function public.founder_mark_mediated(uuid) to service_role;

grant all on table public.free_windows to authenticated, service_role;
grant all on table public.free_interests to authenticated, service_role;
grant all on table public.match_sessions to authenticated, service_role;
grant all on table public.beta_invitees to service_role;
