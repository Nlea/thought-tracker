import { eq, gte, lt, and, sql, count, desc } from "drizzle-orm";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { dbProvider } from "../middleware/dbProvider";
import { zodValidator } from "../middleware/validator";
import * as schema from "../db/schema";
import { ZDateRangeQuery } from "../dtos";

type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    db: NeonHttpDatabase<typeof schema>;
  };
};

const trends = new Hono<AppEnv>()
  .use("*", dbProvider)
  
  // Overview statistics
  .get("/overview", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    // Parse date range or use all-time if not provided
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    // Build date filter
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get total interactions (questions = interactions since each hit includes both Q&A)
    const [totalInteractionsResult] = await db
      .select({ count: count() })
      .from(schema.questions)
      .where(dateFilter);
    
    const totalInteractions = totalInteractionsResult.count;
    
    // Get date range from actual data
    const dateRangeQuery = await db
      .select({
        earliest: sql<string>`MIN(${schema.questions.askedAt})`,
        latest: sql<string>`MAX(${schema.questions.askedAt})`,
      })
      .from(schema.questions)
      .where(dateFilter);
    
    return c.json({
      overview: {
        totalInteractions,
        dateRange: {
          start: dateRangeQuery[0]?.earliest || null,
          end: dateRangeQuery[0]?.latest || null,
        },
      },
    });
  })
  
  // Language distribution (project context)
  .get("/languages", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get language distribution
    const languageStats = await db
      .select({
        language: schema.questions.language,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.language)
      .orderBy(desc(count()));
    
    // Calculate total for percentages
    const total = languageStats.reduce((sum, item) => sum + item.count, 0);
    
    // Format response with percentages
    const languages = languageStats.map((item) => ({
      language: item.language || "unknown",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ languages });
  })
  
  // Topic language distribution (what questions are about)
  .get("/topic-languages", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get topic language distribution
    const topicLanguageStats = await db
      .select({
        topicLanguage: schema.questions.topicLanguage,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.topicLanguage)
      .orderBy(desc(count()));
    
    // Calculate total for percentages
    const total = topicLanguageStats.reduce((sum, item) => sum + item.count, 0);
    
    // Format response with percentages
    const topicLanguages = topicLanguageStats.map((item) => ({
      language: item.topicLanguage || "general",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ topicLanguages });
  })
  
  // Temporal trends - questions over time
  .get("/temporal", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    const { interval } = c.req.query();
    
    // Validate interval parameter
    const validIntervals = ["daily", "weekly", "monthly"];
    const selectedInterval = validIntervals.includes(interval || "") ? interval : "daily";
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // SQL expressions for different intervals
    let dateGroupExpression: any;
    switch (selectedInterval) {
      case "monthly":
        dateGroupExpression = sql<string>`DATE_TRUNC('month', ${schema.questions.askedAt})`;
        break;
      case "weekly":
        dateGroupExpression = sql<string>`DATE_TRUNC('week', ${schema.questions.askedAt})`;
        break;
      case "daily":
      default:
        dateGroupExpression = sql<string>`DATE_TRUNC('day', ${schema.questions.askedAt})`;
        break;
    }
    
    // Get temporal data
    const temporalData = await db
      .select({
        date: dateGroupExpression,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(dateGroupExpression)
      .orderBy(dateGroupExpression);
    
    // Format the response
    const trends = temporalData.map((item) => ({
      date: item.date,
      count: item.count,
    }));
    
    return c.json({
      interval: selectedInterval,
      trends,
    });
  })
  
  // Keywords extraction from questions
  .get("/keywords", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    const { limit: limitParam } = c.req.query();
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Fetch all questions
    const questions = await db
      .select({ prompt: schema.questions.prompt })
      .from(schema.questions)
      .where(dateFilter);
    
    // Common stop words to filter out
    const stopWords = new Set([
      "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
      "has", "he", "in", "is", "it", "its", "of", "on", "that", "the",
      "to", "was", "will", "with", "i", "you", "this", "can", "do",
      "how", "what", "when", "where", "which", "who", "why", "my", "me",
      "am", "im", "get", "make", "use", "using", "used", "does", "did",
    ]);
    
    // Extract and count keywords
    const wordFrequency = new Map<string, number>();
    
    for (const question of questions) {
      // Tokenize: split by non-alphanumeric, convert to lowercase
      const words = question.prompt
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => {
          return (
            word.length > 2 && // At least 3 characters
            !stopWords.has(word) &&
            !/^\d+$/.test(word) // Not purely numeric
          );
        });
      
      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }
    
    // Convert to array and sort by frequency
    const keywords = Array.from(wordFrequency.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return c.json({
      keywords,
      totalQuestions: questions.length,
    });
  })
  
  // Repository trends
  .get("/repositories", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get repository distribution
    const repoStats = await db
      .select({
        repository: schema.questions.githubRepo,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.githubRepo)
      .orderBy(desc(count()));
    
    const total = repoStats.reduce((sum, item) => sum + item.count, 0);
    
    const repositories = repoStats.map((item) => ({
      repository: item.repository || "none",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ repositories });
  })
  
  // IDE usage trends
  .get("/ides", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get IDE distribution
    const ideStats = await db
      .select({
        ide: schema.questions.sourceIde,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.sourceIde)
      .orderBy(desc(count()));
    
    const total = ideStats.reduce((sum, item) => sum + item.count, 0);
    
    const ides = ideStats.map((item) => ({
      ide: item.ide || "unknown",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ ides });
  })
  
  // Framework usage trends
  .get("/frameworks", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get framework distribution
    const frameworkStats = await db
      .select({
        framework: schema.questions.framework,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.framework)
      .orderBy(desc(count()));
    
    const total = frameworkStats.reduce((sum, item) => sum + item.count, 0);
    
    const frameworks = frameworkStats.map((item) => ({
      framework: item.framework || "none",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ frameworks });
  })
  
  // Runtime environment trends
  .get("/runtimes", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get runtime distribution
    const runtimeStats = await db
      .select({
        runtime: schema.questions.runtime,
        count: count(),
      })
      .from(schema.questions)
      .where(dateFilter)
      .groupBy(schema.questions.runtime)
      .orderBy(desc(count()));
    
    const total = runtimeStats.reduce((sum, item) => sum + item.count, 0);
    
    const runtimes = runtimeStats.map((item) => ({
      runtime: item.runtime || "none",
      count: item.count,
      percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
    }));
    
    return c.json({ runtimes });
  })
  
  // Answer quality metrics
  .get("/answer-quality", zodValidator("query", ZDateRangeQuery), async (c) => {
    const db = c.var.db;
    const { start, end } = c.req.valid("query");
    
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    
    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);
      dateStart = new Date(Date.UTC(parsedStart.getUTCFullYear(), parsedStart.getUTCMonth(), parsedStart.getUTCDate()));
      dateEnd = new Date(Date.UTC(parsedEnd.getUTCFullYear(), parsedEnd.getUTCMonth(), parsedEnd.getUTCDate() + 1));
    }
    
    const dateFilter = dateStart && dateEnd
      ? and(gte(schema.questions.askedAt, dateStart), lt(schema.questions.askedAt, dateEnd))
      : undefined;
    
    // Get all questions with their answers
    const questionsData = dateFilter
      ? await db
          .select({
            questionId: schema.questions.id,
            askedAt: schema.questions.askedAt,
          })
          .from(schema.questions)
          .where(dateFilter)
      : await db
          .select({
            questionId: schema.questions.id,
            askedAt: schema.questions.askedAt,
          })
          .from(schema.questions);
    
    let totalAnswers = 0;
    let questionsWithAnswers = 0;
    let questionsWithMultipleAnswers = 0;
    const responseTimes: number[] = [];
    
    for (const question of questionsData) {
      const answers = await db
        .select({
          createdAt: schema.answers.createdAt,
        })
        .from(schema.answers)
        .where(eq(schema.answers.questionId, question.questionId));
      
      if (answers.length > 0) {
        questionsWithAnswers++;
        totalAnswers += answers.length;
        
        if (answers.length > 1) {
          questionsWithMultipleAnswers++;
        }
        
        // Calculate time to first answer (in seconds)
        const firstAnswer = answers.reduce((earliest, answer) => {
          return answer.createdAt < earliest ? answer.createdAt : earliest;
        }, answers[0].createdAt);
        
        const responseTime = (firstAnswer.getTime() - question.askedAt.getTime()) / 1000;
        responseTimes.push(responseTime);
      }
    }
    
    // Calculate average response time
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;
    
    // Calculate median response time
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const medianResponseTime =
      sortedTimes.length > 0
        ? sortedTimes.length % 2 === 0
          ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
          : sortedTimes[Math.floor(sortedTimes.length / 2)]
        : 0;
    
    const totalQuestions = questionsData.length;
    const unansweredQuestions = totalQuestions - questionsWithAnswers;
    
    return c.json({
      quality: {
        totalQuestions,
        questionsWithAnswers,
        unansweredQuestions,
        questionsWithMultipleAnswers,
        totalAnswers,
        questionAnswerRate: totalQuestions > 0 ? Number((questionsWithAnswers / totalQuestions).toFixed(3)) : 0,
        avgAnswersPerQuestion: questionsWithAnswers > 0 ? Number((totalAnswers / questionsWithAnswers).toFixed(2)) : 0,
        avgResponseTimeSeconds: Number(avgResponseTime.toFixed(2)),
        medianResponseTimeSeconds: Number(medianResponseTime.toFixed(2)),
      },
    });
  });

export default trends;

