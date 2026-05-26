-- =====================================================================
-- Enable Supabase Realtime broadcast for app_state
-- =====================================================================
-- Adds the shared-state table to the `supabase_realtime` publication so
-- the client `useSyncedState` hook receives postgres_changes events when
-- another browser writes. Required for 3-5 concurrent collaborators.

alter publication supabase_realtime add table public.app_state;

-- Set REPLICA IDENTITY FULL so UPDATE/DELETE events include the previous
-- row — useful if we ever need to diff against the prior value.
alter table public.app_state replica identity full;
