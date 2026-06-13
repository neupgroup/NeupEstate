DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_owner_owner_client_id_fkey'
      AND conrelid = to_regclass('public.property_owner')
  ) THEN
    EXECUTE 'ALTER TABLE "property_owner" DROP CONSTRAINT "property_owner_owner_client_id_fkey"';
  END IF;

  IF to_regclass('public.lead') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_owner_client_id_fkey" FOREIGN KEY ("owner_client_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  ELSIF to_regclass('public.client') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "property_owner" ADD CONSTRAINT "property_owner_owner_client_id_fkey" FOREIGN KEY ("owner_client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE';
  END IF;
END $$;
