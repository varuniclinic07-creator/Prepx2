-- 061_ca_video_newspapers.sql
-- Sprint 4-2: CA Video Newspaper — 5-8 min daily video from published bundles.
-- Each row links to a ca_daily_bundles row and stores the generated script,
-- scene_specs, and render pipeline state.

create table if not exists ca_video_newspapers (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references ca_daily_bundles(id) on delete cascade,
  bundle_date date not null,
  title text not null,
  theme text,
  script_text text,
  script_markers jsonb,
  scene_specs jsonb,
  duration_seconds integer not null default 300,
  render_status text not null default 'r3f_only'
    check (render_status in ('pending','r3f_only','rendering','rendered','failed')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected')),
  comfy_prompt_id text,
  comfy_video_url text,
  signed_url text,
  signed_url_expires_at timestamptz,
  storage_path text,
  generated_by text,
  render_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One video newspaper per bundle date (unique constraint)
create unique index if not exists idx_ca_video_bundle_id on ca_video_newspapers(bundle_id);
create index if not exists idx_ca_video_bundle_date on ca_video_newspapers(bundle_date desc);
create index if not exists idx_ca_video_render_status on ca_video_newspapers(render_status);
create index if not exists idx_ca_video_approval on ca_video_newspapers(approval_status);

-- updated_at trigger
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'ca_video_newspapers_updated_at') then
    create trigger ca_video_newspapers_updated_at
      before update on ca_video_newspapers
      for each row execute function update_updated_at_column();
  end if;
end $$;

-- RLS policies
alter table ca_video_newspapers enable row level security;

-- Any authenticated user can view published video newspapers (catalog)
create policy "Users can view published ca videos"
  on ca_video_newspapers for select
  to authenticated
  using (approval_status = 'approved');

-- Admin full access
create policy "Admins have full access to ca_video_newspapers"
  on ca_video_newspapers for all
  to authenticated
  using (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'))
  with check (exists (select 1 from users where users.id = auth.uid() and users.role = 'admin'));
