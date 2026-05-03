-- 062_syllabus_progress.sql
-- Sprint 4-3: 3D Syllabus Navigator + Territory Conquest foundations.
-- Adds user_topic_progress for tracking per-topic mastery and the
-- missing increment_capture RPC for territory conquest.

-- Per-user, per-topic progress tracking for the 3D syllabus navigator.
create table if not exists user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  subject text not null,
  quizzes_attempted integer not null default 0,
  quizzes_passed integer not null default 0,
  best_score_pct real,
  total_time_spent_seconds integer not null default 0,
  mastery_level real not null default 0 check (mastery_level >= 0 and mastery_level <= 1),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic_id)
);

create index if not exists idx_utp_user on user_topic_progress(user_id);
create index if not exists idx_utp_topic on user_topic_progress(topic_id);
create index if not exists idx_utp_subject on user_topic_progress(user_id, subject);
create index if not exists idx_utp_mastery on user_topic_progress(user_id, mastery_level);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'user_topic_progress_updated_at') then
    create trigger user_topic_progress_updated_at
      before update on user_topic_progress
      for each row execute function update_updated_at_column();
  end if;
end $$;

alter table user_topic_progress enable row level security;

create policy "Users can view own topic progress"
  on user_topic_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can upsert own topic progress"
  on user_topic_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own topic progress"
  on user_topic_progress for update
  to authenticated
  using (user_id = auth.uid());

create policy "Admins have full access to user_topic_progress"
  on user_topic_progress for all
  to authenticated
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'));

-- Missing increment_capture RPC for territory conquest (lib/territory-conquest.ts).
-- Upserts territory_ownership capture_count atomically.
create or replace function increment_capture(d_id uuid, s_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update territory_ownership
  set capture_count = capture_count + 1,
      captured_at = now()
  where district_id = d_id and squad_id = s_id;
end;
$$;

-- Helper: get aggregate subject progress for syllabus navigator rings.
create or replace function get_subject_progress(p_user_id uuid)
returns table(
  subject text,
  total_topics bigint,
  mastered_topics bigint,
  avg_mastery real,
  quizzes_attempted bigint
)
language sql
stable
security definer
as $$
  select
    t.subject,
    count(*) as total_topics,
    count(*) filter (where utp.mastery_level >= 0.8) as mastered_topics,
    coalesce(avg(utp.mastery_level), 0)::real as avg_mastery,
    coalesce(sum(utp.quizzes_attempted), 0)::bigint as quizzes_attempted
  from topics t
  left join user_topic_progress utp
    on utp.topic_id = t.id and utp.user_id = p_user_id
  group by t.subject;
$$;

-- Helper: get district conquest state for the 3D map.
create or replace function get_district_conquest_state()
returns table(
  district_id uuid,
  district_name text,
  state_name text,
  owner_squad_id uuid,
  owner_squad_name text,
  capture_count integer,
  captured_at timestamptz,
  center_lat float,
  center_lng float
)
language sql
stable
security definer
as $$
  select
    d.id as district_id,
    d.name as district_name,
    d.state as state_name,
    tox.squad_id as owner_squad_id,
    s.name as owner_squad_name,
    tox.capture_count,
    tox.captured_at,
    d.center_lat,
    d.center_lng
  from districts d
  left join territory_ownership tox on tox.district_id = d.id
  left join squads s on s.id = tox.squad_id;
$$;
