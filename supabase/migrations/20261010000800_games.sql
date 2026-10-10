begin;

alter table public.games add column client_nonce uuid;
alter table public.games add constraint games_nonce_unique unique(x_id, client_nonce);

create function public.invite_game(p_conversation_id uuid, p_nonce uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_conv record;
  v_o_id uuid;
  v_game_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not private.consume_rate('game_invite', 5, 600) then
    raise exception 'Rate limit exceeded for game invitations';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or v_conv.status != 'accepted' then
    raise exception 'Must have an active conversation to invite';
  end if;

  if v_user_id not in (v_conv.user_a, v_conv.user_b) then
    raise exception 'Unauthorized';
  end if;

  if private.blocked(v_conv.user_a, v_conv.user_b) then
    raise exception 'Cannot interact with this user';
  end if;

  v_o_id := case when v_conv.user_a = v_user_id then v_conv.user_b else v_conv.user_a end;

  if exists (
    select 1 from public.games 
    where conversation_id = p_conversation_id 
      and status in ('invited', 'active') 
      and expires_at > now()
  ) then
    select id into v_game_id from public.games where x_id = v_user_id and client_nonce = p_nonce;
    if found then
      return v_game_id;
    else
      raise exception 'A game is already active or pending in this conversation';
    end if;
  end if;

  insert into public.games (conversation_id, journey_id, x_id, o_id, status, turn_id, expires_at, client_nonce)
  values (p_conversation_id, v_conv.journey_id, v_user_id, v_o_id, 'invited', v_user_id, now() + interval '60 seconds', p_nonce)
  on conflict (x_id, client_nonce) do update set updated_at = now()
  returning id into v_game_id;

  return v_game_id;
end;
$$;

create function public.respond_game(p_game_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_game record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'Game not found'; end if;

  if v_game.o_id != v_user_id then
    raise exception 'Only the recipient can respond to this invite';
  end if;

  if v_game.status != 'invited' or v_game.expires_at < now() then
    if v_game.status = 'active' and p_accept then return; end if;
    if v_game.status in ('declined','abandoned') and not p_accept then return; end if;
    raise exception 'Invite is expired or already processed';
  end if;

  if p_accept then
    update public.games set status = 'active', expires_at = now() + interval '5 minutes' where id = p_game_id;
  else
    update public.games set status = 'declined', finished_at = now() where id = p_game_id;
  end if;
end;
$$;

create function public.abandon_game(p_game_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.games 
  set status = 'abandoned', finished_at = now() 
  where id = p_game_id 
    and status in ('invited', 'active') 
    and v_user_id in (x_id, o_id);
end;
$$;

create function public.play_move(p_game_id uuid, p_cell integer, p_expected_version integer, p_nonce uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_game record;
  v_new_board text[];
  v_mark text;
  v_winner text;
  v_status text;
  v_win boolean;
  v_draw boolean;
  v_next_turn uuid;
  v_lines constant integer[][] := array[
    [1,2,3],[4,5,6],[7,8,9],
    [1,4,7],[2,5,8],[3,6,9],
    [1,5,9],[3,5,7]
  ];
  i integer;
  idx1 integer; idx2 integer; idx3 integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not private.consume_rate('game_move', 30, 60) then
    raise exception 'Rate limit exceeded for moves';
  end if;

  select * into v_game from public.games where id = p_game_id for update;
  if not found then raise exception 'Game not found'; end if;

  if exists (select 1 from public.game_moves where player_id = v_user_id and client_nonce = p_nonce) then
    return;
  end if;

  if v_game.status != 'active' then
    raise exception 'Game is not active';
  end if;

  if v_game.expires_at < now() then
    update public.games set status = 'abandoned', finished_at = now() where id = p_game_id;
    raise exception 'Game abandoned due to timeout';
  end if;

  if v_game.version != p_expected_version then
    raise exception 'Version mismatch';
  end if;

  if v_game.turn_id != v_user_id then
    raise exception 'Not your turn';
  end if;

  if p_cell < 0 or p_cell > 8 then
    raise exception 'Invalid cell';
  end if;

  if v_game.board[p_cell + 1] != '' then
    raise exception 'Cell occupied';
  end if;

  v_mark := case when v_user_id = v_game.x_id then 'X' else 'O' end;
  v_new_board := v_game.board;
  v_new_board[p_cell + 1] := v_mark;

  v_win := false;
  for i in 1..8 loop
    idx1 := v_lines[i][1]; idx2 := v_lines[i][2]; idx3 := v_lines[i][3];
    if v_new_board[idx1] = v_mark and v_new_board[idx2] = v_mark and v_new_board[idx3] = v_mark then
      v_win := true;
      exit;
    end if;
  end loop;

  v_draw := false;
  if not v_win then
    v_draw := true;
    for i in 1..9 loop
      if v_new_board[i] = '' then
        v_draw := false;
        exit;
      end if;
    end loop;
  end if;

  v_status := 'active';
  v_next_turn := case when v_user_id = v_game.x_id then v_game.o_id else v_game.x_id end;
  
  if v_win then
    v_status := 'won';
    v_next_turn := null;
  elsif v_draw then
    v_status := 'draw';
    v_next_turn := null;
  end if;

  update public.games set
    board = v_new_board,
    version = v_game.version + 1,
    turn_id = v_next_turn,
    winner_id = case when v_win then v_user_id else null end,
    status = v_status,
    expires_at = now() + interval '5 minutes',
    finished_at = case when v_win or v_draw then now() else null end
  where id = p_game_id;

  insert into public.game_moves (game_id, version, player_id, cell, client_nonce)
  values (p_game_id, v_game.version + 1, v_user_id, p_cell, p_nonce);
end;
$$;

revoke all on function public.invite_game from public, anon;
grant execute on function public.invite_game to authenticated;
revoke all on function public.respond_game from public, anon;
grant execute on function public.respond_game to authenticated;
revoke all on function public.abandon_game from public, anon;
grant execute on function public.abandon_game to authenticated;
revoke all on function public.play_move from public, anon;
grant execute on function public.play_move to authenticated;

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_moves;

commit;
