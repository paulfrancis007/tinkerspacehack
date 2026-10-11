begin;

create or replace function public.join_journey(
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
  v_expired boolean;
  v_profile record;
  v_normalized_mode text;
  v_normalized_operator text;
  v_normalized_number text;
  v_normalized_origin text;
  v_normalized_dest text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not private.consume_rate('join_journey', 5, 600) then
    raise exception 'Rate limit exceeded for joining journeys. Please wait.';
  end if;

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

  select * into v_profile from public.profiles where id = v_user_id;
  if not found then raise exception 'Profile not found'; end if;

  -- Ensure one active membership per user (auto-cleanup expired ones)
  select journey_id into v_active_membership 
  from public.memberships 
  where user_id = v_user_id and left_at is null
  for update;

  if v_active_membership is not null then
    select (ends_at < now()) into v_expired from public.journeys where id = v_active_membership;
    if v_expired then
      update public.memberships set left_at = now() where user_id = v_user_id and journey_id = v_active_membership;
    else
      raise exception 'You are already in an active journey. Leave it first.';
    end if;
  end if;

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

  select count(*) into v_member_count 
  from public.memberships 
  where journey_id = v_journey_id and left_at is null;

  if v_member_count >= 30 then
    raise exception 'Journey is full (30 members max)';
  end if;

  insert into public.memberships (
    journey_id, user_id, alias, avatar_seed, bio, interests,
    discoverable, lounge_consent, social_mode
  ) values (
    v_journey_id, v_user_id, v_profile.display_name, v_profile.avatar_seed, v_profile.bio, v_profile.interests,
    false, false, 'quiet'
  )
  on conflict (journey_id, user_id) 
  do update set left_at = null, discoverable = false, lounge_consent = false, social_mode = 'quiet';

  return v_journey_id;
end;
$$;

commit;
