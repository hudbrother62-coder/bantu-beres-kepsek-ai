export type DocumentCategory =
  | 'Perencanaan'
  | 'Kurikulum'
  | 'Kinerja'
  | 'Administrasi'
  | 'Mutu & PBD';

export interface DocumentDefinition {
  id: string;
  title: string;
  shortTitle: string;
  category: DocumentCategory;
  description: string;
  sections: string[];
  accent: 'violet' | 'blue' | 'teal' | 'amber' | 'rose';
}

export const documentCatalog: DocumentDefinition[] = [
  {
    id: 'ksp',
    title: 'Kurikulum Satuan Pendidikan (KSP)',
    shortTitle: 'KSP',
    category: 'Kurikulum',
    description: 'Draf KSP yang berangkat dari karakteristik, visi, kebutuhan, dan kondisi nyata sekolah.',
    sections: ['Karakteristik satuan pendidikan', 'Visi, misi, dan tujuan', 'Pengorganisasian pembelajaran', 'Perencanaan pembelajaran', 'Pendampingan, evaluasi, dan pengembangan profesional'],
    accent: 'violet',
  },
  {
    id: 'analisis-mutu-pbd',
    title: 'Analisis Mutu & Perencanaan Berbasis Data',
    shortTitle: 'Mutu & PBD',
    category: 'Mutu & PBD',
    description: 'Pemetaan masalah, akar masalah, prioritas perbaikan, program, dan indikator keberhasilan.',
    sections: ['Ringkasan kondisi', 'Identifikasi dan refleksi', 'Akar masalah', 'Prioritas perbaikan', 'Rencana tindak lanjut dan indikator'],
    accent: 'blue',
  },
  {
    id: 'eds',
    title: 'Evaluasi Diri Sekolah (EDS)',
    shortTitle: 'EDS',
    category: 'Mutu & PBD',
    description: 'Evaluasi diri yang menghubungkan bukti, temuan, kesenjangan, dan rekomendasi sekolah.',
    sections: ['Profil dan sumber data', 'Temuan per standar', 'Kekuatan dan kesenjangan', 'Akar masalah', 'Rekomendasi prioritas'],
    accent: 'teal',
  },
  {
    id: 'rkjm',
    title: 'Rencana Kerja Jangka Menengah (RKJM)',
    shortTitle: 'RKJM',
    category: 'Perencanaan',
    description: 'Peta jalan empat tahunan lengkap dengan sasaran, indikator, program, jadwal, dan penanggung jawab.',
    sections: ['Analisis kondisi', 'Arah strategis', 'Sasaran dan indikator empat tahunan', 'Matriks program', 'Monitoring dan evaluasi'],
    accent: 'violet',
  },
  {
    id: 'rkt',
    title: 'Rencana Kerja Tahunan (RKT)',
    shortTitle: 'RKT',
    category: 'Perencanaan',
    description: 'Rencana tahunan yang diturunkan dari prioritas sekolah dan RKJM.',
    sections: ['Prioritas tahun berjalan', 'Sasaran dan indikator', 'Program dan kegiatan', 'Jadwal serta penanggung jawab', 'Monitoring dan evaluasi'],
    accent: 'blue',
  },
  {
    id: 'rkas-bosp',
    title: 'RKAS Assistant & BOSP Validator',
    shortTitle: 'RKAS + BOSP',
    category: 'Perencanaan',
    description: 'Draf kegiatan dan anggaran disertai pemeriksaan konsistensi tujuan, keluaran, dan pembiayaan.',
    sections: ['Asumsi dan prioritas', 'Matriks kegiatan dan keluaran', 'Rencana anggaran', 'Pemeriksaan konsistensi', 'Catatan validasi BOSP'],
    accent: 'amber',
  },
  {
    id: 'kurikulum-merdeka',
    title: 'Dokumen Kurikulum & Pembelajaran',
    shortTitle: 'Kurikulum',
    category: 'Kurikulum',
    description: 'Kerangka capaian, pembelajaran, asesmen, penguatan karakter, dan pendampingan guru.',
    sections: ['Landasan dan karakteristik', 'Capaian dan tujuan pembelajaran', 'Strategi pembelajaran', 'Asesmen', 'Pendampingan guru'],
    accent: 'teal',
  },
  {
    id: 'supervisi-akademik',
    title: 'Program Supervisi Akademik',
    shortTitle: 'Supervisi',
    category: 'Kinerja',
    description: 'Program, instrumen observasi, catatan umpan balik, dan tindak lanjut supervisi akademik.',
    sections: ['Tujuan dan ruang lingkup', 'Jadwal supervisi', 'Instrumen observasi', 'Umpan balik', 'Tindak lanjut dan evaluasi'],
    accent: 'rose',
  },
  {
    id: 'pengelolaan-kinerja',
    title: 'Asisten Pengelolaan Kinerja',
    shortTitle: 'E-Kinerja',
    category: 'Kinerja',
    description: 'Rencana hasil kerja, indikator, bukti dukung, refleksi, dan tindak lanjut kinerja.',
    sections: ['Sasaran kinerja', 'Indikator dan target', 'Rencana aksi', 'Bukti dukung', 'Refleksi dan tindak lanjut'],
    accent: 'violet',
  },
  {
    id: 'program-kerja',
    title: 'Program Kerja Sekolah',
    shortTitle: 'Program Kerja',
    category: 'Administrasi',
    description: 'Program terjadwal dengan target, PIC, kebutuhan sumber daya, bukti, dan evaluasi.',
    sections: ['Latar belakang', 'Tujuan dan sasaran', 'Matriks program', 'Jadwal dan sumber daya', 'Evaluasi dan pelaporan'],
    accent: 'blue',
  },
  {
    id: 'sop-sekolah',
    title: 'SOP Sekolah',
    shortTitle: 'SOP',
    category: 'Administrasi',
    description: 'SOP operasional berbagai bidang dengan peran, tahapan, waktu, bukti, dan pengendalian.',
    sections: ['Identitas dan tujuan SOP', 'Ruang lingkup serta peran', 'Prosedur langkah demi langkah', 'Standar waktu dan bukti', 'Pengendalian dan evaluasi'],
    accent: 'amber',
  },
  {
    id: 'sk-surat-notulen',
    title: 'SK, Surat Tugas & Notulen',
    shortTitle: 'SK & Surat',
    category: 'Administrasi',
    description: 'Naskah administrasi formal yang siap disesuaikan dengan kop, nomor, dan pejabat sekolah.',
    sections: ['Identitas dokumen', 'Dasar dan pertimbangan', 'Isi atau keputusan', 'Tugas dan tanggung jawab', 'Pengesahan dan lampiran'],
    accent: 'rose',
  },
  {
    id: 'laporan-kegiatan',
    title: 'Laporan Kegiatan Sekolah',
    shortTitle: 'Laporan',
    category: 'Administrasi',
    description: 'Laporan lengkap dari perencanaan, pelaksanaan, hasil, penggunaan sumber daya, hingga tindak lanjut.',
    sections: ['Pendahuluan', 'Pelaksanaan', 'Hasil dan bukti', 'Evaluasi', 'Tindak lanjut dan penutup'],
    accent: 'teal',
  },
];

export function getDocumentDefinition(id: string) {
  return documentCatalog.find((item) => item.id === id);
}

export function getDocumentLabel(id: string) {
  return getDocumentDefinition(id)?.shortTitle ?? id.replaceAll('-', ' ');
}
