import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { registerOAuthRoutes } from "../server/_core/oauth";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check Endpoints
app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth and Dev Login Routes
registerOAuthRoutes(app);

// tRPC Express Middleware
const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.error(`[tRPC Serverless Notice] path='${path}':`, error.message);
  },
});

// Match all possible tRPC URL paths produced by Vercel serverless rewrites
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);
app.use((req, res, next) => {
  const url = req.url || "";
  if (
    url.startsWith("/api/health") ||
    url.startsWith("/health") ||
    url.startsWith("/api/oauth") ||
    url.startsWith("/oauth") ||
    url.startsWith("/api/auth") ||
    url.startsWith("/auth")
  ) {
    return next();
  }
  return trpcMiddleware(req, res, next);
});

// Global Error Catch-All
app.use((err: any, _req: any, res: any, _next: any) => {
  console.warn("[Serverless Handler Notice]:", err.message || err);
  res.status(200).json({
    error: err.message || "Internal Notice",
    status: "handled",
  });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
