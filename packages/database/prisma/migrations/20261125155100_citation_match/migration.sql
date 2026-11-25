-- AlterTable
ALTER TABLE "Citation" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "found" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passageAnchor" TEXT;
