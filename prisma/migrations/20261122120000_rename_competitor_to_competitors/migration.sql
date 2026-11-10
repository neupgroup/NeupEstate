DO $$
BEGIN
  IF to_regclass('public.competitor') IS NOT NULL
     AND to_regclass('public.competitors') IS NULL THEN
    ALTER TABLE "competitor" RENAME TO "competitors";
  END IF;
END $$;
