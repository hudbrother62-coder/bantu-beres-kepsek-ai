const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

function settings() {
  const keys = [process.env.GEMINI_AUTH_KEY_1, process.env.GEMINI_AUTH_KEY_2, process.env.GEMINI_AUTH_KEY_3].filter(Boolean);
  if (!keys.length) {
    const error = new Error("Gemini API key belum dikonfigurasi.");
    error.status = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  return {
    keys,
    primaryModel: process.env.GEMINI_PRIMARY_MODEL || "gemini-3.7-flash",
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite",
  };
}

function hashSeed(value = "") {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function rotatedKeys(keys, seed) {
  const start = hashSeed(seed) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)].map((key, index) => ({ key, slot: ((start + index) % keys.length) + 1 }));
}

function transient(status) {
  return status === 408 || status === 429 || status >= 500;
}

async function requestModel({ model, key, body, timeoutMs = 55_000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload?.error?.message || `Gemini returned ${response.status}`);
      error.status = response.status;
      error.retryable = transient(response.status);
      throw error;
    }
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) {
      const error = new Error("Gemini tidak menghasilkan teks.");
      error.status = 502;
      error.retryable = true;
      throw error;
    }
    return { text, usage: payload.usageMetadata || null };
  } catch (cause) {
    if (cause.name === "AbortError") {
      const error = new Error("Permintaan AI melewati batas waktu.");
      error.status = 504;
      error.retryable = true;
      throw error;
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

function parseStructured(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fallback below */ }
    }
    return { title: "Draft Dokumen Sekolah", summary: "Draft berhasil disusun dan perlu ditinjau.", content: cleaned, assumptions: [], sources: [] };
  }
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function generateStructured({ systemInstruction, parts, seed = "request", maxOutputTokens = 8192 }) {
  const config = settings();
  const keys = rotatedKeys(config.keys, seed);
  const models = [...new Set([config.primaryModel, config.fallbackModel])];
  const attempts = [];
  let lastError;

  for (const model of models) {
    for (const candidate of keys) {
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          const response = await requestModel({
            model,
            key: candidate.key,
            body: {
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature: 0.25,
                topP: 0.9,
                maxOutputTokens,
                responseMimeType: "application/json",
              },
            },
          });
          const result = parseStructured(response.text);
          return { ...result, metadata: { model, keySlot: candidate.slot, attempts: attempts.length + 1, usage: response.usage } };
        } catch (cause) {
          lastError = cause;
          attempts.push({ model, keySlot: candidate.slot, status: cause.status || 500, retry });
          if ([401, 403].includes(cause.status)) break;
          if (!cause.retryable) throw cause;
          if (cause.status === 429) break;
          if (retry === 0) await sleep(350 + Math.floor(Math.random() * 250));
        }
      }
    }
  }

  const error = new Error(lastError?.status === 429 ? "Kapasitas AI sedang penuh. Permintaan dapat dicoba kembali beberapa saat lagi." : "Semua jalur model AI sementara belum tersedia.");
  error.status = lastError?.status === 429 ? 429 : 503;
  error.code = "AI_CAPACITY_UNAVAILABLE";
  throw error;
}

export function keyCount() {
  return [process.env.GEMINI_AUTH_KEY_1, process.env.GEMINI_AUTH_KEY_2, process.env.GEMINI_AUTH_KEY_3].filter(Boolean).length;
}
