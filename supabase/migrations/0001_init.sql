-- =====================================================================
-- Khlong Luang 2026 — initial schema
-- =====================================================================

-- 1. projects (1,333 records from output/extraction/ALL_records_v2.json)
create table if not exists public.projects (
  master_project_id        text primary key,
  origin_file_id           text,
  origin_project_id        text,
  source_pdf_file          text,
  source_page              integer,
  source_section           text,
  document_type            text,
  project_status_type      text,
  project_name_th          text not null,
  strategy_or_plan_category text,
  program_or_workstream    text,
  plan_period              text,
  objective_or_rationale   text,
  target_output            text,
  target_group             text,
  location                 text,
  responsible_department   text,
  implementation_period    text,
  budget_2566              numeric default 0,
  budget_2567              numeric default 0,
  budget_2568              numeric default 0,
  budget_2569              numeric default 0,
  budget_2570              numeric default 0,
  total_budget             numeric default 0,
  budget_unit              text,
  work_category_layer1     text,
  work_category_layer2     text,
  metier_service_area_layer1 text,
  metier_service_area_layer2 text,
  planned_years_list       text,
  planned_year_summary     text,
  first_planned_year       integer,
  last_planned_year        integer,
  num_planned_years        integer,
  extraction_confidence    text,
  search_text              text generated always as (
    coalesce(project_name_th,'') || ' ' ||
    coalesce(responsible_department,'') || ' ' ||
    coalesce(work_category_layer2,'') || ' ' ||
    coalesce(location,'')
  ) stored
);

create index if not exists idx_projects_dept           on public.projects(responsible_department);
create index if not exists idx_projects_strat          on public.projects(work_category_layer1);
create index if not exists idx_projects_subcat         on public.projects(work_category_layer2);
create index if not exists idx_projects_metier_l1      on public.projects(metier_service_area_layer1);
create index if not exists idx_projects_metier_l2      on public.projects(metier_service_area_layer2);
create index if not exists idx_projects_first_year     on public.projects(first_planned_year);
create index if not exists idx_projects_search_text    on public.projects using gin (to_tsvector('simple', search_text));


-- 2. procurement_history_2568 (1,449 rows from XLSX-04 clean sheet)
create table if not exists public.procurement_history_2568 (
  project_code  text primary key,
  agency        text,
  project_name  text not null,
  price         numeric,
  category      text,
  year          integer
);
create index if not exists idx_proc_year     on public.procurement_history_2568(year);
create index if not exists idx_proc_category on public.procurement_history_2568(category);
create index if not exists idx_proc_name_gin on public.procurement_history_2568 using gin (to_tsvector('simple', project_name));


-- 3. selections (Metier-side picks)
do $$ begin
  if not exists (select 1 from pg_type where typname='selection_status') then
    create type public.selection_status as enum ('TRUE','FALSE','TBD');
  end if;
  if not exists (select 1 from pg_type where typname='metier_fit_tier') then
    create type public.metier_fit_tier as enum ('high','medium','low');
  end if;
end $$;

create table if not exists public.selections (
  id                  uuid primary key default gen_random_uuid(),
  master_project_id   text not null references public.projects(master_project_id) on delete cascade,
  user_selected       public.selection_status not null default 'TBD',
  selection_priority  integer,
  selection_notes     text,
  metier_fit_score    integer check (metier_fit_score between 1 and 10),
  metier_fit_tier     public.metier_fit_tier,
  created_by          text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (master_project_id)
);
create index if not exists idx_selections_status on public.selections(user_selected);


-- 4. tor_matches (S8 historical fuzzy matches per selected project)
create table if not exists public.tor_matches (
  id                    uuid primary key default gen_random_uuid(),
  master_project_id     text not null references public.projects(master_project_id) on delete cascade,
  matched_history_code  text not null references public.procurement_history_2568(project_code) on delete cascade,
  similarity_score      numeric check (similarity_score between 0 and 1),
  similarity_reason     text,
  created_at            timestamptz default now(),
  unique (master_project_id, matched_history_code)
);
create index if not exists idx_tor_matches_project on public.tor_matches(master_project_id);


-- 5. sow_components (S9 SOW draft per selected project)
create table if not exists public.sow_components (
  id                  uuid primary key default gen_random_uuid(),
  master_project_id   text not null references public.projects(master_project_id) on delete cascade,
  component_text      text not null,
  source_grounded     boolean default false,
  source_reference    text,
  ordering            integer default 0,
  created_at          timestamptz default now()
);
create index if not exists idx_sow_project on public.sow_components(master_project_id);


-- 6. project_confirmations (เทศบาลคลองหลวง confirm)
create table if not exists public.project_confirmations (
  master_project_id   text primary key references public.projects(master_project_id) on delete cascade,
  confirmed           boolean default false,
  confirmed_by        text,
  confirmed_at        timestamptz,
  notes               text,
  updated_at          timestamptz default now()
);


-- 7. project_status_timeline (Kanban)
do $$ begin
  if not exists (select 1 from pg_type where typname='project_kanban_status') then
    create type public.project_kanban_status as enum (
      'ร่าง TOR','เปิดโครงการ','ยื่นโครงการ','กำลังดำเนินงาน','เสร็จสิ้น'
    );
  end if;
end $$;

create table if not exists public.project_status_timeline (
  id                  uuid primary key default gen_random_uuid(),
  master_project_id   text not null references public.projects(master_project_id) on delete cascade,
  status              public.project_kanban_status not null,
  changed_at          timestamptz default now(),
  changed_by          text,
  notes               text
);
create index if not exists idx_status_project on public.project_status_timeline(master_project_id, changed_at desc);


-- =====================================================================
-- Row Level Security — projects + procurement read public, others auth
-- =====================================================================
alter table public.projects                   enable row level security;
alter table public.procurement_history_2568   enable row level security;
alter table public.selections                 enable row level security;
alter table public.tor_matches                enable row level security;
alter table public.sow_components             enable row level security;
alter table public.project_confirmations      enable row level security;
alter table public.project_status_timeline    enable row level security;

drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read" on public.projects
  for select using (true);

drop policy if exists "procurement_public_read" on public.procurement_history_2568;
create policy "procurement_public_read" on public.procurement_history_2568
  for select using (true);

-- Write policies: for now, allow anon for prototyping. Tighten later by
-- adding `auth.uid() is not null` once auth is wired up.
drop policy if exists "selections_open_write" on public.selections;
create policy "selections_open_write" on public.selections
  for all using (true) with check (true);

drop policy if exists "tor_matches_open_write" on public.tor_matches;
create policy "tor_matches_open_write" on public.tor_matches
  for all using (true) with check (true);

drop policy if exists "sow_open_write" on public.sow_components;
create policy "sow_open_write" on public.sow_components
  for all using (true) with check (true);

drop policy if exists "confirmations_open_write" on public.project_confirmations;
create policy "confirmations_open_write" on public.project_confirmations
  for all using (true) with check (true);

drop policy if exists "status_open_write" on public.project_status_timeline;
create policy "status_open_write" on public.project_status_timeline
  for all using (true) with check (true);


-- =====================================================================
-- Convenience view: project + selection + confirmation + latest status
-- =====================================================================
create or replace view public.v_project_full as
select
  p.*,
  s.user_selected,
  s.selection_priority,
  s.metier_fit_score,
  s.metier_fit_tier,
  c.confirmed,
  c.confirmed_at,
  (
    select status
    from public.project_status_timeline t
    where t.master_project_id = p.master_project_id
    order by t.changed_at desc
    limit 1
  ) as latest_status
from public.projects p
left join public.selections s            on s.master_project_id = p.master_project_id
left join public.project_confirmations c on c.master_project_id = p.master_project_id;
