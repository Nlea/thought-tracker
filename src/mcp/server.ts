import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

const mcp = new McpServer({
  name: "vegas-mcp",
  version: "1.0.0",
  schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
});

mcp.use(async (ctx, next) => {
  console.log("req -->", ctx.request.method);
  await next();
  console.log("res [result] <--", ctx.response?.result);
})


mcp.tool("chat-turn/capture", {
  description: "Capture a user question and the assistant's answer in one call. The IDE should provide the GitHub repository URL from the current workspace if available (e.g., from git remote origin).",
  inputSchema: z.object({
    userMessage: z.string().min(1).describe("The user's question"),
    assistantMessage: z.string().min(1).describe("The assistant's answer"),
    isCorrect: z.boolean().default(false).describe("Whether the answer was marked as correct"),
    language: z.string().optional().describe("Programming language being used"),
    sourceIde: z.string().optional().describe("The IDE being used (e.g., 'Cursor', 'VSCode')"),
    githubRepo: z.string().url().optional().describe("GitHub repository URL from the current workspace (e.g., from git remote origin)"),

  }),
  handler: async (args,ctx) => {

    try {
      const client = neon(env.DATABASE_URL);
      const db = drizzle(client, {
        schema,
        casing: "snake_case",
      });
      
      if (!db) {
        throw new Error("Database not available");
      }

      // Create question
      const [question] = await db
        .insert(schema.questions)
        .values({
          prompt: args.userMessage,
          language: args.language,
          sourceIde: args.sourceIde,
          githubRepo: args.githubRepo,
        })
        .returning();

      // Create answer
      const [answer] = await db
        .insert(schema.answers)
        .values({
          questionId: question.id,
          content: args.assistantMessage,
          isCorrect: args.isCorrect,
        })
        .returning();

      return {
        content: [
          { type: "text", text: `Captured chat turn (q:${question.id}, a:${answer.id})` },
          { type: "text", text: JSON.stringify({ question, answer }) },
        ],
        structuredContent: { question, answer },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: "text", text: `Failed to capture chat turn: ${errorMessage}` }],
      };
    }
  },
});

const transport = new StreamableHttpTransport();
const httpHandler = transport.bind(mcp);
export default httpHandler;
