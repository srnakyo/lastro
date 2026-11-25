-- AlterTable
ALTER TABLE "AgentEvent" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "Citation" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "Criterion" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "CriterionTest" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "Passage" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "RunStage" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "SourceVersion" ADD COLUMN     "projectId" UUID;

-- AlterTable
ALTER TABLE "TestResult" ADD COLUMN     "projectId" UUID;

-- CreateIndex
CREATE INDEX "AgentEvent_projectId_idx" ON "AgentEvent"("projectId");

-- CreateIndex
CREATE INDEX "Citation_projectId_idx" ON "Citation"("projectId");

-- CreateIndex
CREATE INDEX "Criterion_projectId_idx" ON "Criterion"("projectId");

-- CreateIndex
CREATE INDEX "CriterionTest_projectId_idx" ON "CriterionTest"("projectId");

-- CreateIndex
CREATE INDEX "Evidence_projectId_idx" ON "Evidence"("projectId");

-- CreateIndex
CREATE INDEX "Finding_projectId_idx" ON "Finding"("projectId");

-- CreateIndex
CREATE INDEX "Passage_projectId_idx" ON "Passage"("projectId");

-- CreateIndex
CREATE INDEX "RunStage_projectId_idx" ON "RunStage"("projectId");

-- CreateIndex
CREATE INDEX "SourceVersion_projectId_idx" ON "SourceVersion"("projectId");

-- CreateIndex
CREATE INDEX "TestResult_projectId_idx" ON "TestResult"("projectId");

-- Every project-scoped table answers "which project?" on its own (REQ-F7H2Q): the database fills
-- projectId from the parent row on insert, so no code path can forget it.
CREATE OR REPLACE FUNCTION lastro_fill_project_id() RETURNS trigger AS $$
DECLARE
  parent_id uuid;
BEGIN
  IF NEW."projectId" IS NULL THEN
    parent_id := (to_jsonb(NEW) ->> TG_ARGV[1])::uuid;
    EXECUTE format('SELECT "projectId" FROM %I WHERE id = $1', TG_ARGV[0]) INTO NEW."projectId" USING parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER source_version_project BEFORE INSERT ON "SourceVersion" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Source', 'sourceId');
CREATE TRIGGER passage_project BEFORE INSERT ON "Passage" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('SourceVersion', 'sourceVersionId');
CREATE TRIGGER citation_project BEFORE INSERT ON "Citation" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Requirement', 'requirementId');
CREATE TRIGGER criterion_project BEFORE INSERT ON "Criterion" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Requirement', 'requirementId');
CREATE TRIGGER criterion_test_project BEFORE INSERT ON "CriterionTest" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Criterion', 'criterionId');
CREATE TRIGGER run_stage_project BEFORE INSERT ON "RunStage" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Run', 'runId');
CREATE TRIGGER test_result_project BEFORE INSERT ON "TestResult" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('RunStage', 'runStageId');
CREATE TRIGGER finding_project BEFORE INSERT ON "Finding" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('RunStage', 'runStageId');
CREATE TRIGGER evidence_project BEFORE INSERT ON "Evidence" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('Requirement', 'requirementId');
CREATE TRIGGER agent_event_project BEFORE INSERT ON "AgentEvent" FOR EACH ROW EXECUTE FUNCTION lastro_fill_project_id('AgentSession', 'sessionId');

-- Rows that already exist, parents first.
UPDATE "SourceVersion" c SET "projectId" = p."projectId" FROM "Source" p WHERE c."sourceId" = p.id AND c."projectId" IS NULL;
UPDATE "Passage" c SET "projectId" = p."projectId" FROM "SourceVersion" p WHERE c."sourceVersionId" = p.id AND c."projectId" IS NULL;
UPDATE "Citation" c SET "projectId" = p."projectId" FROM "Requirement" p WHERE c."requirementId" = p.id AND c."projectId" IS NULL;
UPDATE "Criterion" c SET "projectId" = p."projectId" FROM "Requirement" p WHERE c."requirementId" = p.id AND c."projectId" IS NULL;
UPDATE "CriterionTest" c SET "projectId" = p."projectId" FROM "Criterion" p WHERE c."criterionId" = p.id AND c."projectId" IS NULL;
UPDATE "RunStage" c SET "projectId" = p."projectId" FROM "Run" p WHERE c."runId" = p.id AND c."projectId" IS NULL;
UPDATE "TestResult" c SET "projectId" = p."projectId" FROM "RunStage" p WHERE c."runStageId" = p.id AND c."projectId" IS NULL;
UPDATE "Finding" c SET "projectId" = p."projectId" FROM "RunStage" p WHERE c."runStageId" = p.id AND c."projectId" IS NULL;
UPDATE "Evidence" c SET "projectId" = p."projectId" FROM "Requirement" p WHERE c."requirementId" = p.id AND c."projectId" IS NULL;
UPDATE "AgentEvent" c SET "projectId" = p."projectId" FROM "AgentSession" p WHERE c."sessionId" = p.id AND c."projectId" IS NULL;
