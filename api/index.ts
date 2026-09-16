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
app.all(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth and Dev Login Routes
registerOAuthRoutes(app);

// tRPC Express Middleware
const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.warn(`[tRPC Serverless Notice] path='${path}':`, error?.message || error);
  },
});

// Route tRPC requests and strip URL prefixes cleanly
app.use((req, res, next) => {
  const rawUrl = req.url || "/";

  // If health or auth/oauth, pass to standard handlers
  if (
    rawUrl.startsWith("/api/health") ||
    rawUrl.startsWith("/health") ||
    rawUrl.startsWith("/api/oauth") ||
    rawUrl.startsWith("/oauth") ||
    rawUrl.startsWith("/api/auth") ||
    rawUrl.startsWith("/auth")
  ) {
    return next();
  }

  // Normalize tRPC path for Express createExpressMiddleware
  let trpcUrl = rawUrl;
  if (trpcUrl.startsWith("/api/trpc")) {
    trpcUrl = trpcUrl.substring("/api/trpc".length);
  } else if (trpcUrl.startsWith("/trpc")) {
    trpcUrl = trpcUrl.substring("/trpc".length);
  }

  if (!trpcUrl.startsWith("/")) {
    trpcUrl = "/" + trpcUrl;
  }

  req.url = trpcUrl;
  return trpcHandler(req, res, next);
});

// Catch-All Handler to guarantee 200 response
app.use((err: any, _req: any, res: any, _next: any) => {
  console.warn("[Serverless Handler Catch-All]:", err?.message || err);
  if (!res.headersSent) {
    res.status(200).json({
      error: err?.message || "Processed with fallback",
      status: "handled",
    });
  }
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
