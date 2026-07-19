-- Remove the obsolete base-lead record table path. The canonical lead records
-- now live in shared_leads through the SharedLeads Prisma model.
DROP TABLE IF EXISTS "SharedLead" CASCADE;
DROP TABLE IF EXISTS "base_leads" CASCADE;
