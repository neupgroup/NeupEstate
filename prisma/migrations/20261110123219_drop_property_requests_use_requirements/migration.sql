ALTER TABLE public.requirements
  ADD COLUMN "requestName" TEXT,
  ADD COLUMN "requestEmail" TEXT,
  ADD COLUMN "requestPhone" TEXT,
  ADD COLUMN "minBedrooms" INTEGER,
  ADD COLUMN "minBathrooms" INTEGER,
  ADD COLUMN "requestRemarks" TEXT,
  ADD COLUMN "requestStatus" TEXT;

CREATE INDEX "requirements_requestStatus_idx"
  ON public.requirements("requestStatus");

DROP TABLE IF EXISTS public.property_requests;
