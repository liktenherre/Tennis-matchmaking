-- Fix list_free_nearby: RETURNS TABLE(ends_at ...) made bare ends_at ambiguous.

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
    return;
  end if;

  select * into viewer_window
  from public.free_windows
  where free_windows.user_id = auth.uid()
    and free_windows.cancelled_at is null
    and free_windows.ends_at > now()
  order by free_windows.created_at desc
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
