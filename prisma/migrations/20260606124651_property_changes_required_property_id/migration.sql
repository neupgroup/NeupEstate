-- Add the new property lifecycle state used for direct creation flows.
ALTER TYPE "PropertyStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CREATION';
