const API = "https://api.groq.com/openai/v1";
const PREFERRED = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
const envGroups = [["GROQ_API_KEY_1", "GROQ_API_KEY"], ["GROQ_API_KEY_2"], ["GROQ_API_KEY_3"]];
const clean = v => { const s = String(v || "").trim(); return s.startsWith("gsk_") && s.length >= 24 ? s : ""; };
export function configuredKeys() { return [...new Set(envGroups.map(names => names.map(n => clean(process.env[n])).find(Boolean)).filter(Boolean))]; }
export function keyCount() { return configuredKeys().length; }
function fail(message, status = 503) { const e = new Error(message); e.publicMessage = message; e.status = status; return e; }
async function modelsFor(key, vision = false) {
  const response = await fetch(API + "/models", { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(12000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw fail(response.status === 401 ? "API key Groq tidak valid." : payload.error?.message || "Groq belum dapat memeriksa model.", response.status);
  const available = (payload.data || []).filter(m => m.active !== false).map(m => m.id);
  const ids = available.filter(id => vision ? /vision|scout|maverick/i.test(id) : !/guard|whisper|tts|audio|speech|transcri|vision|image|embed/i.test(id));
  return [...PREFERRED.filter(id => ids.includes(id)), ...ids.filter(id => !PREFERRED.includes(id))];
}
async function invoke({ userKey = "", seed = "", systemInstruction, messages, maxOutputTokens = 4096, temperature = 0.25, vision = false }) {
  const keys = [...configuredKeys(), clean(userKey)].filter(Boolean);
  if (!keys.length) throw fail("API key Groq belum tersedia. Masukkan key pribadi melalui Pengaturan AI.", 503);
  let lastError;
  for (const key of [...new Set(keys)]) {
    let models;
    try { models = await modelsFor(key, vision); } catch (error) { lastError = error; continue; }
    if (!models.length) { lastError = fail(vision ? "Akun Groq ini belum memiliki model yang mampu membaca gambar." : "Tidak ada model chat Groq aktif pada akun ini.", 403); continue; }
    for (const model of models) {
      let response;
      try {
        response = await fetch(API + "/chat/completions", {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(55000),
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemInstruction }, ...messages],
            temperature,
            max_completion_tokens: Math.min(maxOutputTokens, 8192)
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw fail(payload.error?.message || "Permintaan ke Groq ditolak.", response.status);
        const text = String(payload.choices?.[0]?.message?.content || "").trim();
        if (!text) throw fail("Model Groq tidak menghasilkan teks.", 502);
        return { text, metadata: { provider: "groq", model, keyScope: key === clean(userKey) ? "personal" : "application", usage: payload.usage || null } };
      } catch (error) {
        lastError = error;
        if (error.status === 429) break;
        if (![400, 401, 403, 404, 408, 429, 500, 502, 503, 504].includes(Number(error.status))) break;
      }
    }
  }
  throw fail(lastError?.status === 429 ? "Kuota Groq sedang dibatasi. Coba lagi nanti atau gunakan key pribadi lain." : "Seluruh model Groq yang tersedia gagal merespons. " + (lastError?.message || ""), lastError?.status || 503);
}
function parseJson(text) {
  const cleaned = String(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(cleaned.slice(a, b + 1)); } catch {} }
    return { title: "Dokumen Sekolah", summary: "Perlu peninjauan manual", content: cleaned, assumptions: [], sources: [] };
  }
}
export async function generateStructured({ systemInstruction, parts = [], seed = "", maxOutputTokens = 4096, responseSchema, temperature = 0.2, userKey = "" }) {
  const images = parts.filter(p => p.inlineData);
  if (images.some(p => !String(p.inlineData.mimeType).startsWith("image/"))) throw fail("Groq tidak membaca PDF secara langsung pada jalur ini. File tetap dapat disimpan; masukkan teks hasil ekstraksi untuk dianalisis.", 415);
  const content = parts.filter(p => p.text).map(p => ({ type: "text", text: p.text }));
  for (const item of images) content.push({ type: "image_url", image_url: { url: "data:" + item.inlineData.mimeType + ";base64," + item.inlineData.data } });
  const prompt = (responseSchema ? "Kembalikan HANYA objek JSON valid mengikuti skema ini: " + JSON.stringify(responseSchema).slice(0,12000) + "\n" : "") + "Dilarang mengarang fakta sumber.";
  const result = await invoke({ systemInstruction: systemInstruction + "\n" + prompt, messages: [{ role: "user", content }], seed, maxOutputTokens, temperature, userKey, vision: images.length > 0 });
  return { ...parseJson(result.text), metadata: result.metadata };
}
export async function generateGroundedText({ systemInstruction, prompt, seed = "", maxOutputTokens = 3072, temperature = 0.1, userKey = "" }) {
  const result = await invoke({ systemInstruction: systemInstruction + "\nTidak ada akses pencarian web pada panggilan ini. Jangan mengklaim sudah memverifikasi peraturan terbaru secara daring. Nyatakan sumber resmi perlu diperiksa manual.", messages: [{ role: "user", content: prompt }], seed, maxOutputTokens, temperature, userKey });
  return { text: result.text, sources: [], metadata: { ...result.metadata, liveGrounding: false } };
}
export async function generateConversation({ systemInstruction, history = [], message, seed = "", maxOutputTokens = 4096, userKey = "" }) {
  const messages = history.slice(-16).map(h => ({ role: h.role === "assistant" || h.role === "model" ? "assistant" : "user", content: String(h.content || "").slice(0,8000) })).filter(m => m.content.trim());
  messages.push({ role: "user", content: String(message) });
  const result = await invoke({ systemInstruction, messages, seed, maxOutputTokens, temperature: 0.55, userKey });
  return { reply: result.text, metadata: result.metadata };
}
