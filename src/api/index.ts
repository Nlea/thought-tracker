import { eq, gte } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import { zodValidator } from "../middleware/validator";
import * as schema from "../db/schema";
import { ZAnswerByIDParams, ZAnswersByQuestionParams, ZQuestionByIDParams} from "../dtos";

type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    db: NeonHttpDatabase<typeof schema>;
  };
};

const api = new Hono()
  .use("*", dbProvider)
  .get("/questions", async (c) => {
    const db = c.var.db;
    const questions = await db
      .select()
      .from(schema.questions);
    return c.json(questions);
  })
 
  .get("/questions/:id", zodValidator("param", ZQuestionByIDParams), async (c) => {
    const db = c.var.db;
    const { id } = c.req.valid("param");
    const [question] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, id));
    if (!question) return c.notFound();
    return c.json(question);
  })
  .get("/answers", async (c) => {
    const db = c.var.db;
    const answers = await db
      .select()
      .from(schema.answers);
    return c.json(answers);
  })
 
  .get("/answers/:id", zodValidator("param", ZAnswerByIDParams), async (c) => {
    const db = c.var.db;
    const { id } = c.req.valid("param");
    const [answer] = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.id, id));
    if (!answer) return c.notFound();
    return c.json(answer);
  })
  .get("/questions/:id/answers", zodValidator("param", ZAnswersByQuestionParams), async (c) => {
    const db = c.var.db;
    const { questionId } = c.req.valid("param");
    const answers = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.questionId, questionId));
    return c.json(answers);
  })
  .get("/today", async (c) => {
    const db = c.var.db;
    // Get today's start time as Date object
    const today = new Date();
    const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    // Get all questions asked today
    const todayQuestions = await db
      .select()
      .from(schema.questions)
      .where(gte(schema.questions.askedAt, todayStart));
    
    // Get answers for each question
    const questionsWithAnswers = await Promise.all(
      todayQuestions.map(async (question) => {
        const questionAnswers = await db
          .select()
          .from(schema.answers)
          .where(eq(schema.answers.questionId, question.id));
        return {
          ...question,
          answers: questionAnswers,
        };
      })
    );
    
    return c.json(questionsWithAnswers);
  })

  .post("/delete/:id", zodValidator("param", ZQuestionByIDParams), async (c) => {
    const db = c.var.db;
    const { id } = c.req.valid("param");
    await db.delete(schema.questions).where(eq(schema.questions.id, id));
    await db.delete(schema.answers).where(eq(schema.answers.questionId, id));
    return c.json({ message: "Question and Answer deleted" });
  });



export default api;
