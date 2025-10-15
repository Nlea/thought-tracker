CREATE INDEX "questions_asked_at_idx" ON "questions" USING btree ("asked_at");--> statement-breakpoint
CREATE INDEX "questions_language_idx" ON "questions" USING btree ("language");--> statement-breakpoint
CREATE INDEX "questions_source_ide_idx" ON "questions" USING btree ("source_ide");--> statement-breakpoint
CREATE INDEX "questions_github_repo_idx" ON "questions" USING btree ("github_repo");