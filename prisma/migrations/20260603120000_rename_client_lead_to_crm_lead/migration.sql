ALTER TABLE "client_lead" RENAME TO "lead";

ALTER TABLE "lead" RENAME CONSTRAINT "client_lead_pkey" TO "lead_pkey";
ALTER TABLE "lead" RENAME CONSTRAINT "client_lead_clientId_fkey" TO "lead_clientId_fkey";

ALTER INDEX "client_lead_clientId_idx" RENAME TO "lead_clientId_idx";
ALTER INDEX "client_lead_type_idx" RENAME TO "lead_type_idx";
ALTER INDEX "client_lead_priority_idx" RENAME TO "lead_priority_idx";
