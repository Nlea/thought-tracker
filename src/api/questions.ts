import { eq, gte, lt, and, sql, count, desc } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import { zodValidator } from "../middleware/validator";
import * as schema from "../db/schema";
import { ZAnswersByQuestionParams, ZDateOrRangeQuery, ZDateRangeQuery, ZQuestionByIDParams } from "../dtos";

type AppEnv = {
    Bindings: CloudflareBindings;
    Variables: {
      db: NeonHttpDatabase<typeof schema>;
    };
  };
  
  const questions = new Hono<AppEnv>()
    .use("*", dbProvider)

    .get("/", async (c) => {
        const db = c.var.db;
        const allQuestions = await db
          .select()
          .from(schema.questions)
          .orderBy(desc(schema.questions.askedAt));
        return c.json(allQuestions);
      })

    .get("/date", zodValidator("query", ZDateOrRangeQuery), async (c) => {
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


      .get("/:id", zodValidator("param", ZQuestionByIDParams), async (c) => {
        const db = c.var.db;
        const { id } = c.req.valid("param");
        const [question] = await db
          .select()
          .from(schema.questions)
          .where(eq(schema.questions.id, id));
        if (!question) return c.notFound();
        return c.json(question);
      })


   // Get answers by question ID
  .get("/:id/answers", zodValidator("param", ZAnswersByQuestionParams), async (c) => {
    const db = c.var.db;
    const { questionId } = c.req.valid("param");
    const answers = await db
      .select()
      .from(schema.answers)
      .where(eq(schema.answers.questionId, questionId));
    return c.json(answers);
  })

  // Delete question and answers
  .delete("/:id", zodValidator("param", ZQuestionByIDParams), async (c) => {
    const db = c.var.db;
    const { id } = c.req.valid("param");
    await db.delete(schema.questions).where(eq(schema.questions.id, id));
    await db.delete(schema.answers).where(eq(schema.answers.questionId, id));
    return c.json({ message: "Question and Answer deleted" });
  })


export default questions;