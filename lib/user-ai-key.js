import crypto from "node:crypto";
import { publicSupabaseSettings } from "./public-config.js";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const raw = String(process.env.BYOK_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    const error = new Error("BYOK_ENCRYPTION_KEY belum dikonfigurasi.");
    error.status = 503;
    error.publicMessage = "Penyimpanan API key pribadi belum diaktifkan oleh administrator.";
    throw error;
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptApiKey(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptApiKey(value) {
  const [ivText, tagText, dataText] = String(value || "").split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Ciphertext API key tidak valid.");
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
}

function supabaseRequest(token, path, options = {}) {
  const { url, key } = publicSupabaseSettings();
  return fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(10_000),
  });
}

export async function getUserGeminiKey(token, userId) {
  const query = new URLSearchParams({ select: "encrypted_key", user_id: `eq.${userId}`, provider: "eq.gemini", limit: "1" });
  const response = await supabaseRequest(token, `kepsek_user_ai_keys?${query}`);
  if (!response.ok) return "";
  const rows = await response.json();
  return rows[0]?.encrypted_key ? decryptApiKey(rows[0].encrypted_key) : "";
}

export async function saveUserGeminiKey(token, userId, apiKey) {
  const response = await supabaseRequest(token, "kepsek_user_ai_keys?on_conflict=user_id%2Cprovider", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, provider: "gemini", encrypted_key: encryptApiKey(apiKey), key_hint: `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` }),
  });
  if (!response.ok) throw new Error("API key pribadi belum dapat disimpan.");
}

export async function deleteUserGeminiKey(token, userId) {
  const query = new URLSearchParams({ user_id: `eq.${userId}`, provider: "eq.gemini" });
  const response = await supabaseRequest(token, `kepsek_user_ai_keys?${query}`, { method: "DELETE" });
  if (!response.ok) throw new Error("API key pribadi belum dapat dihapus.");
}

export async function userKeyStatus(token, userId) {
  const query = new URLSearchParams({ select: "provider,key_hint,updated_at", user_id: `eq.${userId}`, order: "updated_at.desc" });
  const response = await supabaseRequest(token, `kepsek_user_ai_keys?${query}`);
  if (!response.ok) return [];
  return response.json();
}
