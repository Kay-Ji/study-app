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
 * LỊCH SỬ DEPLOY: cơ chế "self-bundled" api/index.cjs (PR #9/#10 — bundle
 * esbuild sẵn + buildCommand rebuild trên Vercel) khiến MỌI deployment fail
 * kể từ 16/09/2026. Đã quay lại đúng cấu hình thời kỳ deploy xanh (commit
 * 2edc258): api/index.ts do Vercel tự biên dịch, buildCommand chỉ là
 * `vite build`. Các cải tiến crash-proof vẫn được giữ nguyên tại đây.
 *
 * NOTE: the JSON database lives in /tmp on Vercel (read-only deployment FS),
 * so data is seeded from getInitialData() on each cold start and persists
 * only while the lambda instance is warm. For durable storage, connect a
 * real database (Neon/Supabase/MongoDB Atlas) or host the Express server on
 * a long-running platform (Cloud Run / Render / Railway / VPS).
 */
import type { Request, Response } from "express";
import app from "../server";

// Safety net: log fatal errors to Vercel function logs (Dashboard → Functions → Logs)
process.on("uncaughtException", (err) => {
  console.error("[planai] uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[planai] unhandledRejection:", err);
});

// Startup banner: appears in Vercel logs so it is immediately obvious the
// function loaded successfully (and with which runtime).
console.log(
  `[planai] api function loaded — node ${process.version}, pid ${process.pid}, ${new Date().toISOString()}`
);

export default async function handler(req: Request, res: Response) {
  try {
    return await app(req, res);
  } catch (err: any) {
    console.error("[planai] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: `Lỗi serverless function: ${err?.message || String(err)}`,
      });
    } else {
      res.end();
    }
  }
}
