-- AlterTable
ALTER TABLE "RunStage" ADD COLUMN     "env" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "treeHash" TEXT;
