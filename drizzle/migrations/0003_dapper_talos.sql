ALTER TABLE "questions" ADD COLUMN "topic_language" text;--> statement-breakpoint
CREATE INDEX "questions_topic_language_idx" ON "questions" USING btree ("topic_language");