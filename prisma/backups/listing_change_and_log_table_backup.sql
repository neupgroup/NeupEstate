-- Run before the consolidation migration to preserve the current table layouts and rows.
-- The migration also creates these two backup tables automatically, so this file is
-- a standalone recovery command for databases where a manual pre-migration copy is desired.
CREATE TABLE IF NOT EXISTS public.listing_changes_backup_20261106 AS TABLE public.listing_changes;
CREATE TABLE IF NOT EXISTS public.listings_logs_backup_20261106 AS TABLE public.listings_logs;
