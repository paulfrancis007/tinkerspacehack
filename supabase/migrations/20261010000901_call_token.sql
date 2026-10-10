begin;

create function public.get_call_token_payload(p_call_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_call record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not private.consume_rate('token_issuance', 10, 60) then
    raise exception 'Rate limit exceeded for token issuance';
  end if;

  select * into v_call from public.calls where id = p_call_id;
  if not found then raise exception 'Call not found'; end if;

  if v_user_id not in (v_call.caller_id, v_call.callee_id) then
    raise exception 'Unauthorized';
  end if;

  if v_call.status not in ('accepted', 'active') then
    raise exception 'Call is not active';
  end if;

  return jsonb_build_object(
    'room_name', v_call.room_name,
    'kind', v_call.kind
  );
end;
$$;

revoke all on function public.get_call_token_payload from public, anon;
grant execute on function public.get_call_token_payload to authenticated;

commit;
