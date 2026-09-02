import { generateStructured } from "../lib/gemini.js";
import { jsonBody, requireSchoolAccess, requireUser, sendError } from "../lib/supabase-auth.js";

const supportedMime = new Set(["application/pdf", "text/plain", "text/csv", "image/jpeg", "image/png", "image/webp"]);

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  response.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const { user, token } = await requireUser(request);
    const maximum = Number(process.env.MAX_INLINE_FILE_BYTES || 3_000_000);
    const body = jsonBody(request, Math.ceil(maximum * 1.5));
    await requireSchoolAccess(token, user.id, body.schoolId);
    const name = String(body.name || "dokumen");
    const mimeType = String(body.mimeType || "application/octet-stream");
    const data = String(body.data || "");
    if (!supportedMime.has(mimeType)) return response.status(200).json({ text: "", summary: "File tersimpan. Ekstraksi otomatis untuk format ini belum tersedia.", metadata: { status: "stored" } });
    if (!data || Buffer.byteLength(data, "base64") > maximum) {
      const error = new Error("File terlalu besar untuk dianalisis langsung."); error.status = 413; throw error;
    }
    const result = await generateStructured({
      systemInstruction: `Anda membaca dokumen sekolah untuk membangun Memori Sekolah. Ekstrak fakta tanpa mengarang. Kembalikan JSON valid: {"summary":"ringkasan singkat","text":"teks/fakta penting yang dapat digunakan kembali","documentType":"jenis dokumen","schoolFacts":[{"field":"nama field","value":"nilai","confidence":"high|medium|low"}],"warnings":["data yang perlu diverifikasi"]}.`,
      seed: `${user.id}:${body.schoolId}:${name}`,
      maxOutputTokens: 4096,
      parts: [{ text: `Nama file: ${name}. Baca dokumen ini dan ekstrak fakta yang relevan bagi kepala sekolah.` }, { inlineData: { mimeType, data } }],
    });
    response.status(200).json({ text: result.text || result.content || "", summary: result.summary || "Dokumen berhasil dianalisis", metadata: result.metadata, schoolFacts: result.schoolFacts || [], warnings: result.warnings || [] });
  } catch (cause) {
    console.error("file analysis failed", { code: cause.code, status: cause.status, message: cause.message });
    sendError(response, cause);
  }
}
