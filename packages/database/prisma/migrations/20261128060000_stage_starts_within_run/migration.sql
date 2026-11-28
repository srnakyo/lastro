-- Stages of a shared suite were stamped one after another for each requirement, so some starts fell hours
-- after their run had finished, and the gate took them for the latest. Bring every such start back into its run.
UPDATE "RunStage" AS s
SET "startedAt" = r."startedAt"
FROM "Run" AS r
WHERE s."runId" = r."id"
  AND r."finishedAt" IS NOT NULL
  AND s."startedAt" > r."finishedAt";
