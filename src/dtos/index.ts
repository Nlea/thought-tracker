import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import * as schema from "../db/schema";

// Questions
export const ZQuestionInsert = createInsertSchema(schema.questions).pick({
  prompt: true,
  language: true,
  sourceIde: true,
  githubRepo: true,
});

export const ZQuestionSelect = createSelectSchema(schema.questions, {
  id: () => z.string().uuid(),
});

export const ZQuestionByIDParams = z.object({
  id: z.string().uuid(),
});

// Answers
export const ZAnswerInsert = createInsertSchema(schema.answers, {
  isCorrect: () => z.boolean(),
}).pick({
  questionId: true,
  content: true,
  isCorrect: true,
});

export const ZAnswerSelect = createSelectSchema(schema.answers, {
  id: () => z.string().uuid(),
});

export const ZAnswerByIDParams = z.object({
  id: z.string().uuid(),
});

export const ZAnswersByQuestionParams = z.object({
  questionId: z.string().uuid(),
});

// Query validation for /today endpoint
const DATE_ONLY_REGEX = /^\d{4}-[01]\d-[0-3]\d$/;

export const ZDateOrRangeQuery = z
  .object({
    date: z
      .string()
      .regex(DATE_ONLY_REGEX, "Expected date in YYYY-MM-DD format")
      .optional(),
    start: z
      .string()
      .regex(DATE_ONLY_REGEX, "Expected date in YYYY-MM-DD format")
      .optional(),
    end: z
      .string()
      .regex(DATE_ONLY_REGEX, "Expected date in YYYY-MM-DD format")
      .optional(),
  })
  .refine(
    (v) =>
      // Either a single date
      (!!v.date && !v.start && !v.end) ||
      // Or a range with both start and end
      (!v.date && !!v.start && !!v.end),
    {
      message: "Provide either `date`, or both `start` and `end` (YYYY-MM-DD)",
      path: ["date"],
    },
  );

// Query validation for trends endpoints - optional date range
export const ZDateRangeQuery = z
  .object({
    start: z
      .string()
      .regex(DATE_ONLY_REGEX, "Expected date in YYYY-MM-DD format")
      .optional(),
    end: z
      .string()
      .regex(DATE_ONLY_REGEX, "Expected date in YYYY-MM-DD format")
      .optional(),
  })
  .refine(
    (v) =>
      // Both provided or neither provided
      (!!v.start && !!v.end) || (!v.start && !v.end),
    {
      message: "Provide both `start` and `end` or neither (YYYY-MM-DD)",
      path: ["start"],
    },
  );
