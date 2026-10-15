import { NextResponse } from "next/server";

function buildEntry(level, message, meta) {
  return { level, message, time: new Date().toISOString(), ...meta };
}

// Structured JSON once deployed (so Vercel's log drain / any log-based
// monitoring can parse it), readable console output locally.
function emit(level, message, meta = {}) {
  const appEnv = process.env.APP_ENV || "development";
  const writer = level === "error" ? console.error : console.log;
  if (appEnv === "development") {
    writer(`[${level.toUpperCase()}] ${message}`, meta);
  } else {
    writer(JSON.stringify(buildEntry(level, message, meta)));
  }
}

export const logger = {
  info: (message, meta) => emit("info", message, meta),
  warn: (message, meta) => emit("warn", message, meta),
  error: (message, meta) => emit("error", message, meta)
};

// Wraps a route handler so an unexpected throw gets logged server-side with
// its stack trace, but the client only ever sees a generic 500 — never a
// leaked stack trace or internal error message.
export function withErrorLogging(handler, routeName) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error(`Unhandled error in ${routeName}`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json({ error: "internal server error" }, { status: 500 });
    }
  };
}
