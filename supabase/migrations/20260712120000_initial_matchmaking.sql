-- Creates the secure matchmaking, chat, safety, and geospatial data model.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.tennis_level as enum ('beginner', 'intermediate', 'advanced', 'competition');
create type public.match_format as enum ('singles', 'doubles', 'either');
create type public.match_status as enum ('active', 'unmatched', 'blocked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 40),
  birth_year integer not null check (birth_year between 1900 and extract(year from now())::integer - 18),
  bio text not null default '' check (char_length(bio) <= 180),
  gender text not null default 'prefer_not_to_say' check (
    gender in ('woman', 'man', 'non_binary', 'prefer_not_to_say')
  ),
  level public.tennis_level not null,
  formats public.match_format[] not null default '{either}',
  city text not null,
  photo_path text,
  notifications_enabled boolean not null default false,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (photo_path is null or photo_path like id::text || '/%')
);

create table public.locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  city text not null,
  approximate_point extensions.geography(point, 4326),
  updated_at timestamptz not null default now()
);

create index locations_approximate_point_idx
  on public.locations using gist (approximate_point);

create table public.court_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  court_name text not null check (char_length(court_name) between 2 and 100),
  primary key (user_id, court_name)
);

create table public.availability_slots (
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot text not null check (
    slot in ('weekday_morning', 'weekday_evening', 'weekend_morning', 'weekend_afternoon')
  ),
  primary key (user_id, slot)
);

create table public.discovery_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  maximum_distance_km integer not null default 25 check (maximum_distance_km between 2 and 100),
  minimum_age integer not null default 18 check (minimum_age between 18 and 99),
  maximum_age integer not null default 70 check (maximum_age between 18 and 99),
  levels public.tennis_level[] not null default enum_range(null::public.tennis_level),
  preferred_format public.match_format not null default 'either',
  availability text[] not null default '{}',
  gender_preference text not null default 'everyone' check (
    gender_preference in ('women', 'men', 'everyone')
  ),
  updated_at timestamptz not null default now(),
  check (minimum_age <= maximum_age)
);

create table public.swipes (
  swiper_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);

create index swipes_target_liked_idx on public.swipes (target_id, liked);

create table public.matches (
  id uuid primary key default extensions.gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status public.match_status not null default 'active',
  matched_at timestamptz not null default now(),
  ended_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index matches_user_a_idx on public.matches (user_a, status);
create index matches_user_b_idx on public.matches (user_b, status);

create table public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  client_id text not null check (char_length(client_id) between 8 and 100),
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);

create index messages_match_created_idx on public.messages (match_id, created_at);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (
    reason in ('inappropriate_behaviour', 'spam', 'fake_profile', 'safety_concern', 'other')
  ),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reporter_id <> reported_user_id)
);

create table public.moderation_events (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  priority text not null check (priority in ('normal', 'urgent')),
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_impressions (
  viewer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, viewed_id),
  check (viewer_id <> viewed_id)
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references public.profiles(id) on delete set null,
  name text not null check (
    name in (
      'onboarding_completed',
      'discovery_loaded',
      'match_created',
      'first_message_sent',
      'user_blocked',
      'user_reported',
      'operation_failed'
    )
  ),
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (not (properties ?| array['message', 'phone', 'latitude', 'longitude', 'exact_location']))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.discovery_preferences
for each row execute function public.set_updated_at();
create trigger tokens_set_updated_at before update on public.push_tokens
for each row execute function public.set_updated_at();

create or replace function public.enforce_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) >= 100
    from public.messages
    where sender_id = auth.uid()
      and created_at > now() - interval '1 hour'
  ) then
    raise exception 'Message limit reached. Try again later.';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit before insert on public.messages
for each row execute function public.enforce_message_rate_limit();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.court_preferences enable row level security;
alter table public.availability_slots enable row level security;
alter table public.discovery_preferences enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_events enable row level security;
alter table public.push_tokens enable row level security;
alter table public.profile_impressions enable row level security;
alter table public.analytics_events enable row level security;

create or replace function public.is_blocked_pair(other_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_user_id = other_user_id)
       or (blocker_id = other_user_id and blocked_user_id = auth.uid())
  );
$$;

create policy "Players can view themselves and active matches"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or (
    onboarding_completed_at is not null
    and not public.is_blocked_pair(profiles.id)
    and exists (
      select 1 from public.matches
      where matches.status = 'active'
        and (
          (matches.user_a = auth.uid() and matches.user_b = profiles.id)
          or (matches.user_b = auth.uid() and matches.user_a = profiles.id)
        )
    )
  )
);
create policy "Players create their own profile"
on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Players update their own profile"
on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Players manage their own location"
on public.locations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Players manage their own courts"
on public.court_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Players manage their own availability"
on public.availability_slots for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Players manage their own discovery preferences"
on public.discovery_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Players can see only their outgoing swipes"
on public.swipes for select to authenticated using (swiper_id = auth.uid());
create policy "Players can create only their own swipes"
on public.swipes for insert to authenticated with check (swiper_id = auth.uid());
create policy "Players can remove only their own passes"
on public.swipes for delete to authenticated using (swiper_id = auth.uid() and liked = false);

create policy "Participants can view their matches"
on public.matches for select to authenticated using (auth.uid() in (user_a, user_b));

create policy "Participants can view active match messages"
on public.messages for select to authenticated using (
  exists (
    select 1 from public.matches
    where matches.id = messages.match_id
      and matches.status = 'active'
      and auth.uid() in (matches.user_a, matches.user_b)
  )
);
create policy "Participants can send active match messages"
on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches
    where matches.id = messages.match_id
      and matches.status = 'active'
      and auth.uid() in (matches.user_a, matches.user_b)
  )
);

create policy "Players can view their blocks"
on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "Players can block for themselves"
on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "Players can unblock for themselves"
on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create policy "Reports are write-only to the reporter"
on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Players manage their own push tokens"
on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Players manage their own impressions"
on public.profile_impressions for all to authenticated using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());
create policy "Players can emit privacy-safe analytics"
on public.analytics_events for insert to authenticated with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Players upload their own profile photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players update their own profile photos"
on storage.objects for update to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Players delete their own profile photos"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.discover_profiles(
  maximum_distance_km integer,
  minimum_age integer,
  maximum_age integer,
  preferred_levels public.tennis_level[],
  preferred_format public.match_format,
  preferred_availability text[],
  preferred_gender text
)
returns table (
  id uuid,
  first_name text,
  age integer,
  city text,
  distance_km numeric,
  level public.tennis_level,
  gender text,
  formats public.match_format[],
  availability text[],
  court_names text[],
  bio text,
  photo_path text
)
language sql
security definer
stable
set search_path = ''
as $$
  with me as (
    select l.approximate_point, l.city
    from public.locations l
    where l.user_id = auth.uid()
  ),
  candidates as (
    select
      p.id,
      p.first_name,
      extract(year from now())::integer - p.birth_year as age,
      p.city,
      case
        when l.approximate_point is not null and me.approximate_point is not null
          then extensions.st_distance(l.approximate_point, me.approximate_point) / 1000
        when l.city = me.city then 5
        else 50
      end as distance_km,
      p.level,
      p.gender,
      p.formats,
      coalesce(array_agg(distinct a.slot) filter (where a.slot is not null), '{}') as availability,
      coalesce(array_agg(distinct c.court_name) filter (where c.court_name is not null), '{}') as court_names,
      p.bio,
      p.photo_path
    from public.profiles p
    join public.locations l on l.user_id = p.id
    cross join me
    left join public.availability_slots a on a.user_id = p.id
    left join public.court_preferences c on c.user_id = p.id
    where p.id <> auth.uid()
      and p.onboarding_completed_at is not null
      and p.level = any(preferred_levels)
      and (
        preferred_gender = 'everyone'
        or (preferred_gender = 'women' and p.gender = 'woman')
        or (preferred_gender = 'men' and p.gender = 'man')
      )
      and (preferred_format = 'either' or preferred_format = any(p.formats) or 'either' = any(p.formats))
      and not exists (
        select 1 from public.swipes s
        where s.swiper_id = auth.uid() and s.target_id = p.id
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_user_id = p.id)
           or (b.blocker_id = p.id and b.blocked_user_id = auth.uid())
      )
    group by p.id, l.approximate_point, me.approximate_point, me.city
  )
  select
    candidates.id,
    candidates.first_name,
    candidates.age,
    candidates.city,
    round(candidates.distance_km::numeric, 1),
    candidates.level,
    candidates.gender,
    candidates.formats,
    candidates.availability,
    candidates.court_names,
    candidates.bio,
    candidates.photo_path
  from candidates
  where candidates.age between minimum_age and maximum_age
    and candidates.distance_km <= maximum_distance_km
    and (
      cardinality(preferred_availability) = 0
      or candidates.availability && preferred_availability
    )
  order by candidates.distance_km asc, candidates.id
  limit 50;
$$;

create or replace function public.record_swipe(target_user_id uuid, liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  low_user uuid;
  high_user uuid;
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

  low_user := least(auth.uid(), target_user_id);
  high_user := greatest(auth.uid(), target_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(low_user::text || ':' || high_user::text, 0)
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

  insert into public.matches (user_a, user_b)
  values (low_user, high_user)
  on conflict (user_a, user_b) do update
    set status = 'active', matched_at = now(), ended_at = null
  returning id into created_match_id;

  return jsonb_build_object('matched', true, 'match_id', created_match_id);
end;
$$;

create or replace function public.list_my_matches()
returns table (
  id uuid,
  other_user_id uuid,
  first_name text,
  photo_path text,
  last_message text,
  last_message_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    m.id,
    other_profile.id,
    other_profile.first_name,
    other_profile.photo_path,
    latest.body,
    latest.created_at
  from public.matches m
  join public.profiles other_profile
    on other_profile.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join lateral (
    select body, created_at
    from public.messages
    where match_id = m.id
    order by created_at desc
    limit 1
  ) latest on true
  where auth.uid() in (m.user_a, m.user_b)
    and m.status = 'active'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_user_id = other_profile.id)
         or (b.blocker_id = other_profile.id and b.blocked_user_id = auth.uid())
    )
  order by coalesce(latest.created_at, m.matched_at) desc;
$$;

create or replace function public.unmatch(match_id_input uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.matches
  set status = 'unmatched', ended_at = now()
  where id = match_id_input
    and auth.uid() in (user_a, user_b);

  delete from public.swipes
  where exists (
    select 1
    from public.matches
    where matches.id = match_id_input
      and auth.uid() in (matches.user_a, matches.user_b)
      and (
        (swipes.swiper_id = matches.user_a and swipes.target_id = matches.user_b)
        or (swipes.swiper_id = matches.user_b and swipes.target_id = matches.user_a)
      )
  );
$$;

create or replace function public.end_matches_after_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.matches
  set status = 'blocked', ended_at = now()
  where status = 'active'
    and user_a = least(new.blocker_id, new.blocked_user_id)
    and user_b = greatest(new.blocker_id, new.blocked_user_id);
  return new;
end;
$$;

create trigger blocks_end_matches after insert on public.blocks
for each row execute function public.end_matches_after_block();

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from storage.objects
  where bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;

create or replace function public.complete_onboarding(
  first_name_input text,
  birth_year_input integer,
  bio_input text,
  gender_input text,
  level_input public.tennis_level,
  formats_input public.match_format[],
  city_input text,
  longitude_input double precision,
  latitude_input double precision,
  photo_path_input text,
  court_names_input text[],
  availability_input text[],
  maximum_distance_input integer,
  minimum_age_input integer,
  maximum_age_input integer,
  gender_preference_input text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.profiles (
    id, first_name, birth_year, bio, gender, level, formats, city, photo_path,
    onboarding_completed_at
  )
  values (
    auth.uid(), first_name_input, birth_year_input, bio_input, gender_input, level_input,
    formats_input, city_input, photo_path_input, null
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    birth_year = excluded.birth_year,
    bio = excluded.bio,
    gender = excluded.gender,
    level = excluded.level,
    formats = excluded.formats,
    city = excluded.city,
    photo_path = excluded.photo_path,
    onboarding_completed_at = null;

  insert into public.locations (user_id, city, approximate_point)
  values (
    auth.uid(),
    city_input,
    case
      when longitude_input is not null and latitude_input is not null
        then extensions.st_setsrid(
          extensions.st_makepoint(longitude_input, latitude_input),
          4326
        )::extensions.geography
      else null
    end
  )
  on conflict (user_id) do update set
    city = excluded.city,
    approximate_point = excluded.approximate_point;

  insert into public.discovery_preferences (
    user_id, maximum_distance_km, minimum_age, maximum_age, levels,
    preferred_format, availability, gender_preference
  )
  values (
    auth.uid(), maximum_distance_input, minimum_age_input, maximum_age_input,
    array[level_input], 'either', availability_input, gender_preference_input
  )
  on conflict (user_id) do update set
    maximum_distance_km = excluded.maximum_distance_km,
    minimum_age = excluded.minimum_age,
    maximum_age = excluded.maximum_age,
    levels = excluded.levels,
    preferred_format = excluded.preferred_format,
    availability = excluded.availability,
    gender_preference = excluded.gender_preference;

  delete from public.availability_slots where user_id = auth.uid();
  insert into public.availability_slots (user_id, slot)
  select auth.uid(), slot from unnest(availability_input) slot;

  delete from public.court_preferences where user_id = auth.uid();
  insert into public.court_preferences (user_id, court_name)
  select auth.uid(), court_name from unnest(court_names_input) court_name;

  update public.profiles
  set onboarding_completed_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.register_push_token(token_input text, platform_input text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if platform_input not in ('ios', 'android') then raise exception 'Invalid platform'; end if;

  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), token_input, platform_input)
  on conflict (token) do update set
    user_id = auth.uid(),
    platform = excluded.platform,
    updated_at = now();
end;
$$;

create or replace function public.revoke_push_token(token_input text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens
  where token = token_input and user_id = auth.uid();
$$;

grant execute on function public.discover_profiles(integer, integer, integer, public.tennis_level[], public.match_format, text[], text) to authenticated;
grant execute on function public.is_blocked_pair(uuid) to authenticated;
grant execute on function public.record_swipe(uuid, boolean) to authenticated;
grant execute on function public.list_my_matches() to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.complete_onboarding(text, integer, text, text, public.tennis_level, public.match_format[], text, double precision, double precision, text, text[], text[], integer, integer, integer, text) to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.revoke_push_token(text) to authenticated;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.messages;
