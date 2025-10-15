import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";
import { type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { dbProvider } from "./middleware/dbProvider";
import httpHandler from "./mcp/server";
import * as schema from "./db/schema";
import api from "./api";

type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    db: NeonHttpDatabase<typeof schema>;
  };
};

const app = new Hono<AppEnv>()
  .route("/api", api);

app.onError((error, c) => {
  console.error(error);
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  return c.json(
    {
      message: "Something went wrong",
    },
    500,
  );
});

/**
 * Serve a simplified api specification for your API
 * As of writing, this is just the list of routes and their methods.
 */
app.get("/openapi.json", (c) => {
  return c.json(
    createOpenAPISpec(app, {
      info: {
        title: "Honc D1 App",
        version: "1.0.0",
      },
    }),
  );
});

/**
 * Mount the Fiberplane api explorer to be able to make requests against your API.
 *
 * Visit the explorer at `/fp`
 */
app.use(
  "/fp/*",
  createFiberplane({
    app,
    openapi: { url: "/openapi.json" },
  }),
);

app.use("/mcp", dbProvider);

app.all("/mcp", async (c) => {
  const response = await httpHandler(c.req.raw);
  return response;
});

export default app;
