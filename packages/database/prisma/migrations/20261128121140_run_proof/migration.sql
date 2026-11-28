-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "proof" BOOLEAN NOT NULL DEFAULT false;

-- Runs recorded by `lastro req prove` before this flag existed are known by their audit event.
UPDATE "Run" AS r
SET "proof" = true
FROM "AuditEvent" AS a
WHERE a."action" = 'run.proof' AND a."entityId" = r."id"::text;

-- A proof keeps only the results of the criterion it proves: the suite may have run other tests, which failed
-- without the code and are nobody's red.
DELETE FROM "TestResult" AS tr
USING "RunStage" AS s, "Run" AS r, "AuditEvent" AS a, "Test" AS t
WHERE tr."runStageId" = s."id" AND s."runId" = r."id" AND tr."testId" = t."id"
  AND a."action" = 'run.proof' AND a."entityId" = r."id"::text
  AND t."ref" NOT IN (
    SELECT ct."testRef" FROM "CriterionTest" AS ct
    JOIN "Criterion" AS c ON c."id" = ct."criterionId"
    JOIN "Requirement" AS q ON q."id" = c."requirementId"
    WHERE q."projectId" = r."projectId" AND q."code" = a."data"->>'requirement' AND c."code" = a."data"->>'criterion'
  );
