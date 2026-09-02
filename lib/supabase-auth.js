import { publicSupabaseSettings } from "./public-config.js";

export function bearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(request) {
  const token = bearerToken(request);
  if (!token) {
    const error = new Error("Silakan masuk untuk menggunakan fitur AI.");
    error.status = 401;
    throw error;
  }
  const { url, key } = publicSupabaseSettings();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error("Sesi tidak valid atau sudah berakhir.");
    error.status = 401;
    throw error;
  }
  return { user: await response.json(), token };
}

export async function requireSchoolAccess(token, userId, schoolId) {
  if (!schoolId) {
    const error = new Error("Workspace sekolah belum dipilih.");
    error.status = 400;
    throw error;
  }
  const { url, key } = publicSupabaseSettings();
  const query = new URLSearchParams({
    select: "id",
    id: `eq.${schoolId}`,
    owner_user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await fetch(`${url}/rest/v1/kepsek_schools?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error("Akses workspace sekolah tidak dapat diverifikasi.");
    error.status = 403;
    throw error;
  }
  const rows = await response.json();
  if (!rows.length) {
    const error = new Error("Anda tidak memiliki akses ke workspace sekolah ini.");
    error.status = 403;
    throw error;
  }
  return { role: "owner", schoolId: rows[0].id };
}

export function jsonBody(request, maximumBytes = 1_000_000) {
  const body = request.body || {};
  const size = Buffer.byteLength(JSON.stringify(body));
  if (size > maximumBytes) {
    const error = new Error("Ukuran permintaan terlalu besar.");
    error.status = 413;
    throw error;
  }
  return body;
}

export function sendError(response, cause) {
  const status = Number(cause?.status) || 500;
  const publicMessage = status >= 500 ? "Layanan belum dapat memproses permintaan. Silakan coba lagi." : cause.message;
  response.status(status).json({ error: publicMessage, code: cause?.code || "REQUEST_FAILED" });
}
