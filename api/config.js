import { keyCount } from "../lib/gemini.js";
import { publicSupabaseSettings } from "../lib/public-config.js";

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  response.setHeader("Cache-Control", "no-store, max-age=0");
  const { url: supabaseUrl, key: supabasePublishableKey } = publicSupabaseSettings();
  response.status(200).json({
    configured: Boolean(supabaseUrl && supabasePublishableKey),
    aiConfigured: keyCount() > 0,
    supabaseUrl,
    supabasePublishableKey,
    maxInlineFileBytes: Number(process.env.MAX_INLINE_FILE_BYTES || 3_000_000),
  });
}
