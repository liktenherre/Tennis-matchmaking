-- Public-safe Free window invite card + short App Clip onboarding.

create or replace function public.get_free_window_invite(window_id_input uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'window_id', fw.id,
    'user_id', fw.user_id,
    'first_name', p.first_name,
    'level', p.level,
    'formats', p.formats,
    'starts_at', fw.starts_at,
    'ends_at', fw.ends_at,
    'area_label', fw.area_label,
    'court_names', fw.court_names
  )
  into result
  from public.free_windows fw
  join public.profiles p on p.id = fw.user_id
  where fw.id = window_id_input
    and fw.cancelled_at is null
    and fw.ends_at > now()
    and p.onboarding_completed_at is not null;

  if result is null then
    raise exception 'Free window unavailable'
      using errcode = 'P0001',
            hint = 'This invite expired or was cancelled.';
  end if;

  return result;
end;
$$;

revoke all on function public.get_free_window_invite(uuid) from public;
grant execute on function public.get_free_window_invite(uuid) to anon, authenticated;

-- Slim onboarding for App Clip: required fields + Nice defaults; full app can enrich later.
create or replace function public.complete_clip_onboarding(
  first_name_input text,
  birth_year_input integer,
  level_input public.tennis_level,
  formats_input public.match_format[] default '{either}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if char_length(trim(first_name_input)) < 2 or char_length(trim(first_name_input)) > 40 then
    raise exception 'Invalid first name'
      using errcode = 'P0001',
            hint = 'Use 2–40 characters.';
  end if;

  if birth_year_input < 1900
    or birth_year_input > extract(year from now())::integer - 18 then
    raise exception 'Invalid birth year'
      using errcode = 'P0001',
            hint = 'You must be at least 18.';
  end if;

  insert into public.profiles (
    id, first_name, birth_year, bio, gender, level, formats, city, photo_path,
    onboarding_completed_at
  )
  values (
    auth.uid(),
    trim(first_name_input),
    birth_year_input,
    '',
    'prefer_not_to_say',
    level_input,
    case
      when formats_input is null or cardinality(formats_input) = 0
        then '{either}'::public.match_format[]
      else formats_input
    end,
    'Nice',
    null,
    null
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    birth_year = excluded.birth_year,
    level = excluded.level,
    formats = excluded.formats,
    city = excluded.city,
    onboarding_completed_at = null;

  insert into public.locations (user_id, city, approximate_point)
  values (auth.uid(), 'Nice', null)
  on conflict (user_id) do update set
    city = excluded.city;

  insert into public.discovery_preferences (
    user_id, maximum_distance_km, minimum_age, maximum_age, levels,
    preferred_format, availability, gender_preference
  )
  values (
    auth.uid(),
    25,
    18,
    70,
    array[level_input],
    'either',
    '{}',
    'everyone'
  )
  on conflict (user_id) do update set
    levels = excluded.levels,
    preferred_format = excluded.preferred_format;

  update public.profiles
  set onboarding_completed_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.complete_clip_onboarding(text, integer, public.tennis_level, public.match_format[]) from public;
grant execute on function public.complete_clip_onboarding(text, integer, public.tennis_level, public.match_format[]) to authenticated;
