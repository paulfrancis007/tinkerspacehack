begin;

create or replace function private.award_game_points() returns trigger
language plpgsql security definer as $$
begin
  if NEW.status = 'won' and OLD.status = 'active' then
    insert into public.score_events (journey_id, user_id, kind, source_id, points)
    values (NEW.journey_id, NEW.winner_id, 'game_win', NEW.id, 10);
  elsif NEW.status = 'draw' and OLD.status = 'active' then
    insert into public.score_events (journey_id, user_id, kind, source_id, points)
    values (NEW.journey_id, NEW.x_id, 'game_draw', NEW.id, 2),
           (NEW.journey_id, NEW.o_id, 'game_draw', NEW.id, 2);
  end if;
  return NEW;
end;
$$;

drop trigger if exists on_game_finish on public.games;
create trigger on_game_finish
  after update of status on public.games
  for each row
  when (NEW.status in ('won', 'draw'))
  execute function private.award_game_points();

commit;
