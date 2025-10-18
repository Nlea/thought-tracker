import { eq, gte, lt, and, sql, count, desc } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import { zodValidator } from "../middleware/validator";
import * as schema from "../db/schema";
import { ZAnswerByIDParams, ZDateRangeQuery } from "../dtos";

type AppEnv = {
    Bindings: CloudflareBindings;
    Variables: {
      db: NeonHttpDatabase<typeof schema>;
    };
  };
  
  const answers = new Hono<AppEnv>()
    .use("*", dbProvider)

    .get("/", async (c) => {
        const db = c.var.db;
        const answers = await db
          .select()
          .from(schema.answers);
        return c.json(answers);
      })
     
      .get("/:id", zodValidator("param", ZAnswerByIDParams), async (c) => {
        const db = c.var.db;
        const { id } = c.req.valid("param");
        const [answer] = await db
          .select()
          .from(schema.answers)
          .where(eq(schema.answers.id, id));
        if (!answer) return c.notFound();
        return c.json(answer);
      })


export default answers;
