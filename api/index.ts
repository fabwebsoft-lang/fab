import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";

process.on("unhandledRejection", (reason: any) => {
  console.error("[Serverless Unhandled Rejection]:", reason?.stack || reason);
});

process.on("uncaughtException", (error: any) => {
  console.error("[Serverless Uncaught Exception]:", error?.stack || error);
});

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.all(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "production",
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Notice] path='${path}':`, error?.stack || error?.message || error);
    },
  })
);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Notice] path='${path}':`, error?.stack || error?.message || error);
    },
  })
);

export default app;
