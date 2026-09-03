export const SUPERVISION_SCORES = [
  { value: 2, label: "Sesuai", tone: "good" },
  { value: 1, label: "Perlu perbaikan", tone: "warn" },
  { value: 0, label: "Tidak sesuai", tone: "bad" },
];

const item = (id, group, text) => ({ id: String(id), group, text });

export const supervisionInstruments = {
  atp: {
    key: "atp",
    shortLabel: "Penelaahan ATP",
    title: "Instrumen Supervisi Akademik — Penelaahan Alur Tujuan Pembelajaran",
    sourceUrl: "https://drive.google.com/file/d/1b3geVwzrcu-wU6FxiJrWon5iWhSezJBE/view",
    items: [
      item(1,"A. Identitas ATP","Mencantumkan nama sekolah, mata pelajaran, kelas, semester, dan Capaian Pembelajaran."),
      item(2,"B. Peta Kompetensi dan Tujuan Pembelajaran","Peta kompetensi disusun sesuai fase usia atau tahap pembelajaran."),
      item(3,"B. Peta Kompetensi dan Tujuan Pembelajaran","Mencantumkan Capaian Pembelajaran yang relevan."),
      item(4,"B. Peta Kompetensi dan Tujuan Pembelajaran","Tujuan Pembelajaran dirumuskan secara jelas dan terukur."),
      item(5,"C. Komponen ATP","ATP mencakup komponen kompetensi."),
      item(6,"C. Komponen ATP","ATP mencakup komponen konten."),
      item(7,"C. Komponen ATP","ATP mencakup komponen variasi."),
      item(8,"D. Kriteria ATP","Menggambarkan urutan pengembangan kompetensi yang harus dikuasai peserta didik."),
      item(9,"D. Kriteria ATP","Alur tujuan pembelajaran dalam satu fase menggambarkan cakupan dan tahapan pembelajaran yang linear dari awal hingga akhir fase."),
      item(10,"D. Kriteria ATP","Alur pada keseluruhan fase menggambarkan cakupan dan tahapan perkembangan kompetensi antar fase dan jenjang."),
      item(11,"D. Kriteria ATP","Mengidentifikasi elemen atau subelemen Profil Pelajar Pancasila yang sesuai dengan tujuan pembelajaran."),
      item(12,"D. Kriteria ATP","Alur Tujuan Pembelajaran tersusun lengkap dan konsisten."),
    ],
  },
  module: {
    key: "module",
    shortLabel: "Penelaahan Modul Ajar",
    title: "Instrumen Supervisi Akademik — Penelaahan Modul Ajar",
    sourceUrl: "https://drive.google.com/file/d/1MaWKQy9PYex4g7aDBuQAN2l37rDrQfSQ/view",
    items: [
      item(1,"A. Identitas Modul","Mencantumkan nama penyusun, institusi, dan tahun penyusunan."),
      item(2,"A. Identitas Modul","Mencantumkan jenjang, kelas, dan alokasi waktu."),
      item(3,"B. Kompetensi Awal dan Profil Pelajar Pancasila","Kompetensi awal serta dimensi Profil Pelajar Pancasila dirumuskan sesuai kebutuhan pembelajaran."),
      item(4,"C. Sarana dan Prasarana","Sarana, prasarana, media, dan alat pembelajaran tersedia dan relevan."),
      item(5,"C. Sarana dan Prasarana","Sumber bahan ajar dicantumkan dan dapat digunakan."),
      item(6,"D. Target Peserta Didik","Karakteristik dan kebutuhan target peserta didik dijelaskan."),
      item(7,"E. Model Pembelajaran","Model pembelajaran tatap muka, daring, atau kombinasi dipilih sesuai tujuan."),
      item(8,"F. Komponen Pembelajaran","Tujuan pembelajaran selaras dengan Capaian Pembelajaran."),
      item(9,"F. Komponen Pembelajaran","Pemahaman bermakna dirumuskan secara kontekstual."),
      item(10,"F. Komponen Pembelajaran","Pertanyaan pemantik mendorong rasa ingin tahu dan penalaran."),
      item(11,"F. Komponen Pembelajaran","Persiapan pembelajaran dijelaskan secara operasional."),
      item(12,"G. Skenario Pembelajaran","Kegiatan pembukaan memuat orientasi, motivasi, dan apersepsi."),
      item(13,"G. Skenario Pembelajaran","Kegiatan inti memberi ruang peserta didik untuk mengamati."),
      item(14,"G. Skenario Pembelajaran","Kegiatan inti memberi ruang peserta didik untuk bertanya."),
      item(15,"G. Skenario Pembelajaran","Kegiatan inti memberi ruang peserta didik untuk mengeksplorasi informasi."),
      item(16,"G. Skenario Pembelajaran","Kegiatan inti membimbing peserta didik menyintesis atau menalar."),
      item(17,"G. Skenario Pembelajaran","Kegiatan inti memberi ruang peserta didik mengomunikasikan hasil."),
      item(18,"G. Skenario Pembelajaran","Kegiatan penutup memuat simpulan, refleksi, dan tindak lanjut."),
      item(19,"H. Rancangan Asesmen","Asesmen selaras dengan tujuan dan kegiatan pembelajaran."),
      item(20,"H. Rancangan Asesmen","Tersedia instrumen asesmen sikap."),
      item(21,"H. Rancangan Asesmen","Tersedia instrumen asesmen pengetahuan."),
      item(22,"H. Rancangan Asesmen","Tersedia instrumen asesmen keterampilan."),
      item(23,"I–J. Tindak Lanjut","Program remedial dan pengayaan disusun berdasarkan hasil asesmen."),
      item(24,"K. Lampiran","Memuat LKPD, bahan bacaan, glosarium, dan daftar pustaka yang diperlukan."),
    ],
  },
  administration: {
    key: "administration",
    shortLabel: "Administrasi Pembelajaran",
    title: "Instrumen Supervisi Akademik — Administrasi Pembelajaran",
    sourceUrl: "https://drive.google.com/file/d/1IErkIl__KscSvYNgJdLLa8BDwbM5PvTF/view",
    items: [
      "Kalender pendidikan","Program tahunan","Program semester","Alur Tujuan Pembelajaran (ATP)","Modul ajar","Jadwal mengajar","Agenda mengajar","Daftar nilai","Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)","Daftar hadir peserta didik","Buku pegangan guru","Buku teks peserta didik",
    ].map((text,index) => item(index + 1,"Kelengkapan Administrasi Pembelajaran",text)),
  },
  implementation: {
    key: "implementation",
    shortLabel: "Pelaksanaan Pembelajaran",
    title: "Instrumen Supervisi Akademik — Pelaksanaan Pembelajaran",
    sourceUrl: "https://drive.google.com/file/d/1n-tsN8wTKIrODFd0k0--ZN43qVYiwi69/view",
    items: [
      item(1,"A. Kegiatan Pendahuluan","Guru menyiapkan kondisi fisik dan psikis peserta didik."),
      item(2,"A. Kegiatan Pendahuluan","Guru memeriksa kehadiran dan kesiapan belajar peserta didik."),
      item(3,"A. Kegiatan Pendahuluan","Guru menyampaikan tujuan pembelajaran dan manfaatnya."),
      item(4,"A. Kegiatan Pendahuluan","Guru memberikan motivasi belajar yang kontekstual."),
      item(5,"A. Kegiatan Pendahuluan","Guru mengaitkan pengetahuan sebelumnya melalui apersepsi."),
      item(6,"B. Strategi Pembelajaran","Pembelajaran dilaksanakan sesuai kompetensi yang akan dicapai."),
      item(7,"B. Strategi Pembelajaran","Materi disajikan secara runtut, sistematis, dan akurat."),
      item(8,"B. Strategi Pembelajaran","Strategi pembelajaran sesuai karakteristik peserta didik."),
      item(9,"B. Strategi Pembelajaran","Pembelajaran mengaitkan materi dengan kehidupan nyata."),
      item(10,"B. Strategi Pembelajaran","Kegiatan memberi ruang eksplorasi dan partisipasi aktif."),
      item(11,"C. HOTS dan 4C","Pembelajaran mendorong kemampuan berpikir kritis."),
      item(12,"C. HOTS dan 4C","Pembelajaran mendorong kreativitas."),
      item(13,"C. HOTS dan 4C","Pembelajaran mendorong kolaborasi."),
      item(14,"C. HOTS dan 4C","Pembelajaran mengembangkan kemampuan komunikasi."),
      item(15,"C. HOTS dan 4C","Pertanyaan dan tugas mendorong penalaran tingkat tinggi."),
      item(16,"D. Pengelolaan Kelas","Guru mengelola waktu pembelajaran secara efektif."),
      item(17,"D. Pengelolaan Kelas","Guru mengelola ruang dan kelompok belajar dengan baik."),
      item(18,"D. Pengelolaan Kelas","Guru membangun suasana aman, inklusif, dan menyenangkan."),
      item(19,"D. Pengelolaan Kelas","Guru menerapkan disiplin positif."),
      item(20,"D. Pengelolaan Kelas","Guru memberikan penguatan dan umpan balik yang membangun."),
      item(21,"E. Sumber dan Media","Sumber belajar sesuai tujuan dan materi."),
      item(22,"E. Sumber dan Media","Media pembelajaran digunakan secara efektif."),
      item(23,"E. Sumber dan Media","Teknologi digunakan secara tepat bila dibutuhkan."),
      item(24,"E. Sumber dan Media","Peserta didik terlibat dalam pemanfaatan sumber belajar."),
      item(25,"F. Penggunaan Bahasa","Bahasa lisan guru jelas, santun, dan mudah dipahami."),
      item(26,"F. Penggunaan Bahasa","Bahasa tulis guru baik dan benar."),
      item(27,"F. Penggunaan Bahasa","Guru menggunakan istilah dan simbol secara tepat."),
      item(28,"G. Kegiatan Penutup","Guru bersama peserta didik menyimpulkan pembelajaran."),
      item(29,"G. Kegiatan Penutup","Guru memfasilitasi refleksi proses dan hasil belajar."),
      item(30,"G. Kegiatan Penutup","Guru menyampaikan rencana tindak lanjut."),
      item(31,"H. Asesmen","Asesmen dilaksanakan sesuai tujuan pembelajaran."),
      item(32,"H. Asesmen","Guru menilai sikap melalui teknik yang sesuai."),
      item(33,"H. Asesmen","Guru menilai pengetahuan melalui teknik yang sesuai."),
      item(34,"H. Asesmen","Guru menilai keterampilan melalui teknik yang sesuai."),
    ],
  },
};

export function scoreSupervision(responses = {}, itemCount = 0) {
  const values = Object.values(responses).filter((entry) => entry?.score !== null && entry?.score !== undefined && entry?.score !== "").map((entry) => Number(entry.score)).filter((value) => [0,1,2].includes(value));
  const total = values.reduce((sum,value) => sum + value,0);
  const max = itemCount * 2;
  const percent = max ? Math.round((total / max) * 10000) / 100 : 0;
  const rating = percent >= 91 ? "Sangat Baik" : percent >= 81 ? "Baik" : percent >= 71 ? "Cukup" : "Perlu Pembinaan";
  return { total, max, percent, rating, answered: values.length, complete: itemCount > 0 && values.length === itemCount };
}
