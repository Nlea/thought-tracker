import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import * as schema from "../db/schema";

// Standard language names with proper casing
export const STANDARD_LANGUAGES: Record<string, string> = {
  // JavaScript family
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  
  // Python
  python: "Python",
  py: "Python",
  
  // JVM languages
  java: "Java",
  kotlin: "Kotlin",
  scala: "Scala",
  
  // Systems languages
  rust: "Rust",
  go: "Go",
  golang: "Go",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  "c#": "C#",
  csharp: "C#",
  
  // Web languages
  html: "HTML",
  css: "CSS",
  php: "PHP",
  
  // Ruby
  ruby: "Ruby",
  rb: "Ruby",
  
  // Mobile
  swift: "Swift",
  "objective-c": "Objective-C",
  "objective-c++": "Objective-C++",
  
  // Other
  sql: "SQL",
  bash: "Bash",
  shell: "Shell",
  powershell: "PowerShell",
  r: "R",
  dart: "Dart",
  lua: "Lua",
  perl: "Perl",
  elixir: "Elixir",
  haskell: "Haskell",
  clojure: "Clojure",
  ocaml: "OCaml",
  vue: "Vue",
  react: "React",
  svelte: "Svelte",
};

/**
 * Normalizes language names to standard casing
 * Returns null if language is falsy, otherwise returns standardized name
 */
export function normalizeLanguage(language: string | null | undefined): string | null {
  if (!language) return null;
  
  const normalized = language.trim().toLowerCase();
  return STANDARD_LANGUAGES[normalized] || language.trim();
}

/**
 * Normalizes GitHub repository URLs to a consistent format
 * - Converts to lowercase
 * - Ensures https protocol
 * - Removes trailing slashes
 * - Removes .git suffix
 * Returns null if repo is falsy
 */
export function normalizeGithubRepo(repo: string | null | undefined): string | null {
  if (!repo) return null;
  
  let normalized = repo.trim().toLowerCase();
  
  // Replace http:// with https://
  normalized = normalized.replace(/^http:\/\//, "https://");
  
  // Ensure it has a protocol
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, "");
  
  // Remove .git suffix
  normalized = normalized.replace(/\.git$/, "");
  
  return normalized;
}

// Questions
export const ZQuestionInsert = createInsertSchema(schema.questions).pick({
  prompt: true,
  language: true,
  topicLanguage: true,
  framework: true,
  runtime: true,
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
export const ZAnswerInsert = createInsertSchema(schema.answers).pick({
  questionId: true,
  content: true,
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
