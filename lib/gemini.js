const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

const keyAliases = [
  ["GEMINI_AUTH_KEY_1", "GEMINI_KEY_1", "GEMINI_API_KEY", "GOOGLE_API_KEY"],
  ["GEMINI_AUTH_KEY_2", "GEMINI_KEY_2"],
  ["GEMINI_AUTH_KEY_3", "GEMINI_KEY_3"],
];

function cleanKey(value) {
  const key = String(value || "").trim();
  if (!key || key.length < 20 || /REPLACE_ME|YOUR[_-]?(?:KEY|PROJECT)|^GEMINI_(?:AUTH_)?KEY_\d=?$/i.test(key)) return "";
  return key;
}

export function configuredKeys() {
  const keys = keyAliases.map((aliases) => aliases.map((name) => cleanKey(process.env[name])).find(Boolean)).filter(Boolean);
  return [...new Set(keys)];
}

function settings(userKey = "") {
  const keys = configuredKeys();
  if (!keys.length) {
    const error = new Error("Gemini API key belum dikonfigurasi.");
    error.publicMessage = "Kunci Gemini belum terbaca di server. Periksa Environment Variables lalu lakukan redeploy.";
    error.status = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }
  return {
    keys: [...keys, cleanKey(userKey)].filter(Boolean).filter((key, index, all) => all.indexOf(key) === index),
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
      const finishReason = payload?.candidates?.[0]?.finishReason;
      const error = new Error(finishReason ? `Gemini berhenti tanpa teks (${finishReason}).` : "Gemini tidak menghasilkan teks.");
      error.status = 502;
      error.retryable = true;
      throw error;
    }
    return { text, usage: payload.usageMetadata || null, candidate: payload?.candidates?.[0] || null };
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
  const cleaned = text.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* use readable fallback */ }
    }
    return { title: "Dokumen Sekolah", summary: "Dokumen berhasil disusun dan siap ditinjau.", content: cleaned, assumptions: [], sources: [] };
  }
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runWithFailover({ seed, makeBody, timeoutMs, userKey = "" }) {
  const config = settings(userKey);
  const keys = rotatedKeys(config.keys, seed);
  const models = [...new Set([config.primaryModel, config.fallbackModel])];
  const attempts = [];
  let lastError;

  for (const model of models) {
    for (const candidate of keys) {
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          const response = await requestModel({ model, key: candidate.key, body: makeBody(model), timeoutMs });
          return { ...response, metadata: { model, keySlot: candidate.slot, attempts: attempts.length + 1, usage: response.usage } };
        } catch (cause) {
          lastError = cause;
          attempts.push({ model, keySlot: candidate.slot, status: cause.status || 500, retry });
          if ([400, 401, 403, 404].includes(cause.status)) break;
          if (!cause.retryable) throw cause;
          if (cause.status === 429) break;
          if (retry === 0) await sleep(350 + Math.floor(Math.random() * 250));
        }
      }
    }
  }

  const rejected = attempts.length && attempts.every((attempt) => [401, 403].includes(attempt.status));
  const unavailableModel = attempts.length && attempts.every((attempt) => [400, 404].includes(attempt.status));
  const error = new Error(
    rejected ? "Semua kunci Gemini ditolak oleh Google." :
    unavailableModel ? "Model Gemini yang dikonfigurasi tidak tersedia." :
    lastError?.status === 429 ? "Kapasitas AI sedang penuh." :
    "Semua jalur model AI sementara belum tersedia."
  );
  error.publicMessage = rejected
    ? "Kunci Gemini ditolak. Pastikan nilainya benar, API Generative Language diizinkan, lalu redeploy."
    : unavailableModel
      ? "Model Gemini tidak tersedia. Periksa GEMINI_PRIMARY_MODEL dan GEMINI_FALLBACK_MODEL."
      : lastError?.status === 429
        ? "Kapasitas AI sedang penuh. Coba kembali beberapa saat lagi."
        : "Layanan Gemini belum merespons. Coba kembali beberapa saat lagi.";
  error.status = lastError?.status === 429 ? 429 : 503;
  error.code = rejected ? "AI_CREDENTIALS_REJECTED" : unavailableModel ? "AI_MODEL_UNAVAILABLE" : "AI_CAPACITY_UNAVAILABLE";
  throw error;
}

export async function generateStructured({ systemInstruction, parts, seed = "request", maxOutputTokens = 8192, responseSchema, temperature = 0.2, topP = 0.9, userKey = "" }) {
  const response = await runWithFailover({
    seed, userKey,
    makeBody: () => ({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
        topP,
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(responseSchema ? { responseSchema } : {}),
      },
    }),
  });
  const result = parseStructured(response.text);
  return { ...result, metadata: response.metadata };
}

function groundingSources(candidate) {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const sources = chunks.map((chunk) => ({
    title: String(chunk?.web?.title || "Sumber resmi").trim(),
    url: String(chunk?.web?.uri || "").trim(),
  })).filter((item) => item.url);
  return [...new Map(sources.map((item) => [item.url, item])).values()];
}

export async function generateGroundedText({ systemInstruction, prompt, seed = "grounded-request", maxOutputTokens = 3072, temperature = 0.1, userKey = "" }) {
  const response = await runWithFailover({
    seed, userKey,
    timeoutMs: 60_000,
    makeBody: () => ({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature, topP: 0.85, maxOutputTokens },
    }),
  });
  return { text: response.text, sources: groundingSources(response.candidate), metadata: response.metadata };
}

export async function generateConversation({ systemInstruction, history = [], message, seed = "conversation", maxOutputTokens = 4096, userKey = "" }) {
  const safeHistory = history.slice(-16).map((item) => ({
    role: item.role === "assistant" || item.role === "model" ? "model" : "user",
    parts: [{ text: String(item.content || "").slice(0, 8_000) }],
  })).filter((item) => item.parts[0].text.trim());
  const response = await runWithFailover({
    seed, userKey,
    makeBody: () => ({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [...safeHistory, { role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.55, topP: 0.92, maxOutputTokens },
    }),
  });
  return { reply: response.text, metadata: response.metadata };
}

export function keyCount() {
  return configuredKeys().length;
}
