begin;

create function public.join_journey(
  p_mode text,
  p_operator_code text,
  p_service_number text,
  p_service_date date,
  p_origin_code text,
  p_destination_code text,
  p_origin_label text,
  p_destination_label text,
  p_timezone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_journey_id uuid;
  v_member_count integer;
  v_active_membership uuid;
  v_profile record;
  v_normalized_mode text;
  v_normalized_operator text;
  v_normalized_number text;
  v_normalized_origin text;
  v_normalized_dest text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Rate limit (5 per 10 minutes = 600s)
  if not private.consume_rate('join_journey', 5, 600) then
    raise exception 'Rate limit exceeded for joining journeys. Please wait.';
  end if;

  -- Normalize inputs
  v_normalized_mode := lower(trim(p_mode));
  v_normalized_operator := upper(trim(p_operator_code));
  v_normalized_number := upper(trim(p_service_number));
  v_normalized_origin := upper(trim(p_origin_code));
  v_normalized_dest := upper(trim(p_destination_code));

  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '72 hours' then
    raise exception 'Invalid journey duration';
  end if;

  if p_ends_at <= now() then
    raise exception 'Cannot join a journey that has already ended';
  end if;

  -- Fetch user profile
  select * into v_profile from public.profiles where id = v_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;

  -- Ensure one active membership per user
  select journey_id into v_active_membership 
  from public.memberships 
  where user_id = v_user_id and left_at is null
  for update;

  if v_active_membership is not null then
    raise exception 'You are already in an active journey. Leave it first.';
  end if;

  -- Upsert journey (Do not rewrite times if it exists)
  insert into public.journeys (
    mode, operator_code, service_number, service_date,
    origin_code, destination_code, origin_label, destination_label,
    timezone, starts_at, ends_at, created_by
  ) values (
    v_normalized_mode, v_normalized_operator, v_normalized_number, p_service_date,
    v_normalized_origin, v_normalized_dest, trim(p_origin_label), trim(p_destination_label),
    trim(p_timezone), p_starts_at, p_ends_at, v_user_id
  )
  on conflict (mode, operator_code, service_number, service_date, origin_code, destination_code)
  do update set created_at = public.journeys.created_at
  returning id into v_journey_id;

  -- Check cap (30 members max)
  select count(*) into v_member_count 
  from public.memberships 
  where journey_id = v_journey_id and left_at is null;

  if v_member_count >= 30 then
    raise exception 'Journey is full (30 members max)';
  end if;

  -- Insert membership (default discovery off, quiet mode)
  insert into public.memberships (
    journey_id, user_id, alias, avatar_seed, bio, interests,
    discoverable, lounge_consent, social_mode
  ) values (
    v_journey_id, v_user_id, v_profile.display_name, v_profile.avatar_seed,
    v_profile.bio, v_profile.interests, false, false, 'quiet'
  )
  on conflict (journey_id, user_id)
  do update set 
    left_at = null,
    last_seen_at = now(),
    alias = excluded.alias,
    avatar_seed = excluded.avatar_seed,
    bio = excluded.bio,
    interests = excluded.interests;

  -- Add points for joining (Phase 11 spec, adding it safely here)
  insert into public.score_events (journey_id, user_id, kind, source_id, points)
  values (v_journey_id, v_user_id, 'join', v_journey_id, 5)
  on conflict (user_id, kind, source_id) do nothing;

  return v_journey_id;
end;
$$;

create function public.update_membership(
  p_journey_id uuid,
  p_discoverable boolean,
  p_lounge_consent boolean,
  p_social_mode text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if p_social_mode not in ('chat','game','quiet') then
    raise exception 'Invalid social mode';
  end if;

  update public.memberships
  set 
    discoverable = p_discoverable,
    lounge_consent = p_lounge_consent,
    social_mode = p_social_mode,
    last_seen_at = now()
  where journey_id = p_journey_id 
    and user_id = v_user_id
    and left_at is null;

  if not found then
    raise exception 'Active membership not found';
  end if;
end;
$$;

create function public.leave_journey(p_journey_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.memberships
  set left_at = now()
  where journey_id = p_journey_id 
    and user_id = v_user_id
    and left_at is null;
end;
$$;

create function public.heartbeat(p_journey_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then return; end if;

  update public.memberships
  set last_seen_at = now()
  where journey_id = p_journey_id 
    and user_id = v_user_id
    and left_at is null;
end;
$$;

revoke all on function public.join_journey from public, anon;
grant execute on function public.join_journey to authenticated;

revoke all on function public.update_membership from public, anon;
grant execute on function public.update_membership to authenticated;

revoke all on function public.leave_journey from public, anon;
grant execute on function public.leave_journey to authenticated;

revoke all on function public.heartbeat from public, anon;
grant execute on function public.heartbeat to authenticated;

-- Enable Realtime publication for memberships
alter publication supabase_realtime add table public.memberships;

commit;
