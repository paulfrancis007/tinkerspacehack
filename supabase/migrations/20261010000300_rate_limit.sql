begin;

create function private.consume_rate(
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_window_start timestamptz;
  v_allowed boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  -- Calculate fixed window start based on epoch
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into private.rate_windows (user_id, action, window_start, count)
  values (v_user_id, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
  do update set count = rate_windows.count + 1
  where rate_windows.count < p_limit
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function private.consume_rate(text, integer, integer) from public, anon, authenticated;

comment on function private.consume_rate is 'Shared private atomic rate-limit helper. Intended quotas: journey joins 5/10 min; connections 5/10 min; messages 20/min and 200/hour; reactions 30/min; call invites 3/5 min; token issuance 10/min; game invites 5/10 min; moves 30/min; Drops 3/10 min; reports 5/hour.';

commit;
