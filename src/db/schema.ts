import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  prompt: text().notNull(),
  language: text(), // Project/file context language
  topicLanguage: text(), // What the question is actually about
  framework: text(), // Framework being used (e.g., "Hono", "Express", "Next.js")
  runtime: text(), // Runtime environment (e.g., "Cloudflare Workers", "Node.js", "Deno")
  sourceIde: text(),
  githubRepo: text(),
  askedAt: timestamp("asked_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => {
  return {
    askedAtIdx: index("questions_asked_at_idx").on(table.askedAt),
    languageIdx: index("questions_language_idx").on(table.language),
    topicLanguageIdx: index("questions_topic_language_idx").on(table.topicLanguage),
    frameworkIdx: index("questions_framework_idx").on(table.framework),
    runtimeIdx: index("questions_runtime_idx").on(table.runtime),
    sourceIdeIdx: index("questions_source_ide_idx").on(table.sourceIde),
    githubRepoIdx: index("questions_github_repo_idx").on(table.githubRepo),
  };
});

export type NewQuestion = typeof questions.$inferInsert;

export const answers = pgTable("answers", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  content: text().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NewAnswer = typeof answers.$inferInsert;
