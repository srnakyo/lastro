-- CreateIndex
CREATE INDEX "RunStage_requirementId_startedAt_idx" ON "RunStage"("requirementId", "startedAt");

-- AddForeignKey
ALTER TABLE "RunStage" ADD CONSTRAINT "RunStage_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
