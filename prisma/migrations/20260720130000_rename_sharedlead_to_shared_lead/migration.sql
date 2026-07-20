DO $$
BEGIN
  IF to_regclass('public.shared_lead') IS NOT NULL THEN
    IF to_regclass('public."SharedLead"') IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot rename "SharedLead" because "shared_lead" already exists';
    END IF;

    RETURN;
  END IF;

  IF to_regclass('public."SharedLead"') IS NOT NULL THEN
    ALTER TABLE "SharedLead" RENAME TO "shared_lead";

    ALTER TABLE "shared_lead" RENAME CONSTRAINT "SharedLead_pkey" TO "shared_lead_pkey";
    ALTER TABLE "shared_lead" RENAME CONSTRAINT "SharedLead_baseLead_id_fkey" TO "shared_lead_baseLead_id_fkey";
    ALTER TABLE "shared_lead" RENAME CONSTRAINT "SharedLead_leadOwner_fkey" TO "shared_lead_leadOwner_fkey";
    ALTER TABLE "shared_lead" RENAME CONSTRAINT "SharedLead_ownerId_fkey" TO "shared_lead_ownerId_fkey";
  END IF;
END $$;
