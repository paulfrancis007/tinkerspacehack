begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  avatar_seed text not null default 'lime',
  bio text not null default '' check (char_length(bio) <= 160),
  interests text[] not null default '{}' check (cardinality(interests) <= 5),
  sound_enabled boolean not null default false,
  adult_attested_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('train','flight','bus')),
  operator_code text not null check (char_length(operator_code) between 1 and 40),
  service_number text not null check (char_length(service_number) between 1 and 30),
  service_date date not null,
  origin_code text not null check (char_length(origin_code) between 1 and 40),
  destination_code text not null check (char_length(destination_code) between 1 and 40),
  origin_label text not null check (char_length(origin_label) between 1 and 80),
  destination_label text not null check (char_length(destination_label) between 1 and 80),
  timezone text not null default 'Asia/Kolkata',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (origin_code <> destination_code),
  check (ends_at > starts_at and ends_at <= starts_at + interval '72 hours'),
  unique(mode,operator_code,service_number,service_date,origin_code,destination_code)
);
create table public.memberships (
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  alias text not null check (char_length(alias) between 2 and 30),
  avatar_seed text not null,
  bio text not null default '' check (char_length(bio) <= 160),
  interests text[] not null default '{}' check (cardinality(interests) <= 5),
  discoverable boolean not null default false,
  lounge_consent boolean not null default false,
  social_mode text not null default 'quiet' check (social_mode in ('chat','game','quiet')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  primary key(journey_id,user_id)
);
create unique index membership_one_active on public.memberships(user_id) where left_at is null;
create index membership_journey_active on public.memberships(journey_id,last_seen_at desc) where left_at is null;
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),
  check(blocker_id <> blocked_id)
);
create index blocks_reverse on public.blocks(blocked_id,blocker_id);
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(user_a < user_b),
  check(requested_by in (user_a,user_b)),
  unique(journey_id,user_a,user_b),
  unique(id,journey_id)
);
create index conversations_a on public.conversations(user_a,status,updated_at desc);
create index conversations_b on public.conversations(user_b,status,updated_at desc);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  conversation_id uuid,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  client_nonce uuid not null,
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key(conversation_id,journey_id) references public.conversations(id,journey_id) on delete cascade,
  unique(sender_id,client_nonce)
);
create index messages_lounge on public.messages(journey_id,created_at desc,id desc) where conversation_id is null;
create index messages_dm on public.messages(conversation_id,created_at desc,id desc) where conversation_id is not null;
create table public.reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check(emoji in ('👍','💚','😂','✨','🚀')),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(message_id,user_id,emoji)
);
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('audio','video')),
  status text not null default 'ringing' check(status in ('ringing','accepted','active','rejected','cancelled','missed','ended','failed')),
  room_name text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  check(caller_id <> callee_id)
);
create index calls_callee on public.calls(callee_id,status,created_at desc);
create index calls_caller on public.calls(caller_id,status,created_at desc);
create table private.call_reservations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  lease_until timestamptz not null
);
create table public.games (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  x_id uuid not null references public.profiles(id) on delete cascade,
  o_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check(status in ('invited','active','won','draw','declined','abandoned')),
  board text[] not null default array['','','','','','','','',''],
  turn_id uuid references public.profiles(id) on delete set null,
  winner_id uuid references public.profiles(id) on delete set null,
  version integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  check(x_id <> o_id),
  check(cardinality(board)=9),
  check(board <@ array['','X','O']::text[]),
  check(turn_id is null or turn_id in (x_id,o_id)),
  check(winner_id is null or winner_id in (x_id,o_id)),
  foreign key(conversation_id,journey_id) references public.conversations(id,journey_id) on delete cascade
);
create index games_journey on public.games(journey_id,created_at desc);
create index games_conversation on public.games(conversation_id,status);
create table public.game_moves (
  game_id uuid not null references public.games(id) on delete cascade,
  version integer not null check(version > 0),
  player_id uuid not null references public.profiles(id) on delete cascade,
  cell integer not null check(cell between 0 and 8),
  client_nonce uuid not null,
  created_at timestamptz not null default now(),
  primary key(game_id,version),
  unique(game_id,cell),
  unique(player_id,client_nonce)
);
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null default '' check(char_length(caption)<=500),
  object_path text unique,
  status text not null default 'draft' check(status in ('draft','published','deleted')),
  created_at timestamptz not null default now(),
  check(caption <> '' or object_path is not null)
);
create index drops_feed on public.drops(journey_id,created_at desc) where status='published';
create table public.score_events (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('join','game_win','game_draw','first_drop')),
  source_id uuid not null,
  points integer not null check(points between 0 and 20),
  created_at timestamptz not null default now(),
  unique(user_id,kind,source_id)
);
create index scores_journey on public.score_events(journey_id,user_id);
create table public.achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  badge text not null check(badge in ('first_journey','first_game','first_drop')),
  earned_at timestamptz not null default now(),
  primary key(user_id,journey_id,badge)
);
create table public.postcards (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.journeys(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 80),
  note text not null default '' check(char_length(note)<=500),
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id,journey_id)
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid references public.profiles(id) on delete set null,
  journey_id uuid references public.journeys(id) on delete set null,
  target_type text not null check(target_type in ('user','message','drop','call')),
  target_id uuid not null,
  reason text not null check(char_length(reason) between 1 and 500),
  status text not null default 'open' check(status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create index reports_queue on public.reports(status,created_at);
create table private.rate_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null check(count > 0),
  primary key(user_id,action,window_start)
);
create table private.media_cleanup (
  call_id uuid primary key references public.calls(id) on delete cascade,
  attempts integer not null default 0,
  completed_at timestamptz,
  next_attempt_at timestamptz not null default now()
);
commit;
