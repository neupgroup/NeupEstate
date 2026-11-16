DO $$
BEGIN
  IF to_regclass('public.competitor_tracking') IS NOT NULL
     AND to_regclass('public.competitors_tracking') IS NULL THEN
    ALTER TABLE public.competitor_tracking RENAME TO competitors_tracking;
  END IF;

  IF to_regclass('public.competitor_tracking_pkey') IS NOT NULL
     AND to_regclass('public.competitors_tracking_pkey') IS NULL THEN
    ALTER INDEX public.competitor_tracking_pkey RENAME TO competitors_tracking_pkey;
  END IF;

  IF to_regclass('public.competitor_tracking_competitorPageId_idx') IS NOT NULL
     AND to_regclass('public.competitors_tracking_competitorPageId_idx') IS NULL THEN
    ALTER INDEX public.competitor_tracking_competitorPageId_idx
      RENAME TO competitors_tracking_competitorPageId_idx;
  END IF;

  IF to_regclass('public.competitor_tracking_ourPropertyId_idx') IS NOT NULL
     AND to_regclass('public.competitors_tracking_ourPropertyId_idx') IS NULL THEN
    ALTER INDEX public.competitor_tracking_ourPropertyId_idx
      RENAME TO competitors_tracking_ourPropertyId_idx;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = to_regclass('public.competitors_tracking')
      AND conname = 'competitor_tracking_competitorPageId_fkey'
  ) THEN
    ALTER TABLE public.competitors_tracking
      RENAME CONSTRAINT "competitor_tracking_competitorPageId_fkey"
      TO "competitors_tracking_competitorPageId_fkey";
  END IF;
END $$;
