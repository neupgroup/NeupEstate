ALTER TABLE public.competitor_tracking RENAME TO competitors_tracking;

ALTER INDEX IF EXISTS public.competitor_tracking_pkey
  RENAME TO competitors_tracking_pkey;
ALTER INDEX IF EXISTS public.competitor_tracking_competitorPageId_idx
  RENAME TO competitors_tracking_competitorPageId_idx;
ALTER INDEX IF EXISTS public.competitor_tracking_ourPropertyId_idx
  RENAME TO competitors_tracking_ourPropertyId_idx;

ALTER TABLE public.competitors_tracking
  RENAME CONSTRAINT "competitor_tracking_competitorPageId_fkey"
  TO "competitors_tracking_competitorPageId_fkey";
