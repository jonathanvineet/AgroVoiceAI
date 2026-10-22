-- Optional tables used by lib/data.ts. Until they exist the app stores these
-- rows in the local .data/ store automatically.

create table if not exists public.soil_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'sensor' check (source in ('sensor', 'manual')),
  nitrogen numeric not null,
  phosphorus numeric not null,
  potassium numeric not null,
  temperature numeric not null,
  moisture numeric not null,
  ph numeric not null,
  ec numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists soil_readings_created_at_idx on public.soil_readings (created_at desc);

create table if not exists public.pest_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pest_image text,
  model_answer text,
  user_answer text,
  confidence text,
  correctness text not null check (correctness in ('correct', 'incorrect')),
  feedback text,
  created_at timestamptz not null default now()
);

-- Only the server (service role) reads/writes these tables.
alter table public.soil_readings enable row level security;
alter table public.pest_feedback enable row level security;
