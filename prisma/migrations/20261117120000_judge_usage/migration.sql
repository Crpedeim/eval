-- Judge-call usage on each evaluator run, so eval cost can include the judges.
ALTER TABLE "EvalRun" ADD COLUMN "model" TEXT,
ADD COLUMN "promptTokens" INTEGER,
ADD COLUMN "completionTokens" INTEGER,
ADD COLUMN "costUsd" DECIMAL(14,8),
ADD COLUMN "latencyMs" INTEGER;
