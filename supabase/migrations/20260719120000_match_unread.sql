-- Per-user match read state and unread counts for the matches list.

create table public.match_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index match_reads_match_id_idx on public.match_reads (match_id);

alter table public.match_reads enable row level security;

create policy "Players manage their own match reads"
on public.match_reads for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant all on table public.match_reads to anon, authenticated, service_role;

create or replace function public.mark_match_read(match_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1
    from public.matches
    where id = match_id_input
      and status = 'active'
      and auth.uid() in (user_a, user_b)
  ) then
    raise exception 'Match not found'
      using errcode = 'P0001', hint = 'Only active match participants can mark a conversation read.';
  end if;

  insert into public.match_reads (user_id, match_id, last_read_at)
  values (auth.uid(), match_id_input, now())
  on conflict (user_id, match_id) do update
    set last_read_at = excluded.last_read_at;
end;
$$;

drop function if exists public.list_my_matches();

create function public.list_my_matches()
returns table (
  id uuid,
  other_user_id uuid,
  first_name text,
  photo_path text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer
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
    latest.created_at,
    greatest(
      (
        select count(*)::integer
        from public.messages msg
        where msg.match_id = m.id
          and msg.sender_id <> auth.uid()
          and (mr.last_read_at is null or msg.created_at > mr.last_read_at)
      ),
      case when mr.last_read_at is null then 1 else 0 end
    ) as unread_count
  from public.matches m
  join public.profiles other_profile
    on other_profile.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join public.match_reads mr
    on mr.match_id = m.id and mr.user_id = auth.uid()
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

grant execute on function public.list_my_matches() to authenticated;
grant execute on function public.mark_match_read(uuid) to authenticated;
