ALTER TABLE "questions" ADD COLUMN "framework" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "runtime" text;--> statement-breakpoint
CREATE INDEX "questions_framework_idx" ON "questions" USING btree ("framework");--> statement-breakpoint
CREATE INDEX "questions_runtime_idx" ON "questions" USING btree ("runtime");