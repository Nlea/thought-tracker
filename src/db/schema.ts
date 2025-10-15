import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  prompt: text().notNull(),
  language: text(),
  sourceIde: text(),
  githubRepo: text(),
  askedAt: timestamp("asked_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
  isCorrect: boolean("is_correct").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NewAnswer = typeof answers.$inferInsert;
