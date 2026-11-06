-- Preserve both source tables before modifying or dropping them.
CREATE TABLE IF NOT EXISTS public.listing_changes_backup_20261106 AS TABLE public.listing_changes;
CREATE TABLE IF NOT EXISTS public.listings_logs_backup_20261106 AS TABLE public.listings_logs;

DO $$ BEGIN
  CREATE TYPE "ListingLogStatus" AS ENUM (
    'creation_draft', 'creation_pending', 'creating', 'changing', 'deleting',
    'approved', 'accepted', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.listings_logs
  ADD COLUMN IF NOT EXISTS listing_id TEXT,
  ADD COLUMN IF NOT EXISTS responded_by TEXT,
  ADD COLUMN IF NOT EXISTS responded_on TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS legacy_is_approved BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_by_id TEXT,
  ADD COLUMN IF NOT EXISTS created_for_id TEXT,
  ADD COLUMN IF NOT EXISTS working_profile_id TEXT,
  ADD COLUMN IF NOT EXISTS modified_on TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status "ListingLogStatus";

-- Allow rows without a listing while the original property_id column still exists.
ALTER TABLE public.listings_logs
  ALTER COLUMN property_id DROP NOT NULL;

-- Convert historical log entries into the unified JSON data shape and retain their response metadata.
UPDATE public.listings_logs
SET listing_id = property_id,
    status = CASE WHEN approved_by IS NOT NULL OR approved_on IS NOT NULL THEN 'approved'::"ListingLogStatus" ELSE 'accepted'::"ListingLogStatus" END,
    responded_by = approved_by,
    responded_on = approved_on
WHERE property_id IS NOT NULL;

-- Convert the old log array column before inserting individual change records.
ALTER TABLE public.listings_logs
  ALTER COLUMN data DROP DEFAULT;
ALTER TABLE public.listings_logs
  ALTER COLUMN data TYPE JSONB USING CASE WHEN data IS NULL THEN '[]'::JSONB ELSE to_jsonb(data) END,
  ALTER COLUMN data SET DEFAULT '[]'::JSONB;

-- Move draft, creation, change and deletion requests into the unified table.
INSERT INTO public.listings_logs (id, listing_id, requested_by, responded_by, legacy_is_approved, created_by_id, created_for_id, working_profile_id, data, status, requested_on, modified_on, responded_on)
SELECT CASE
         WHEN EXISTS (
           SELECT 1 FROM public.listings_logs existing
           WHERE existing.id = source.id
             AND existing.data = source.data
             AND existing.requested_by = source.account_id
             AND existing.status = CASE
               WHEN source.is_approved IS TRUE THEN 'approved'::"ListingLogStatus"
               WHEN source.is_approved IS FALSE THEN 'rejected'::"ListingLogStatus"
               WHEN source.status IN ('creation_draft','creation_pending','creating','changing','deleting') THEN source.status::"ListingLogStatus"
               ELSE 'changing'::"ListingLogStatus"
             END
         ) THEN source.id
         WHEN EXISTS (SELECT 1 FROM public.listings_logs existing WHERE existing.id = source.id)
           THEN 'change_' || source.id
         ELSE source.id
       END,
       property_id, account_id,
       CASE WHEN is_approved IS TRUE THEN account_id ELSE NULL END,
       is_approved, created_by_id, created_for_id, working_profile_id, data,
       CASE
         WHEN is_approved IS TRUE THEN 'approved'::"ListingLogStatus"
         WHEN is_approved IS FALSE THEN 'rejected'::"ListingLogStatus"
         WHEN status IN ('creation_draft','creation_pending','creating','changing','deleting') THEN status::"ListingLogStatus"
         ELSE 'changing'::"ListingLogStatus"
       END,
       COALESCE("createdOn", CURRENT_TIMESTAMP), COALESCE("modifiedOn", CURRENT_TIMESTAMP),
       CASE WHEN is_approved IS NOT NULL THEN COALESCE("modifiedOn", CURRENT_TIMESTAMP) ELSE NULL END
FROM public.listing_changes source
ON CONFLICT (id) DO NOTHING;

-- Retain orphaned historical references in the log data while keeping the FK valid.
UPDATE public.listings_logs log
SET listing_id = NULL
WHERE log.listing_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.listings listing WHERE listing.id = log.listing_id);

ALTER TABLE public.listings_logs
  ALTER COLUMN listing_id DROP NOT NULL,
  ALTER COLUMN requested_by DROP NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'creation_draft';

DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.account(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.account(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.account(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_created_for_id_fkey FOREIGN KEY (created_for_id) REFERENCES public.account(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings_logs
    ADD CONSTRAINT listings_logs_working_profile_id_fkey FOREIGN KEY (working_profile_id) REFERENCES public.account(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.listings_logs DROP COLUMN IF EXISTS property_id;
ALTER TABLE public.listings_logs DROP COLUMN IF EXISTS approved_by;
ALTER TABLE public.listings_logs DROP COLUMN IF EXISTS approved_on;
DROP TABLE public.listing_changes;

CREATE INDEX IF NOT EXISTS listings_logs_listing_id_idx ON public.listings_logs(listing_id);
CREATE INDEX IF NOT EXISTS listings_logs_requested_by_idx ON public.listings_logs(requested_by);
CREATE INDEX IF NOT EXISTS listings_logs_responded_by_idx ON public.listings_logs(responded_by);
CREATE INDEX IF NOT EXISTS listings_logs_created_by_id_idx ON public.listings_logs(created_by_id);
CREATE INDEX IF NOT EXISTS listings_logs_created_for_id_idx ON public.listings_logs(created_for_id);
CREATE INDEX IF NOT EXISTS listings_logs_working_profile_id_idx ON public.listings_logs(working_profile_id);
CREATE INDEX IF NOT EXISTS listings_logs_status_idx ON public.listings_logs(status);
CREATE INDEX IF NOT EXISTS listings_logs_requested_on_idx ON public.listings_logs(requested_on);
CREATE INDEX IF NOT EXISTS listings_logs_modified_on_idx ON public.listings_logs(modified_on);
