/**
 * Vercel Serverless entry point.
 *
 * Vercel does NOT run a persistent Express process (`npm run dev` /
 * `node dist/server.cjs` will never execute there). Instead, every request
 * matching /api/* (rewritten by vercel.json) is handled by this serverless
 * function, which delegates to the same Express app defined in server.ts.
 *
 * Static frontend files (dist/) are served separately by Vercel's CDN.
 *
 * NOTE: the JSON database lives in /tmp on Vercel (read-only deployment FS),
 * so data is seeded from getInitialData() on each cold start and persists
 * only while the lambda instance is warm. For durable storage, connect a
 * real database (Neon/Supabase/MongoDB Atlas) or host the Express server on
 * a long-running platform (Cloud Run / Render / Railway / VPS).
 */
import type { Request, Response } from "express";
import app from "../server";

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
