import { generateStructured } from "../lib/gemini.js";
import { jsonBody, requireSchoolAccess, requireUser, sendError } from "../lib/supabase-auth.js";

const allowedTypes = new Set(["ksp", "pbd", "rkjm", "rkt", "rkas", "activity", "sop", "performance"]);

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  response.setHeader("Cache-Control", "no-store, max-age=0");
  try {
    const { user, token } = await requireUser(request);
    const body = jsonBody(request, 1_500_000);
    const type = String(body.type || "");
    const prompt = String(body.prompt || "").trim();
    const school = body.context?.school;
    if (!allowedTypes.has(type)) {
      const error = new Error("Jenis dokumen belum didukung."); error.status = 400; throw error;
    }
    if (prompt.length < 10 || prompt.length > 12_000) {
      const error = new Error("Instruksi harus terdiri dari 10 sampai 12.000 karakter."); error.status = 400; throw error;
    }
    await requireSchoolAccess(token, user.id, school?.id);

    const sourceContext = (body.context?.sources || []).slice(0, 8).map((source, index) => `SUMBER ${index + 1}: ${source.name}\nRingkasan: ${source.summary || "-"}\nIsi yang diekstrak:\n${String(source.text || "").slice(0, 8_000)}`).join("\n\n");
    const schoolContext = JSON.stringify({
      name: school.name,
      npsn: school.npsn,
      level: school.level,
      address: school.address,
      principal_name: school.principal_name,
      academic_year: school.academic_year,
      profile_data: school.profile_data,
    }, null, 2);

    const systemInstruction = `Anda adalah KEPSEK AI, asisten penyusunan dokumen khusus kepala sekolah di Indonesia.
Tugas Anda membantu menyusun DRAFT, bukan mengesahkan dokumen atau menggantikan sistem resmi pemerintah.

ATURAN WAJIB:
1. Gunakan hanya data sekolah dan sumber yang diberikan.
2. Jangan mengarang nama, NPSN, jumlah, tanggal, dasar hukum, anggaran, atau fakta sekolah.
3. Informasi yang belum tersedia harus ditulis [PERLU DIKONFIRMASI].
4. Gunakan bahasa Indonesia formal, jelas, dan mudah dipahami.
5. Jaga konsistensi hubungan kondisi sekolah, prioritas, program, indikator, kegiatan, dan anggaran.
6. Untuk RKAS/BOSP, nyatakan bahwa hasil adalah draft yang wajib diverifikasi terhadap regulasi dan dimasukkan ke ARKAS.
7. Jangan membuat tanda tangan atau menyatakan dokumen telah disahkan.
8. Kembalikan JSON valid tanpa markdown fence dengan struktur:
{"title":"...","summary":"...","content":"dokumen lengkap dalam teks dengan judul dan bagian yang jelas","assumptions":["..."],"missingFields":["..."],"sources":["nama sumber yang benar-benar dipakai"],"consistencyChecks":[{"label":"...","status":"ok|warning","note":"..."}]}`;

    const result = await generateStructured({
      systemInstruction,
      seed: `${user.id}:${school.id}:${type}`,
      parts: [{ text: `JENIS PEKERJAAN: ${type}\n\nINSTRUKSI KEPALA SEKOLAH:\n${prompt}\n\nPROFIL SEKOLAH:\n${schoolContext}\n\nDOKUMEN SUMBER:\n${sourceContext || "Belum ada dokumen sumber tambahan."}` }],
    });

    response.status(200).json(result);
  } catch (cause) {
    const status = Number(cause.status || cause.statusCode || 500);
    if (status >= 500) {
      console.error("generate failed", { code: cause.code, status, message: cause.message });
    }
    sendError(response, cause);
  }
}
