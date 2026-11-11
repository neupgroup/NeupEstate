ALTER TABLE public.competitor_listings RENAME TO competitors_listings;

ALTER INDEX IF EXISTS public.competitor_listings_pkey RENAME TO competitors_listings_pkey;
ALTER INDEX IF EXISTS public.competitor_listings_competitorPageId_key RENAME TO competitors_listings_competitorPageId_key;
ALTER INDEX IF EXISTS public.competitor_listings_loggedOn_idx RENAME TO competitors_listings_loggedOn_idx;
ALTER INDEX IF EXISTS public.competitor_listings_competitorId_idx RENAME TO competitors_listings_competitorId_idx;

ALTER TABLE public.competitors_listings
  RENAME CONSTRAINT "competitor_listings_competitorId_fkey" TO "competitors_listings_competitorId_fkey";
