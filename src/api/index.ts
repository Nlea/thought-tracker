import { eq, gte, lt, and } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import { zodValidator } from "../middleware/validator";
import * as schema from "../db/schema";
import { ZAnswerByIDParams, ZAnswersByQuestionParams, ZQuestionByIDParams, ZDateOrRangeQuery} from "../dtos";

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
  .get("/questions/date", zodValidator("query", ZDateOrRangeQuery), async (c) => {
    const db = c.var.db;
    const { date, start, end } = c.req.valid("query");
    
    let dateStart: Date;
    let dateEnd: Date;
    
    if (date) {
      // Single date query - get questions for that specific day
      const parsedDate = new Date(date);
      dateStart = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate() + 1));
    } else if (start && end) {
      // Date range query
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    } else {
      // Default to today if no date provided (though validation should prevent this)
      const today = new Date();
      dateStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      dateEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    }
    
    console.log('Date query:', { date, start, end, dateStart: dateStart.toISOString(), dateEnd: dateEnd.toISOString() });
    
    // Get all questions for the specified date/range
    const dateQuestions = await db
      .select()
      .from(schema.questions)
      .where(and(
        gte(schema.questions.askedAt, dateStart),
        lt(schema.questions.askedAt, dateEnd)
      ));
    
    console.log('Found questions:', dateQuestions.length, dateQuestions.map(q => ({ id: q.id, askedAt: q.askedAt })));
    
    // Get answers for each question
    const questionsWithAnswers = await Promise.all(
      dateQuestions.map(async (question) => {
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
  .post("/delete/:id", zodValidator("param", ZQuestionByIDParams), async (c) => {
    const db = c.var.db;
    const { id } = c.req.valid("param");
    await db.delete(schema.questions).where(eq(schema.questions.id, id));
    await db.delete(schema.answers).where(eq(schema.answers.questionId, id));
    return c.json({ message: "Question and Answer deleted" });
  });



export default api;
