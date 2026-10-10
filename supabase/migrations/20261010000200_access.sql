begin;
create function private.active_member(j uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m join public.journeys t on t.id=m.journey_id
    where m.journey_id=j and m.user_id=u and m.left_at is null and t.ends_at>now());
$$;
create function private.blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.blocks where
    (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function private.can_dm(c uuid,u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.conversations v where v.id=c
    and u in(v.user_a,v.user_b) and v.status='accepted'
    and private.active_member(v.journey_id,v.user_a)
    and private.active_member(v.journey_id,v.user_b)
    and not private.blocked(v.user_a,v.user_b));
$$;
create function private.can_read_message(m uuid,u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.messages x where x.id=m and x.deleted_at is null
    and private.active_member(x.journey_id,u) and not private.blocked(x.sender_id,u)
    and (x.conversation_id is null or private.can_dm(x.conversation_id,u)));
$$;
revoke all on function private.active_member(uuid,uuid),private.blocked(uuid,uuid),
  private.can_dm(uuid,uuid),private.can_read_message(uuid,uuid) from public,anon;
grant execute on function private.active_member(uuid,uuid),private.blocked(uuid,uuid),
  private.can_dm(uuid,uuid),private.can_read_message(uuid,uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','journeys','memberships','blocks','conversations','messages',
    'reactions','calls','games','game_moves','drops','score_events','achievements','postcards','reports'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
revoke all on all tables in schema private from public,anon,authenticated;
alter table private.rate_windows enable row level security;
alter table private.call_reservations enable row level security;
alter table private.media_cleanup enable row level security;

create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy member_journey on public.journeys for select to authenticated
  using(private.active_member(id,(select auth.uid())));
create policy visible_members on public.memberships for select to authenticated using(
  user_id=(select auth.uid()) or
  (discoverable and left_at is null and private.active_member(journey_id,(select auth.uid()))
   and not private.blocked(user_id,(select auth.uid()))));
create policy own_blocks on public.blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy pair_conversations on public.conversations for select to authenticated
  using((select auth.uid()) in(user_a,user_b) and private.active_member(journey_id,(select auth.uid())));
create policy allowed_messages on public.messages for select to authenticated
  using(private.can_read_message(id,(select auth.uid())));
create policy allowed_reactions on public.reactions for select to authenticated using(
  private.can_read_message(message_id,(select auth.uid())) and not private.blocked(user_id,(select auth.uid())));
-- Call metadata remains visible to its participants for terminal-state cleanup.
create policy participant_calls on public.calls for select to authenticated
  using((select auth.uid()) in(caller_id,callee_id));
create policy participant_games on public.games for select to authenticated
  using((select auth.uid()) in(x_id,o_id) and private.can_dm(conversation_id,(select auth.uid())));
create policy participant_moves on public.game_moves for select to authenticated using(
  exists(select 1 from public.games g where g.id=game_id));
create policy allowed_drops on public.drops for select to authenticated using(
  (user_id=(select auth.uid())) or
  (status='published' and private.active_member(journey_id,(select auth.uid()))
   and not private.blocked(user_id,(select auth.uid()))));
-- Raw awards are private; leaderboard RPC returns only consented aggregate entries.
create policy own_scores on public.score_events for select to authenticated using(user_id=(select auth.uid()));
create policy own_badges on public.achievements for select to authenticated using(user_id=(select auth.uid()));
create policy own_postcards on public.postcards for select to authenticated using(user_id=(select auth.uid()));
create policy own_reports on public.reports for select to authenticated using(reporter_id=(select auth.uid()));
commit;
