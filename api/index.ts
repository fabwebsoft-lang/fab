import "dotenv/config";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

process.on("unhandledRejection", (reason: any) => {
  console.error("[Serverless Unhandled Rejection]:", reason?.stack || reason);
});

process.on("uncaughtException", (error: any) => {
  console.error("[Serverless Uncaught Exception]:", error?.stack || error);
});

export default async function handler(req: any, res: any) {
  try {
    const rawUrl =
      (req.headers["x-matched-path"] as string) ||
      (req.headers["x-vercel-matched-path"] as string) ||
      req.url ||
      "/";

    let path = rawUrl.split("?")[0] || "";

    if (path.startsWith("/api/trpc/")) {
      path = path.substring("/api/trpc/".length);
    } else if (path.startsWith("/api/trpc")) {
      path = path.substring("/api/trpc".length);
    } else if (path.startsWith("/trpc/")) {
      path = path.substring("/trpc/".length);
    } else if (path.startsWith("/trpc")) {
      path = path.substring("/trpc".length);
    } else if (path.startsWith("/api/")) {
      path = path.substring("/api/".length);
    }

    path = path.replace(/^\/+/, "");

    if (path === "health" || path === "api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
      return;
    }

    return await nodeHTTPRequestHandler({
      req,
      res,
      router: appRouter,
      createContext: () => createContext({ req, res } as any),
      path,
      onError({ error, path: errPath }) {
        console.error(`[tRPC Serverless Handler] path='${errPath}':`, error?.stack || error?.message || error);
      },
    });
  } catch (err: any) {
    console.error("[Serverless Handler Top-Level Error]:", err?.stack || err);
    if (!res.headersSent) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Internal Exception Handled", status: "handled" }));
    }
  }
}
