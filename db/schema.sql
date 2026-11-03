-- চাকরি বাঁচাও: leaderboard schema for Neon Postgres
create table if not exists scores (
  id          bigserial primary key,
  player_name text        not null check (char_length(player_name) between 1 and 24),
  role        text        not null check (role in ('se','qa','des','hr','peon','ceo')),
  score       integer     not null check (score >= 0),
  title       text,
  survived    boolean     not null default true,
  played_at   timestamptz not null default now()
);

create index if not exists scores_score_idx  on scores (score desc);
create index if not exists scores_played_idx on scores (played_at desc);

-- Employees allowed to log in: email + ELX ID. Filled by: npm run db:import -- <file.xlsx>
create table if not exists employees (
  emp_id      text primary key,
  name        text not null,
  email       text not null,
  designation text,
  branch      text,
  department  text
);

create unique index if not exists employees_email_idx on employees (lower(email));

alter table scores add column if not exists emp_id text references employees (emp_id);

-- Profile fields the employee can edit themselves
alter table employees add column if not exists nickname  text;
alter table employees add column if not exists avatar    text;
alter table employees add column if not exists avatar_bg text;
alter table employees add column if not exists bio       text;
alter table employees add column if not exists snack     text;
alter table employees add column if not exists phone     text;

-- XP from pool / carrom matches
alter table employees add column if not exists xp integer not null default 0;

create table if not exists matches (
  id        bigserial primary key,
  emp_id    text not null references employees (emp_id),
  opp_id    text not null references employees (emp_id),
  game      text not null check (game in ('pool','carrom')),
  result    text not null check (result in ('win','lose')),
  xp_delta  integer not null,
  played_at timestamptz not null default now()
);

create index if not exists matches_emp_idx on matches (emp_id, played_at desc);

-- 'male' / 'female' (from the Gender column), used to pick the game character
alter table employees add column if not exists gender text;

-- which of the 10 character models per gender the employee picked (null = the default, 0)
alter table employees add column if not exists model integer;

-- One rating per employee per game (Elo, everyone starts on 1000)
create table if not exists ratings (
  emp_id text not null references employees (emp_id),
  game   text not null check (game in ('pool','carrom','uno','chess','ludo')),
  rating integer not null default 1000,
  played integer not null default 0,
  wins   integer not null default 0,
  primary key (emp_id, game)
);

-- matches now cover every game and up to 4 players
alter table matches drop constraint if exists matches_game_check;
alter table matches drop constraint if exists matches_result_check;
alter table matches add column if not exists place integer;
alter table matches add column if not exists players integer;
alter table matches add column if not exists rating_before integer;
alter table matches add column if not exists rating_after integer;

-- Who is online and where: one row per employee, refreshed about twice a second while they are in the game
create table if not exists presence (
  emp_id    text primary key references employees (emp_id),
  x         real not null default 0,
  z         real not null default 0,
  yaw       real not null default 0,
  walking   boolean not null default false,
  in_office boolean not null default false,
  pose      text not null default 'stand',
  zone      text not null default '',
  act       text not null default '',
  updated_at timestamptz not null default now()
);

-- Live challenges between two or more people who are online right now
create table if not exists live_matches (
  id         bigserial primary key,
  game       text not null,
  host_id    text not null references employees (emp_id),
  table_idx  integer not null default -1,
  status     text not null default 'invite',
  players    jsonb not null default '[]',
  sim_ids    jsonb not null default '[]',
  order_ids  jsonb,
  seed       integer,
  start_at   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists live_matches_host_idx on live_matches (host_id, created_at desc);

-- Employment rating: starts at 100, goes down when a boss catches you in the game room
alter table employees add column if not exists employment integer not null default 100;
create table if not exists warnings (
  id         bigserial primary key,
  emp_id     text not null references employees (emp_id),
  boss       text not null,
  delta      integer not null,
  created_at timestamptz not null default now()
);

-- the shared move log for turn-based live games (ludo, uno): every player's choices, in order
alter table live_matches add column if not exists moves jsonb not null default '[]';

-- Slaps: the person slapped files a complaint with HR, and the slapper gets a show-cause letter and loses employment rating
create table if not exists slaps (
  id            bigserial primary key,
  from_id       text not null references employees (emp_id),
  to_id         text not null references employees (emp_id),
  status        text not null default 'slapped',
  delta         integer,
  rating_before integer,
  rating_after  integer,
  delivered     boolean not null default false,
  created_at    timestamptz not null default now(),
  complained_at timestamptz
);
create index if not exists slaps_to_idx on slaps (to_id, created_at desc);
create index if not exists slaps_from_idx on slaps (from_id, created_at desc);

-- height and a short-lived effect (slap, hit) so others see jumps and slaps
alter table presence add column if not exists y real not null default 0;
alter table presence add column if not exists fx text not null default '';

-- what kind of hit it was (slap, kick, or a kick at the desk), and invitations between colleagues (a smoke on the balcony)
alter table slaps add column if not exists kind text not null default 'slap';
create table if not exists socials (
  id         bigserial primary key,
  from_id    text not null references employees (emp_id),
  to_id      text not null references employees (emp_id),
  kind       text not null default 'smoke',
  status     text not null default 'sent',
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists socials_to_idx on socials (to_id, created_at desc);
create index if not exists socials_from_idx on socials (from_id, created_at desc);

-- how the character looks beyond the preset model: skin tone, hair, clothes, glasses... (JSON, checked by the server)
alter table employees add column if not exists look text;

-- every employee has their own desk (an index into the office's list of desks), and nobody else gets the same one
alter table employees add column if not exists desk integer;
create unique index if not exists employees_desk_idx on employees (desk) where desk is not null;
-- carrying the bag on the way in
alter table presence add column if not exists bag boolean not null default false;
-- invitations carry where the inviter stands, and when they were accepted, so both screens can play the same moment together
alter table socials add column if not exists x real not null default 0;
alter table socials add column if not exists z real not null default 0;
alter table socials add column if not exists accepted_at timestamptz;
