-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "hintsUsed" SMALLINT NOT NULL DEFAULT 0;

-- Hints are revealed in levels 1-3 (see Encounter.hints), so a submission
-- can never report using more than 3.
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_hintsUsed_check" CHECK ("hintsUsed" >= 0 AND "hintsUsed" <= 3);
