import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";
import { normalizeLanguage, normalizeGithubRepo } from "../dtos";

const mcp = new McpServer({
  name: "thought-tracer-mcp",
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
    language: z.string().optional().describe("Programming language of the project/file context"),
    topicLanguage: z.string().optional().describe("Programming language that the question is actually about (may differ from project language for general questions)"),
    framework: z.string().optional().describe("Framework being used in the project (e.g., 'Hono', 'Express', 'Next.js', 'React')"),
    runtime: z.string().optional().describe("Runtime environment (e.g., 'Cloudflare Workers', 'Node.js', 'Deno', 'Bun')"),
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

      // Create question with normalized language and github repo
      const [question] = await db
        .insert(schema.questions)
        .values({
          prompt: args.userMessage,
          language: normalizeLanguage(args.language),
          topicLanguage: normalizeLanguage(args.topicLanguage),
          framework: args.framework,
          runtime: args.runtime,
          sourceIde: args.sourceIde,
          githubRepo: normalizeGithubRepo(args.githubRepo),
        })
        .returning();

      // Create answer
      const [answer] = await db
        .insert(schema.answers)
        .values({
          questionId: question.id,
          content: args.assistantMessage,
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
