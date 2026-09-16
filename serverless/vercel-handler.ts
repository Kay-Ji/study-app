/**
 * Vercel Serverless handler (source).
 *
 * Vercel does NOT run a persistent Express process. This module is bundled by
 * esbuild (see vercel.json buildCommand) into api/index.cjs, which Vercel
 * invokes for every request matching /api/* (rewritten in vercel.json).
 *
 * CRASH-PROOFING: any thrown error (module load failure, handler exception,
 * unhandled rejection) is converted into a JSON 500 response so the app UI
 * shows the REAL error message instead of an opaque empty "HTTP 500".
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
