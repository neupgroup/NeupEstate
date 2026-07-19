DO $$
BEGIN
  IF to_regclass('public.competitors') IS NOT NULL
     AND to_regclass('public.competitor') IS NULL THEN
    ALTER TABLE "competitors" RENAME TO "competitor";
  END IF;
END $$;
