-- =====================================================================
-- Shared application state — single-workspace key/value store
-- =====================================================================
-- Lets every browser see the same selections, priorities, confirmations,
-- comments, and overrides. Backed by a flat key/jsonb table so any UI
-- localStorage slot can be promoted to "shared" without a schema change.
--
-- This is intentionally not multi-tenant; the deployment is a single
-- workspace for the Metier + Khlong Luang team. Add `workspace_id` later
-- if multi-tenancy is required.

create table if not exists public.app_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz default now(),
  updated_by  text
);

create index if not exists idx_app_state_updated_at on public.app_state(updated_at desc);

alter table public.app_state enable row level security;

drop policy if exists "app_state_public_read" on public.app_state;
create policy "app_state_public_read" on public.app_state
  for select using (true);

drop policy if exists "app_state_open_write" on public.app_state;
create policy "app_state_open_write" on public.app_state
  for all using (true) with check (true);
