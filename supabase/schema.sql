-- supabase/schema.sql
-- Supabase SQL Editor에 붙여넣어 실행 (사용자가 수동으로 1회 실행)

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age int,
  is_care_leaver boolean not null default false,
  is_basic_livelihood boolean not null default false,
  interests text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  source text not null,
  category text not null check (category in ('scholarship', 'subsidy', 'mentoring')),
  summary text not null,
  why_matched text not null,
  deadline date,
  is_read boolean not null default false,
  first_seen_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table postings enable row level security;

-- 본인 프로필만 읽고 쓸 수 있음
create policy "profiles: owner read" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles: owner upsert" on profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles: owner update" on profiles
  for update using (auth.uid() = user_id);

-- 로그인한 사용자는 누구나 postings를 읽고 is_read를 갱신할 수 있음 (1인 전용 단계)
create policy "postings: authenticated read" on postings
  for select using (auth.role() = 'authenticated');
create policy "postings: authenticated update is_read" on postings
  for update using (auth.role() = 'authenticated');

-- postings insert/upsert는 service_role 키(ingest API)로만 — RLS가 기본 차단하므로 별도 정책 불필요
