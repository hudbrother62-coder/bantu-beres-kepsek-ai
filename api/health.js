import { keyCount } from "../lib/groq.js";
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
      groq: keyCount() > 0,
      groqKeyCount: keyCount(),
      modelSelection: "automatic",

    },
  });
}
