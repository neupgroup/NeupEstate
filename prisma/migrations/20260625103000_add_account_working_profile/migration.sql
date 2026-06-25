ALTER TABLE "account"
ADD COLUMN "working_profile" TEXT;

CREATE INDEX "account_working_profile_idx" ON "account"("working_profile");

ALTER TABLE "account"
ADD CONSTRAINT "account_working_profile_fkey"
FOREIGN KEY ("working_profile") REFERENCES "account"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
