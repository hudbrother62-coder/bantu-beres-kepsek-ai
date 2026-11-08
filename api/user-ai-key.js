import { deleteUserGroqKey, saveUserGroqKey, userKeyStatus } from "../lib/user-ai-key.js";
import { jsonBody, requireUser, sendError } from "../lib/supabase-auth.js";

function validGroqKey(value) {
  return /^gsk_[A-Za-z0-9_-]{20,220}$/.test(String(value || "").trim()) && !/REPLACE_ME|YOUR[_-]?KEY/i.test(value);
}

async function testGroqKey(apiKey) {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) return;
  const error = new Error("API key Groq ditolak atau belum memiliki akses.");
  error.status = response.status === 429 ? 429 : 400;
  error.publicMessage = response.status === 429
    ? "API key Groq terkena pembatasan kuota. Coba lagi nanti atau gunakan project GroqCloud lain."
    : "API key Groq ditolak. Periksa kembali key di GroqCloud Console.";
  throw error;
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const { user, token } = await requireUser(request);
    if (request.method === "GET") return response.status(200).json({ providers: await userKeyStatus(token, user.id) });
    if (request.method === "DELETE") { await deleteUserGroqKey(token, user.id); return response.status(200).json({ ok: true }); }
    if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
    const apiKey = String(jsonBody(request, 2_000).apiKey || "").trim();
    if (!validGroqKey(apiKey)) return response.status(400).json({ error: "Masukkan API key Groq yang valid." });
    await testGroqKey(apiKey);
    await saveUserGroqKey(token, user.id, apiKey);
    return response.status(200).json({ ok: true, provider: "groq", keyHint: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` });
  } catch (cause) { return sendError(response, cause); }
}
