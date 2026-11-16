ALTER TABLE public.competitor_sources RENAME TO competitors_sources;

ALTER INDEX IF EXISTS public.competitor_sources_pkey
  RENAME TO competitors_sources_pkey;
ALTER INDEX IF EXISTS public.competitor_sources_competitorId_idx
  RENAME TO competitors_sources_competitorId_idx;

ALTER TABLE public.competitors_sources
  RENAME CONSTRAINT "competitor_sources_competitorId_fkey"
  TO "competitors_sources_competitorId_fkey";
