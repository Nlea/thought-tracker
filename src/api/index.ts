import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import * as schema from "../db/schema";
import trends from "./trends";
import questions from "./questions";
import { HonoBase } from "hono/hono-base";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import answers from "./answers";
import { basicAuth } from 'hono/basic-auth'


type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    db: NeonHttpDatabase<typeof schema>;
  };
};

const api = new Hono()
  .use("*", dbProvider)

  .route("/trends", trends)
  .route("/questions", questions)
  .route("/answers", answers)


export default api;
function route(arg0: string, questions: HonoBase<{ Bindings: CloudflareBindings; Variables: { db: NeonHttpDatabase<typeof schema>; }; } & { Bindings: { DATABASE_URL: string; }; Variables: { db: NeonHttpDatabase; }; }, { "*": {}; } & { "/questions/date": { $get: { input: { query: { date?: string | string[] | undefined; start?: string | string[] | undefined; end?: string | string[] | undefined; }; }; output: { answers: { id: string; questionId: string; content: string; isCorrect: boolean; createdAt: string; updatedAt: string; }[]; id: string; prompt: string; language: string | null; sourceIde: string | null; githubRepo: string | null; askedAt: string; updatedAt: string; }[]; outputFormat: "json"; status: ContentfulStatusCode; }; }; } & { "/questions/:id": { $get: { input: { param: { id: string; }; }; output: {}; outputFormat: string; status: StatusCode; }; }; }, "/">) {
  throw new Error("Function not implemented.");
}

