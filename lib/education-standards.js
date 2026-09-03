export const STANDARDS_VERIFIED_AT = "2026-09-03";

const references = {
  snp: {
    id: "pp-57-2021-pp-4-2022",
    title: "PP Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana diubah dengan PP Nomor 4 Tahun 2022",
    url: "https://peraturan.bpk.go.id/Details/165024/pp-no-57-tahun-2021",
    status: "berlaku dengan perubahan",
  },
  curriculum: {
    id: "permendikdasmen-13-2025",
    title: "Permendikdasmen Nomor 13 Tahun 2025 tentang Perubahan atas Permendikbudristek Nomor 12 Tahun 2024",
    url: "https://peraturan.bpk.go.id/Details/322506/permendikdasmen-no-13-tahun-2025",
    status: "berlaku",
  },
  graduate: {
    id: "permendikdasmen-10-2025",
    title: "Permendikdasmen Nomor 10 Tahun 2025 tentang Standar Kompetensi Lulusan",
    url: "https://peraturan.bpk.go.id/Details/321419/permendikdasmen-no-10-tahun-2025",
    status: "berlaku",
  },
  content: {
    id: "permendikdasmen-12-2025",
    title: "Permendikdasmen Nomor 12 Tahun 2025 tentang Standar Isi",
    url: "https://peraturan.bpk.go.id/Details/322494/permendikdasmen-no-12-tahun-2025",
    status: "berlaku",
  },
  process: {
    id: "permendikdasmen-1-2026",
    title: "Permendikdasmen Nomor 1 Tahun 2026 tentang Standar Proses",
    url: "https://peraturan.bpk.go.id/Details/344196/permendikdasmen-no-1-tahun-2026",
    status: "berlaku",
  },
  assessment: {
    id: "permendikbudristek-21-2022",
    title: "Permendikbudristek Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan",
    url: "https://peraturan.bpk.go.id/Details/224425/permendikbudriset-no-21-tahun-2022",
    status: "berlaku",
  },
  management: {
    id: "permendikbudristek-47-2023",
    title: "Permendikbudristek Nomor 47 Tahun 2023 tentang Standar Pengelolaan",
    url: "https://peraturan.bpk.go.id/Details/289462/permendikbudriset-no-47-tahun-2023",
    status: "berlaku",
  },
  financing: {
    id: "permendikbudristek-18-2023",
    title: "Permendikbudristek Nomor 18 Tahun 2023 tentang Standar Pembiayaan",
    url: "https://peraturan.go.id/id/permendikbudristek-no-18-tahun-2023",
    status: "berlaku",
  },
  facilities: {
    id: "permendikbudristek-22-2023",
    title: "Permendikbudristek Nomor 22 Tahun 2023 tentang Standar Sarana dan Prasarana",
    url: "https://peraturan.bpk.go.id/Details/263717/permendikbudriset-no-22-tahun-2023",
    status: "berlaku",
  },
  personnel: {
    id: "permendikdasmen-21-2025",
    title: "Permendikdasmen Nomor 21 Tahun 2025 tentang Standar Tenaga Kependidikan",
    url: "https://peraturan.bpk.go.id/Details/335231/permendikdasmen-no-21-tahun-2025",
    status: "berlaku",
  },
  principal: {
    id: "permendikdasmen-7-2025",
    title: "Permendikdasmen Nomor 7 Tahun 2025 tentang Penugasan Guru sebagai Kepala Sekolah",
    url: "https://peraturan.bpk.go.id/Details/321145/permendikdasmen-no-7-tahun-2025",
    status: "berlaku",
  },
  workload: {
    id: "permendikdasmen-11-2025",
    title: "Permendikdasmen Nomor 11 Tahun 2025 tentang Pemenuhan Beban Kerja Guru",
    url: "https://peraturan.bpk.go.id/Details/322487/permendikdasmen-no-11-tahun-2025",
    status: "berlaku",
  },
  bosp: {
    id: "permendikdasmen-8-2026",
    title: "Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP",
    url: "https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/55390563223065-Implementasi-Permendikdasmen-No-8-2026-Juknis-BOSP-2026-dalam-Penggunaan-Dana-BOSP-Reguler",
    status: "berlaku untuk BOSP 2026",
  },
  pbd: {
    id: "pbd-spmi",
    title: "Alur Perencanaan Berbasis Data dalam Sistem Penjaminan Mutu Internal",
    url: "https://pmp.kemendikdasmen.go.id/implementasi/spmi?p=3-penyusunan-rencana-peningkatan-mutu",
    status: "panduan resmi",
  },
  kspGuide: {
    id: "panduan-ksp",
    title: "Panduan Pengembangan Kurikulum Satuan Pendidikan",
    url: "https://guru.kemendikdasmen.go.id/dokumen/daftar/pGj9rB9YLx",
    status: "panduan resmi",
  },
  learningGuide: {
    id: "panduan-pembelajaran-asesmen-2025",
    title: "Panduan Pembelajaran dan Asesmen edisi 2025",
    url: "https://guru.kemendikdasmen.go.id/dokumen/P3J9R5eDYQ?parentCategory=Pengelolaan+Pembelajaran",
    status: "panduan resmi",
  },
};

const typeReferenceKeys = {
  ksp: ["snp", "curriculum", "graduate", "content", "process", "assessment", "management", "kspGuide", "learningGuide"],
  pbd: ["snp", "management", "pbd"],
  rkjm: ["snp", "management", "pbd", "financing", "facilities", "personnel"],
  rkt: ["snp", "management", "pbd", "financing"],
  rkas: ["snp", "management", "financing", "bosp"],
  activity: ["snp", "management"],
  sop: ["snp", "management"],
  performance: ["principal", "workload", "management"],
};

export const documentBlueprints = {
  ksp: {
    minimumCharacters: 8_000,
    sections: ["Sampul", "Lembar Identitas", "Lembar Penetapan", "Karakteristik Satuan Pendidikan", "Visi, Misi, dan Tujuan", "Pengorganisasian Pembelajaran", "Perencanaan Pembelajaran", "Pendampingan, Evaluasi, dan Pengembangan Profesional", "Lampiran"],
    requiredTables: ["struktur/pengorganisasian pembelajaran", "kalender atau program tahunan", "evaluasi dan tindak lanjut"],
  },
  pbd: {
    minimumCharacters: 5_000,
    sections: ["Ringkasan Eksekutif", "Identifikasi Kondisi Mutu", "Indikator Prioritas", "Refleksi dan Akar Masalah", "Rekomendasi Pembenahan", "Program Prioritas", "Indikator Keberhasilan", "Pemantauan dan Tindak Lanjut"],
    requiredTables: ["identifikasi-refleksi-benahi", "program, indikator, target, dan bukti"],
  },
  rkjm: {
    minimumCharacters: 7_000,
    sections: ["Pendahuluan", "Profil dan Kondisi Sekolah", "Isu Strategis", "Tujuan dan Sasaran Empat Tahunan", "Program Strategis", "Tahapan Pelaksanaan", "Pemantauan dan Evaluasi", "Penutup"],
    requiredTables: ["program, indikator, baseline, dan target empat tahun", "risiko dan mitigasi"],
  },
  rkt: {
    minimumCharacters: 5_000,
    sections: ["Pendahuluan", "Prioritas Tahunan", "Sasaran dan Indikator", "Program dan Kegiatan", "Jadwal Pelaksanaan", "Risiko dan Mitigasi", "Pemantauan dan Tindak Lanjut"],
    requiredTables: ["program, kegiatan, indikator, target, waktu, penanggung jawab, dan bukti"],
  },
  rkas: {
    minimumCharacters: 5_000,
    sections: ["Ringkasan Keterkaitan RKT dan Anggaran", "Asumsi Perencanaan", "Rencana Kegiatan dan Anggaran", "Validasi BOSP", "Risiko dan Pengendalian", "Daftar Verifikasi ARKAS"],
    requiredTables: ["program, kegiatan, volume, satuan, harga, jumlah, sumber dana, waktu, dan penanggung jawab"],
  },
  activity: {
    minimumCharacters: 6_000,
    sections: ["Program Kegiatan", "Kerangka Acuan Kerja", "Surat Keputusan", "Surat Tugas", "Undangan", "Susunan Acara", "Daftar Hadir", "Notulen", "Berita Acara", "Laporan dan Evaluasi"],
    requiredTables: ["jadwal/rundown", "susunan panitia", "evaluasi dan tindak lanjut"],
  },
  sop: {
    minimumCharacters: 4_000,
    sections: ["Identitas SOP", "Tujuan", "Ruang Lingkup", "Dasar dan Acuan", "Pelaksana dan Tanggung Jawab", "Persyaratan", "Prosedur", "Pengendalian Mutu", "Risiko dan Mitigasi", "Evaluasi"],
    requiredTables: ["nomor, aktivitas, pelaksana, waktu, keluaran, dan kendali mutu"],
  },
  performance: {
    minimumCharacters: 4_500,
    sections: ["Ringkasan Sasaran Kinerja", "Pemetaan Aktivitas", "Bukti Dukung", "Status Kelengkapan", "Refleksi Berbasis Fakta", "Rencana Tindak Lanjut", "Matriks Akuntabilitas"],
    requiredTables: ["indikator, aktivitas, bukti, status, tenggat, dan tindak lanjut"],
  },
};

export function standardsFor(type) {
  return (typeReferenceKeys[type] || ["snp", "management"]).map((key) => ({ ...references[key] }));
}

export function standardsContext(type) {
  return standardsFor(type).map((item, index) => `${index + 1}. ${item.title}\n   Status: ${item.status}\n   Sumber resmi: ${item.url}`).join("\n");
}

export function blueprintFor(type) {
  return documentBlueprints[type] || documentBlueprints.activity;
}
