-- Reconstructed existing saved_drinks table; idempotent local reset precondition.
-- Run after drinks and profiles exist. Current remote schema is unchanged.
create table if not exists public.saved_drinks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  drink_id text not null references public.drinks(id) on delete restrict,
  note text check (note is null or char_length(note) <= 500),
  saved_at timestamptz not null default now(),
  primary key (user_id, drink_id)
);
alter table public.saved_drinks enable row level security;
