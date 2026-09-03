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

export async function loadSchoolMemory(token, userId, schoolId, sourceLimit = 8) {
  await requireSchoolAccess(token, userId, schoolId);
  const { url, key } = publicSupabaseSettings();
  const headers = { apikey: key, Authorization: `Bearer ${token}` };
  const schoolQuery = new URLSearchParams({ select: "*", id: `eq.${schoolId}`, owner_user_id: `eq.${userId}`, limit: "1" });
  const sourcesQuery = new URLSearchParams({
    select: "id,name,mime_type,status,summary,extracted_text,created_at",
    school_id: `eq.${schoolId}`,
    order: "created_at.desc",
    limit: String(Math.min(Math.max(Number(sourceLimit) || 8, 1), 12)),
  });
  const [schoolResponse, sourcesResponse] = await Promise.all([
    fetch(`${url}/rest/v1/kepsek_schools?${schoolQuery}`, { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`${url}/rest/v1/kepsek_sources?${sourcesQuery}`, { headers, signal: AbortSignal.timeout(10_000) }),
  ]);
  if (!schoolResponse.ok || !sourcesResponse.ok) {
    const error = new Error("Memori sekolah belum dapat dibaca.");
    error.status = 502;
    error.publicMessage = "Memori Sekolah belum dapat dibaca. Coba masuk kembali lalu ulangi.";
    throw error;
  }
  const [schools, sources] = await Promise.all([schoolResponse.json(), sourcesResponse.json()]);
  if (!schools.length) {
    const error = new Error("Workspace sekolah tidak ditemukan.");
    error.status = 404;
    throw error;
  }
  const row = schools[0];
  const context = row.school_context && typeof row.school_context === "object" ? row.school_context : {};
  return {
    school: {
      id: row.id,
      name: row.name,
      npsn: row.npsn,
      level: row.level,
      status: row.status,
      address: context.address || "",
      principal_name: context.principal_name || "",
      academic_year: context.academic_year || row.academic_year || "",
      profile_data: context.profile_data && typeof context.profile_data === "object" ? context.profile_data : {},
    },
    sources: Array.isArray(sources) ? sources : [],
  };
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
  const publicMessage = cause?.publicMessage || (status >= 500 ? "Layanan belum dapat memproses permintaan. Silakan coba lagi." : cause.message);
  response.status(status).json({ error: publicMessage, code: cause?.code || "REQUEST_FAILED" });
}
