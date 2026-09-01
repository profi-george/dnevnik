import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  return NextResponse.json({
    hasTursoUrl: !!url,
    tursoUrlPreview: url ? url.slice(0, 30) + "…" : null,
    hasTursoToken: !!token,
    tursoTokenLength: token ? token.length : 0,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
}
