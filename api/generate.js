import { generateStructured } from "../lib/gemini.js";
import { jsonBody, requireSchoolAccess, requireUser, sendError } from "../lib/supabase-auth.js";

const allowedTypes = new Set(["ksp", "pbd", "rkjm", "rkt", "rkas", "activity", "sop", "performance"]);

const outputBlueprints = {
  ksp: ["Sampul dan lembar identitas", "Lembar penetapan (tanpa tanda tangan buatan)", "Karakteristik satuan pendidikan", "Visi, misi, dan tujuan", "Pengorganisasian pembelajaran", "Perencanaan pembelajaran", "Pendampingan, evaluasi, dan pengembangan profesional", "Lampiran dan daftar data yang perlu dilengkapi"],
  pbd: ["Ringkasan kondisi mutu", "Indikator prioritas", "Identifikasi masalah", "Refleksi dan akar masalah", "Rekomendasi pembenahan", "Program prioritas", "Indikator keberhasilan dan target", "Rencana pemantauan"],
  rkjm: ["Dasar penyusunan", "Profil dan kondisi sekolah", "Isu strategis empat tahunan", "Tujuan dan sasaran", "Matriks program, indikator, baseline, target per tahun, dan penanggung jawab", "Tahapan pelaksanaan", "Pemantauan dan evaluasi"],
  rkt: ["Ringkasan prioritas tahunan", "Sasaran dan indikator", "Matriks program dan kegiatan", "Target, jadwal, penanggung jawab, sumber daya, dan bukti keberhasilan", "Risiko dan mitigasi", "Pemantauan dan tindak lanjut"],
  rkas: ["Ringkasan hubungan RKT dan anggaran", "Matriks program, kegiatan, volume, satuan, perkiraan biaya, sumber dana, waktu, dan penanggung jawab", "Catatan kewajaran dan kelengkapan", "Daftar item yang wajib diverifikasi terhadap juknis BOSP dan ARKAS", "Peringatan bahwa hasil belum merupakan RKAS resmi"],
  activity: ["Identitas dan tujuan kegiatan", "Program kegiatan", "Susunan panitia", "Draft SK panitia", "Draft surat tugas dan undangan", "Agenda dan daftar hadir", "Format notulen dan berita acara", "Format laporan serta evaluasi kegiatan", "Daftar lampiran/bukti"],
  sop: ["Identitas SOP", "Tujuan", "Ruang lingkup", "Dasar/acuan yang diberikan", "Definisi dan peran", "Persyaratan", "Langkah kerja berurutan dengan pelaksana, waktu, keluaran, dan kendali mutu", "Risiko dan mitigasi", "Rekaman/dokumen pendukung", "Evaluasi SOP"],
  performance: ["Ringkasan sasaran kinerja kepala sekolah", "Pemetaan aktivitas terhadap indikator", "Daftar bukti dukung", "Status kelengkapan bukti", "Refleksi berbasis fakta", "Rencana tindak lanjut", "Matriks akuntabilitas dan tenggat"],
};

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

    const requiredSections = outputBlueprints[type];
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
8. Gunakan susunan khusus berikut untuk jenis dokumen ini dan tulis setiap bagiannya secara substantif: ${requiredSections.map((section, index) => `${index + 1}. ${section}`).join("; ")}.
9. Matriks harus ditulis sebagai tabel Markdown yang rapi. Setiap target harus terukur. Hubungkan setiap program dengan masalah/tujuan, indikator, target, waktu, penanggung jawab, dan bukti keberhasilan yang relevan.
10. Bedakan secara tegas: fakta dari profil, fakta dari dokumen sumber, asumsi, dan data yang belum tersedia. Jangan menyebut acuan/regulasi tertentu jika tidak ada di sumber; tandai [PERLU DIKONFIRMASI].
11. Mulai content dengan identitas dokumen, status DRAFT, nama sekolah, jenjang, NPSN, tahun pelajaran/periode jika tersedia, dan tanggal penyusunan. Gunakan heading Markdown yang jelas.
12. Kembalikan JSON valid tanpa markdown fence dengan struktur persis berikut:
{"title":"judul spesifik menyebut sekolah dan periode","summary":"ringkasan 2-4 kalimat berisi tujuan, prioritas, dan ruang lingkup draft","content":"dokumen lengkap dan rinci dalam Markdown","documentMeta":{"documentType":"...","schoolName":"...","academicYear":"...","generatedAt":"tanggal ISO","reviewStatus":"draft"},"keyDecisions":["keputusan atau prioritas utama yang terbaca dari data"],"assumptions":["asumsi yang digunakan; kosong jika tidak ada"],"missingFields":["data spesifik yang perlu dikonfirmasi; kosong jika lengkap"],"sources":["nama sumber yang benar-benar dipakai"],"consistencyChecks":[{"label":"Nama pemeriksaan","status":"ok|warning","note":"hasil pemeriksaan yang spesifik"}]}`;

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
