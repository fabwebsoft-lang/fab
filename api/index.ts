import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerOAuthRoutes(app);

const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.error(`[tRPC Serverless Error] path='${path}':`, error);
  },
});

app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[Serverless Function Error]:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

export default app;
