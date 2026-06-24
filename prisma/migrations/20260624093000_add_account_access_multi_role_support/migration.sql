CREATE TABLE "account_access" (
    "account_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "updated_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_access_pkey" PRIMARY KEY ("account_id","app_id","role_id")
);

ALTER TABLE "authz_role"
    ADD COLUMN "acquisition_type" TEXT,
    ADD COLUMN "approval_policy" TEXT,
    ADD COLUMN "applicable_for" JSONB;

CREATE INDEX "account_access_app_id_idx" ON "account_access"("app_id");
CREATE INDEX "account_access_role_id_idx" ON "account_access"("role_id");

INSERT INTO "account_access" ("account_id", "app_id", "role_id", "updated_on")
SELECT
    "account"."id",
    "authz_role"."app_id",
    "account"."role_id",
    CURRENT_TIMESTAMP
FROM "account"
JOIN "authz_role" ON "authz_role"."id" = "account"."role_id"
WHERE "account"."role_id" IS NOT NULL
ON CONFLICT ("account_id", "app_id", "role_id") DO NOTHING;

ALTER TABLE "account_access"
    ADD CONSTRAINT "account_access_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "account"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_access"
    ADD CONSTRAINT "account_access_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "authz_role"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
