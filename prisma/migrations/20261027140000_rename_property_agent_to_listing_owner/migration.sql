ALTER TABLE "property" RENAME COLUMN "agent" TO "listingOwner";

ALTER INDEX IF EXISTS "property_agent_idx" RENAME TO "property_listing_owner_idx";
