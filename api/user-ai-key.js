import { deleteUserGeminiKey, saveUserGeminiKey, userKeyStatus } from "../lib/user-ai-key.js";
import { jsonBody, requireUser, sendError } from "../lib/supabase-auth.js";

function validGeminiKey(value) {
  return /^[A-Za-z0-9_\-.]{20,200}$/.test(String(value || "").trim()) && !/REPLACE_ME|YOUR[_-]?KEY/i.test(value);
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const { user, token } = await requireUser(request);
    if (request.method === "GET") return response.status(200).json({ providers: await userKeyStatus(token, user.id) });
    if (request.method === "DELETE") { await deleteUserGeminiKey(token, user.id); return response.status(200).json({ ok: true }); }
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    const apiKey = String(jsonBody(request, 2_000).apiKey || "").trim();
    if (!validGeminiKey(apiKey)) return response.status(400).json({ error: "Masukkan API key Gemini yang valid." });
    await saveUserGeminiKey(token, user.id, apiKey);
    return response.status(200).json({ ok: true, provider: "gemini", keyHint: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` });
  } catch (cause) { return sendError(response, cause); }
}
