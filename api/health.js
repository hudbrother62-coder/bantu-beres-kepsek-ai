import { keyCount } from "../lib/gemini.js";
import { publicSupabaseSettings } from "../lib/public-config.js";

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  response.setHeader("Cache-Control", "no-store, max-age=0");
  const { url, key } = publicSupabaseSettings();
  response.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    services: {
      supabase: Boolean(url && key),
      gemini: keyCount() > 0,
      geminiKeyCount: keyCount(),
      primaryModel: process.env.GEMINI_PRIMARY_MODEL || "gemini-3.7-flash",
      fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
    },
  });
}
