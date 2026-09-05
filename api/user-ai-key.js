import { deleteUserGeminiKey, saveUserGeminiKey, userKeyStatus } from "../lib/user-ai-key.js";
import { jsonBody, requireUser, sendError } from "../lib/supabase-auth.js";

function validGeminiKey(value) {
  return /^[A-Za-z0-9_\-.]{20,200}$/.test(String(value || "").trim()) && !/REPLACE_ME|YOUR[_-]?KEY/i.test(value);
}

async function testGeminiKey(apiKey) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return;
  const error = new Error("API key Gemini ditolak atau belum memiliki akses.");
  error.status = response.status === 429 ? 429 : 400;
  error.publicMessage = response.status === 429
    ? "API key Gemini valid, tetapi kuotanya sedang terkena batas. Gunakan project Gemini lain atau coba lagi nanti."
    : "API key Gemini ditolak. Periksa kembali key dan project Google AI Studio Anda.";
  throw error;
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
    await testGeminiKey(apiKey);
    await saveUserGeminiKey(token, user.id, apiKey);
    return response.status(200).json({ ok: true, provider: "gemini", keyHint: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` });
  } catch (cause) { return sendError(response, cause); }
}
