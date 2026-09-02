const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");

const state = {
  config: null,
  supabase: null,
  session: null,
  user: null,
  school: null,
  membership: null,
  documents: [],
  sources: [],
  agendas: [],
  projects: [],
  selectedDocument: null,
  aiType: "ksp",
  aiResult: null,
  demo: false,
  loading: true,
  authNotice: null,
  pendingFiles: [],
  theme: localStorage.getItem("bb-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
};

document.documentElement.dataset.theme = state.theme;
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#09111f" : "#f5f8fd");

const demoSchool = {
  id: "demo-school",
  name: "SDN Harapan Bangsa",
  npsn: "20501234",
  level: "SD",
  address: "Jl. Pendidikan No. 10, Indonesia",
  principal_name: "Budi Santoso, M.Pd.",
  academic_year: "2026/2027",
  onboarding_complete: true,
  profile_data: {
    vision: "Terwujudnya peserta didik yang berkarakter, literat, numerat, dan peduli lingkungan.",
    mission: "Menyelenggarakan pembelajaran bermakna, membangun budaya literasi, dan memperkuat kolaborasi warga sekolah.",
    student_count: 284,
    teacher_count: 18,
    staff_count: 5,
    classroom_count: 12,
    priority: "Penguatan literasi dan kualitas pembelajaran",
  },
};

const demoDocuments = [
  { id: "demo-ksp", title: "KSP Tahun Pelajaran 2026/2027", type: "ksp", status: "review", version: 3, updated_at: new Date().toISOString(), content: "BAB I — KARAKTERISTIK SATUAN PENDIDIKAN\n\nSDN Harapan Bangsa merupakan satuan pendidikan yang melayani 284 peserta didik dengan karakteristik sosial dan budaya yang beragam. Berdasarkan Rapor Pendidikan, sekolah menetapkan penguatan literasi dan kualitas pembelajaran sebagai prioritas utama.\n\nBAB II — VISI, MISI, DAN TUJUAN\n\nVisi sekolah adalah terwujudnya peserta didik yang berkarakter, literat, numerat, dan peduli lingkungan." },
  { id: "demo-rkt", title: "RKT Berbasis Prioritas Sekolah 2027", type: "rkt", status: "draft", version: 1, updated_at: new Date(Date.now() - 86400000).toISOString(), content: "RENCANA KERJA TAHUNAN\n\nPrioritas: Penguatan literasi dan kualitas pembelajaran.\n\nProgram 1: Pengembangan budaya baca sekolah.\nIndikator keberhasilan: Peningkatan keterlibatan murid dalam kegiatan literasi." },
  { id: "demo-pkks", title: "Bukti Dukung PKKS 2026", type: "performance", status: "approved", version: 2, updated_at: new Date(Date.now() - 172800000).toISOString(), content: "RANGKUMAN BUKTI DUKUNG KINERJA KEPALA SEKOLAH\n\nDokumen ini memetakan kegiatan sekolah terhadap indikator kinerja kepala sekolah." },
];

const demoSources = [
  { id: "src-profile", name: "Profil Sekolah", mime_type: "application/json", status: "ready", summary: "Data identitas dan karakteristik sekolah", created_at: new Date().toISOString() },
  { id: "src-rapor", name: "Rapor Pendidikan 2025.pdf", mime_type: "application/pdf", status: "ready", summary: "Prioritas literasi dan kualitas pembelajaran", created_at: new Date().toISOString() },
  { id: "src-old-ksp", name: "KSP 2025-2026.docx", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", status: "ready", summary: "Dokumen kurikulum tahun sebelumnya", created_at: new Date().toISOString() },
];

const aiTypes = {
  ksp: { label: "KSP & Kurikulum", title: "Susun KSP berbasis kondisi sekolah", description: "Karakteristik, visi-misi, pengorganisasian pembelajaran, evaluasi, dan lampiran." },
  pbd: { label: "Analisis Mutu & PBD", title: "Analisis mutu dan prioritas sekolah", description: "Identifikasi, refleksi akar masalah, rekomendasi pembenahan, dan indikator." },
  rkjm: { label: "RKJM", title: "Susun rencana kerja jangka menengah", description: "Sasaran, indikator, program strategis, target, dan tahapan empat tahunan." },
  rkt: { label: "RKT", title: "Susun RKT dari prioritas sekolah", description: "Program tahunan, indikator, jadwal, penanggung jawab, dan kebutuhan sumber daya." },
  rkas: { label: "RKAS Assistant", title: "Siapkan draft kegiatan dan anggaran", description: "Menurunkan RKT menjadi kegiatan dan anggaran untuk ditinjau sebelum masuk ARKAS." },
  activity: { label: "Administrasi Kegiatan", title: "Susun administrasi kegiatan sekolah", description: "Program, SK, surat tugas, undangan, notulen, berita acara, dan laporan." },
  sop: { label: "SOP Builder", title: "Susun SOP sekolah", description: "Tujuan, ruang lingkup, peran, langkah, waktu layanan, dan dokumen pendukung." },
  performance: { label: "Kinerja Kepala Sekolah", title: "Kelola bukti dan refleksi kinerja", description: "Pemetaan aktivitas, bukti dukung, refleksi, tindak lanjut, dan akuntabilitas." },
};

const iconPaths = {
  "arrow-left": '<path d="m15 18-6-6 6-6"/><path d="M21 12H9"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  "arrow-up-right": '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
  bell: '<path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M4 17h16l-1.8-2.2A4 4 0 0 1 17.3 12V9a5.3 5.3 0 0 0-10.6 0v3c0 1-.3 2-.9 2.8Z"/>',
  "book-open-check": '<path d="M12 7v14"/><path d="M3 18a2 2 0 0 1 2-2h7V5H5a2 2 0 0 0-2 2Z"/><path d="M12 5h7a2 2 0 0 1 2 2v7"/><path d="m16 19 2 2 4-4"/>',
  "brain-circuit": '<path d="M9.5 4.5A3 3 0 0 0 4 6a3 3 0 0 0 0 5 3 3 0 0 0 2 5.7V18a3 3 0 0 0 6 0V6a3 3 0 0 0-2.5-1.5Z"/><path d="M14 8h3l2-2"/><path d="M14 12h5"/><path d="M14 16h3l2 2"/><circle cx="20" cy="5" r="1"/><circle cx="20" cy="12" r="1"/><circle cx="20" cy="19" r="1"/>',
  "calendar-days": '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  "chart-no-axes-combined": '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/><path d="M18 7h2v2"/>',
  "circle-alert": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  "circle-check": '<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>',
  "circle-help": '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4M12 18h.01"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  "file-check-2": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
  "file-clock": '<path d="M14 2H6a2 2 0 0 0-2 2v7M14 2v6h6M16 13a5 5 0 1 0 5 5M16 15v3l2 1"/>',
  "file-down": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 12v6m-3-3 3 3 3-3"/>',
  "file-spreadsheet": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8M11 13v4"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  files: '<path d="M15 2H6a2 2 0 0 0-2 2v13"/><rect width="14" height="16" x="6" y="6" rx="2"/><path d="M14 6v4h4"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  "folder-kanban": '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M8 11v5M12 11v3M16 11v6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  "layout-dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "list-checks": '<path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M10 6h11M10 12h11M10 18h11"/>',
  "lock-keyhole": '<rect width="18" height="12" x="3" y="10" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v4"/>',
  "log-out": '<path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6"/>',
  map: '<path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z"/><path d="M8 3v15M16 6v15"/>',
  mic: '<rect width="8" height="13" x="8" y="2" rx="4"/><path d="M4 10a8 8 0 0 0 16 0M12 18v4M8 22h8"/>',
  paperclip: '<path d="m20.5 11.5-8.8 8.8a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5"/>',
  "play-circle": '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h6.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H18"/><circle cx="18" cy="5" r="3"/>',
  save: '<path d="M15 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M17 22v-8H7v8M7 2v5h8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
  sparkles: '<path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4ZM5 15l-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8ZM19 14l-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8Z"/>',
  "upload-cloud": '<path d="M12 13v8M8 17l4-4 4 4"/><path d="M20.4 17.5A5 5 0 0 0 18 8.2 7 7 0 0 0 4.3 10.5 4 4 0 0 0 5 18h2"/>',
  "user-check": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  "wallet-cards": '<rect width="20" height="14" x="2" y="6" rx="2"/><path d="M16 13h4M2 10h20M6 3h12"/>',
  workflow: '<rect width="7" height="5" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="16" rx="1"/><path d="M6.5 8v5a3 3 0 0 0 3 3H14M10 5h4a3 3 0 0 1 3 3v8"/>',
  "briefcase-business": '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20M10 12v2h4v-2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name, label = "") {
  const path = iconPaths[name] || iconPaths["circle-help"];
  return `<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${label ? ` role="img" aria-label="${escapeHtml(label)}"` : ' aria-hidden="true"'}>${path}</svg>`;
}

function themeToggle(showLabel = true) {
  const nextLabel = state.theme === "dark" ? "Gunakan mode terang" : "Gunakan mode gelap";
  return `<button type="button" class="theme-toggle${showLabel ? "" : " icon-only"}" data-theme-toggle aria-label="${nextLabel}" title="${nextLabel}">${icon(state.theme === "dark" ? "sun" : "moon")}<span class="theme-label">${state.theme === "dark" ? "Terang" : "Gelap"}</span></button>`;
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("bb-theme", state.theme);
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#09111f" : "#f5f8fd");
  const nextLabel = state.theme === "dark" ? "Gunakan mode terang" : "Gunakan mode gelap";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", nextLabel);
    button.setAttribute("title", nextLabel);
    button.innerHTML = `${icon(state.theme === "dark" ? "sun" : "moon")}<span class="theme-label">${state.theme === "dark" ? "Terang" : "Gelap"}</span>`;
  });
}

function brand(compact = false) {
  return `<span class="brand${compact ? " compact" : ""}">
    <span class="brand-symbol" aria-hidden="true"><img src="/assets/bantu-beres-logo.jpg" alt=""></span>
    <span class="brand-copy"><span class="brand-name"><span>Bantu</span><span>Beres</span></span><span class="brand-product">Kepsek AI</span></span>
  </span>`;
}

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `${icon(type === "error" ? "circle-alert" : "circle-check")}<span>${escapeHtml(message)}</span>`;
  toastRegion.append(item);
  refreshIcons(item);
  window.setTimeout(() => item.remove(), 3200);
}

function refreshIcons() {
  // Icons are rendered inline so the interface remains complete without a CDN.
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function initials(name = "Kepala Sekolah") {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part[0]).join("").toUpperCase();
}

function navigate(path) {
  const target = new URL(path, window.location.origin);
  window.history.pushState({}, "", `${target.pathname}${target.search}${target.hash}`);
  route();
}

function currentRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/documents/")) return "document-editor";
  return {
    "/": "landing",
    "/auth": "auth",
    "/onboarding": "onboarding",
    "/dashboard": "dashboard",
    "/profile": "profile",
    "/documents": "documents",
    "/ai": "ai",
  }[path] || "landing";
}

function ambient() {
  return `<div class="ambient"></div><div class="ambient-grid"></div>`;
}

function renderLanding() {
  document.title = "Bantu Beres KEPSEK AI — Asisten Kerja Kepala Sekolah";
  app.innerHTML = `${ambient()}<main id="main-content" class="public-page">
    <nav class="public-nav glass" aria-label="Navigasi utama">
      <a href="/" data-route aria-label="Bantu Beres KEPSEK AI">${brand()}</a>
      <div class="public-links"><a href="#cara-kerja">Cara kerja</a><a href="#fitur">Fitur</a><a href="#keamanan">Keamanan</a></div>
      <div class="public-actions">${themeToggle(false)}<button class="btn btn-secondary" data-route-to="/auth">Masuk</button><button class="btn btn-primary" data-route-to="/auth">Coba sekarang</button></div>
    </nav>
    <section class="public-hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="eyebrow-dot"></span>Asisten kerja khusus kepala sekolah</div>
        <h1>Administrasi beres. <span class="gradient-text">Memimpin sekolah</span> lebih fokus.</h1>
        <p>Hubungkan data sekolah, Rapor Pendidikan, perencanaan, program, dokumen, dan kinerja dalam satu ruang kerja yang mudah dipahami.</p>
        <div class="hero-actions"><button class="btn btn-primary" data-route-to="/auth">Mulai workspace sekolah ${icon("arrow-up-right")}</button><button class="btn btn-secondary" data-route-to="/ai">${icon("play-circle")} Lihat cara kerja</button></div>
        <div class="hero-proof"><span class="proof">${icon("circle-check")} Data digunakan sekali</span><span class="proof">${icon("circle-check")} Draft dapat ditinjau</span><span class="proof">${icon("circle-check")} Word, Excel, PDF</span></div>
      </div>
      <div class="product-scene" aria-label="Gambaran antarmuka Bantu Beres">
        <div class="scene-glow"></div>
        <div class="product-window">
          <div class="mini-top"><div class="mini-brand"><span class="brand-symbol"><img src="/assets/bantu-beres-logo.jpg" alt=""></span>Bantu Beres</div><div class="window-dots"><span></span><span></span><span></span></div></div>
          <div class="mini-hero"><small>Selamat pagi, Pak Budi</small><strong>Apa yang ingin dibereskan hari ini?</strong></div>
          <div class="mini-command">${icon("sparkles")} Buat RKT dari prioritas Rapor Pendidikan…</div>
          <div class="mini-grid">
            <div class="mini-card"><span class="mini-card-icon">${icon("book-open-check")}</span><strong>Susun KSP</strong></div>
            <div class="mini-card"><span class="mini-card-icon">${icon("chart-no-axes-combined")}</span><strong>Analisis PBD</strong></div>
            <div class="mini-card"><span class="mini-card-icon">${icon("route")}</span><strong>Buat RKT</strong></div>
          </div>
        </div>
        <div class="floating-note"><div class="floating-head"><span class="floating-icon">${icon("shield-check")}</span>Data sekolah siap</div><small>Profil, Rapor Pendidikan, dan dokumen lama sudah terbaca.</small></div>
        <div class="floating-progress"><div class="progress-heading"><span>Kelengkapan KSP</span><strong>72%</strong></div><div class="progress-track"><div class="progress-fill"></div></div></div>
      </div>
    </section>
    <section id="fitur" class="feature-strip">
      <div class="feature"><span class="feature-icon">${icon("database")}</span><div><strong>Satu memori sekolah</strong><small>Data tidak perlu diketik berulang kali.</small></div></div>
      <div class="feature"><span class="feature-icon">${icon("workflow")}</span><div><strong>Dokumen saling terhubung</strong><small>PBD, RKJM, RKT, dan RKAS tetap konsisten.</small></div></div>
      <div class="feature"><span class="feature-icon">${icon("user-check")}</span><div><strong>Kepala sekolah menyetujui</strong><small>AI membantu; keputusan tetap di tangan Anda.</small></div></div>
    </section>
    <section class="public-section"><div class="section-heading"><div class="eyebrow"><span class="eyebrow-dot"></span>Masalah yang dibereskan</div><h2>Administrasi sekolah tidak seharusnya menghabiskan waktu memimpin.</h2><p>KEPSEK AI mengurangi pengulangan, membantu menjaga konsistensi, dan membuat pekerjaan penting lebih mudah ditemukan.</p></div><div class="problem-grid">
      ${problemCard("01","Data diketik berulang","Nama sekolah, program, indikator, dan prioritas sering disalin kembali ke banyak dokumen.")}
      ${problemCard("02","Dokumen tidak terhubung","PBD, RKJM, RKT, RKAS, kegiatan, dan laporan dikerjakan di file yang terpisah.")}
      ${problemCard("03","Tenggat datang bersamaan","Dokumen kinerja, laporan, dan administrasi kegiatan menumpuk menjelang batas waktu.")}
      ${problemCard("04","Format perlu diperiksa","Struktur dan acuan dokumen berubah sehingga bagian lama perlu ditinjau kembali.")}
      ${problemCard("05","Bukti kegiatan tersebar","SK, surat, notulen, foto, dan laporan tersimpan di berbagai perangkat dan folder.")}
      ${problemCard("06","Waktu kepemimpinan berkurang","Kepala sekolah terlalu lama mengurus pekerjaan administratif yang berulang.")}
    </div></section>
    <section id="cara-kerja" class="solution-band"><div class="solution-band-content"><h2>Bukan sekadar generator. Ini ruang kerja kepala sekolah.</h2><p>Data sekolah masuk sekali, diverifikasi, lalu digunakan untuk membantu menghasilkan perencanaan dan dokumen yang saling terhubung.</p><div class="workflow"><div class="workflow-step"><span>1</span><strong>Lengkapi profil</strong><small>Masukkan data sekolah sekali.</small></div><div class="workflow-step"><span>2</span><strong>Unggah sumber</strong><small>Rapor Pendidikan dan dokumen lama.</small></div><div class="workflow-step"><span>3</span><strong>Susun dengan AI</strong><small>Pilih pekerjaan dan tinjau sumber.</small></div><div class="workflow-step"><span>4</span><strong>Edit & ekspor</strong><small>Setujui lalu unduh dokumen.</small></div></div></div></section>
    <section class="public-section"><div class="section-heading"><div class="eyebrow"><span class="eyebrow-dot"></span>Satu sistem kerja</div><h2>Semua kebutuhan utama kepala sekolah.</h2><p>Setiap modul menggunakan Profil dan Memori Sekolah yang sama agar hasil tidak saling bertentangan.</p></div><div class="module-grid">
      ${moduleCard("chart-no-axes-combined","Analisis Mutu & PBD","Import Rapor Pendidikan, identifikasi, refleksi, dan rekomendasi pembenahan.")}
      ${moduleCard("book-open-check","KSP & Kurikulum","Wizard KSP, karakteristik sekolah, kalender, pembelajaran, dan evaluasi.")}
      ${moduleCard("route","RKJM & RKT","Sasaran, indikator, program, target, jadwal, dan penanggung jawab.")}
      ${moduleCard("wallet-cards","RKAS Assistant","Draft kegiatan dan anggaran dengan catatan verifikasi BOSP dan ARKAS.")}
      ${moduleCard("folder-kanban","Program & Kegiatan","Program, SK, surat, undangan, notulen, berita acara, dan laporan.")}
      ${moduleCard("list-checks","SOP Builder","SOP sekolah dengan peran, langkah, waktu layanan, dan dokumen pendukung.")}
      ${moduleCard("briefcase-business","Kinerja Kepala Sekolah","Pemetaan aktivitas, bukti dukung, refleksi, dan tindak lanjut.")}
      ${moduleCard("files","Pusat Dokumen AI","Versi, status persetujuan, sumber, pencarian, dan ekspor dokumen.")}
    </div></section>
    <section id="keamanan" class="public-section"><div class="section-heading"><div class="eyebrow"><span class="eyebrow-dot"></span>Pertanyaan umum</div><h2>Jelas sebelum mulai.</h2></div><div class="faq-list"><details class="faq-item"><summary>Apakah hasil AI langsung menjadi dokumen final?</summary><p>Tidak. Semua hasil berstatus draft dan harus diperiksa serta disetujui kepala sekolah sebelum digunakan.</p></details><details class="faq-item"><summary>Apakah KEPSEK AI menggantikan ARKAS atau e-Kinerja?</summary><p>Tidak. KEPSEK AI membantu menyusun, memeriksa, dan mengelola draft. Penginputan serta pengesahan tetap dilakukan melalui sistem resmi.</p></details><details class="faq-item"><summary>Apakah data sekolah lain dapat terlihat?</summary><p>Tidak. Database menggunakan workspace dan Row Level Security untuk memisahkan akses setiap sekolah.</p></details><details class="faq-item"><summary>Format apa yang dapat diunggah dan diekspor?</summary><p>Dokumen dapat diunggah dalam format Word, Excel, PDF, CSV, teks, atau gambar. Hasil dapat diekspor ke Word, Excel, dan PDF.</p></details></div></section>
    <section class="final-cta"><h2>Lebih sedikit mengulang administrasi. Lebih banyak waktu memimpin sekolah.</h2><p>Bangun Memori Sekolah dan mulai susun pekerjaan pertama bersama KEPSEK AI.</p><button class="btn btn-primary" data-route-to="/auth">Buat workspace sekolah ${icon("arrow-right")}</button></section>
    <footer class="public-footer"><a href="/" data-route>${brand()}</a><span>© ${new Date().getFullYear()} Bantu Beres. KEPSEK AI adalah asisten penyusunan draft, bukan sistem resmi pemerintah.</span><div class="footer-links"><a href="#">Privasi</a><a href="#">Ketentuan</a><a href="#">Bantuan</a></div></footer>
  </main>`;
}

function problemCard(number,title,text) { return `<article class="problem-card"><span class="problem-number">${number}</span><h3>${title}</h3><p>${text}</p></article>`; }
function moduleCard(iconName,title,text) { return `<article class="module-card"><span class="feature-icon">${icon(iconName)}</span><h3>${title}</h3><p>${text}</p></article>`; }

function renderAuth() {
  document.title = "Masuk — Bantu Beres KEPSEK AI";
  app.innerHTML = `${ambient()}<main id="main-content" class="auth-page">
    <section class="auth-story">
      <div class="auth-story-head"><a href="/" data-route>${brand()}</a>${themeToggle(false)}</div>
      <div class="auth-message"><div class="eyebrow"><span class="eyebrow-dot"></span>Ruang kerja kepala sekolah</div><h1>Semua pekerjaan sekolah dalam <span class="gradient-text">satu tempat.</span></h1><p>Masuk untuk melanjutkan perencanaan, dokumen, agenda, dan pengelolaan kinerja sekolah Anda.</p></div>
      <div class="auth-proof"><span class="proof">${icon("shield-check")} Data antar sekolah terpisah</span><span class="proof">${icon("history")} Riwayat perubahan tersimpan</span></div>
    </section>
    <section class="auth-panel">
      <div class="auth-box">
        ${state.authNotice ? `<div class="auth-confirmation"><span class="confirmation-icon">${icon("mail")}</span><h2>Periksa email Anda</h2><p>Tautan konfirmasi akun telah dikirim ke <strong>${escapeHtml(state.authNotice)}</strong>. Setelah dikonfirmasi, kembali ke halaman ini untuk masuk.</p><button class="btn btn-primary btn-block" data-back-login>Kembali ke halaman masuk</button></div>` : `
          <h2>Selamat datang</h2><p>Masuk atau buat akun khusus kepala sekolah.</p>
          ${state.demo ? '<div class="demo-notice">Mode pratinjau aktif. Anda dapat menjelajahi seluruh tampilan web; fitur AI belum diaktifkan.</div>' : ""}
          <div class="auth-tabs"><button type="button" class="auth-tab active" data-auth-mode="login">Masuk</button><button type="button" class="auth-tab" data-auth-mode="signup">Buat akun</button></div>
          <form id="auth-form" data-mode="login" novalidate>
            <div id="name-field" class="form-group" hidden><label for="full-name">Nama lengkap kepala sekolah</label><input class="form-control" id="full-name" name="fullName" autocomplete="name" placeholder="Contoh: Budi Santoso, M.Pd."></div>
            <div class="form-group"><label for="email">Email</label><input class="form-control" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="kepsek@sekolah.sch.id" required></div>
            <div class="form-group"><label for="password">Kata sandi</label><input class="form-control" id="password" name="password" type="password" autocomplete="current-password" minlength="8" placeholder="Minimal 8 karakter" required></div>
            <div id="confirm-field" class="form-group" hidden><label for="confirm-password">Ulangi kata sandi</label><input class="form-control" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Ketik ulang kata sandi"></div>
            <div id="auth-error" class="form-error" role="alert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit"><span id="auth-submit-label">Masuk ke KEPSEK AI</span>${icon("arrow-right")}</button>
          </form>
          <div class="auth-foot">Akun ini membuat satu ruang kerja privat untuk sekolah Anda. Data pengguna sekolah lain tidak dapat diakses.</div>`}
      </div>
    </section>
  </main>`;
}

function renderOnboarding() {
  document.title = "Siapkan Workspace Sekolah — Bantu Beres";
  app.innerHTML = `<main id="main-content" class="onboarding-page">
    <header class="onboarding-head">${brand()}<div class="onboarding-head-actions">${themeToggle(false)}<button class="btn btn-secondary">${icon("circle-help")} Butuh bantuan</button></div></header>
    <div class="onboarding-body">
      <div class="step-heading"><div><div class="eyebrow"><span class="eyebrow-dot"></span>Siapkan workspace sekolah</div><h1>Kenalkan sekolah Anda</h1><p>Isi data utama terlebih dahulu. Dokumen dapat diunggah sekarang atau nanti.</p></div><span class="step-count">Data awal</span></div>
      <div class="onboard-progress"><span></span></div>
      <form id="onboarding-form">
        <div class="field-grid">
          <div class="form-group"><label for="school-name">Nama sekolah</label><input class="form-control" id="school-name" name="name" placeholder="Contoh: SD Negeri Harapan Bangsa" required></div>
          <div class="form-group"><label for="npsn">NPSN</label><input class="form-control" id="npsn" name="npsn" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" placeholder="8 digit NPSN" required><small class="field-hint">Gunakan tepat 8 angka tanpa spasi.</small></div>
          <div class="form-group"><label for="level">Jenjang</label><select class="form-control" id="level" name="level" required><option value="">Pilih jenjang</option><option>TK</option><option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option></select></div>
          <div class="form-group"><label for="school-status">Status sekolah</label><select class="form-control" id="school-status" name="status" required><option value="">Pilih status</option><option value="Negeri">Negeri</option><option value="Swasta">Swasta</option></select></div>
          <div class="form-group"><label for="principal-name">Nama kepala sekolah</label><input class="form-control" id="principal-name" name="principalName" value="${escapeHtml(state.user?.user_metadata?.full_name || "")}" required></div>
          <div class="form-group field-span"><label for="address">Alamat sekolah</label><input class="form-control" id="address" name="address" placeholder="Alamat lengkap sekolah"></div>
          <label class="upload-zone field-span optional-upload" for="onboard-files"><input id="onboard-files" type="file" multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*"><span class="upload-icon">${icon("upload-cloud")}</span><span><span class="optional-label">Opsional</span><strong>Punya dokumen sekolah lama?</strong><small>Anda boleh melewati bagian ini. Workspace tetap dapat dibuat tanpa mengunggah dokumen.</small><small id="onboard-file-status" class="upload-status">Belum ada file dipilih.</small></span></label>
        </div>
        <div id="onboarding-error" class="form-error" role="alert" hidden></div>
        <div class="onboarding-actions"><button type="button" class="btn btn-ghost" data-logout>${icon("arrow-left")} Keluar</button><button class="btn btn-primary" type="submit">Buat workspace sekolah ${icon("arrow-right")}</button></div>
      </form>
    </div>
  </main>`;
}

function navLink(path, label, iconName, active) {
  return `<a class="nav-item ${active ? "active" : ""}" href="${path}" data-route>${icon(iconName)}<span>${label}</span></a>`;
}

function appShell(content, active = "dashboard", title = "Beranda Kepala Sekolah") {
  const school = state.school || demoSchool;
  const principal = school.principal_name || state.user?.user_metadata?.full_name || "Kepala Sekolah";
  return `${ambient()}<div class="app-shell">
    <aside class="app-sidebar">
      <a href="/dashboard" data-route>${brand()}</a>
      <div class="school-switch"><span class="school-avatar">${escapeHtml((school.level || "KS").slice(0,2))}</span><div><strong>${escapeHtml(school.name)}</strong><small>Workspace aktif</small></div></div>
      <nav class="side-menu" aria-label="Menu aplikasi">
        <div class="menu-label">Ruang kerja</div>
        ${navLink("/dashboard","Beranda","layout-dashboard",active === "dashboard")}
        ${navLink("/profile","Profil & Memori","database",active === "profile")}
        ${navLink("/ai?type=pbd","Mutu & PBD","chart-no-axes-combined",active === "pbd")}
        ${navLink("/ai?type=ksp","KSP & Kurikulum","book-open-check",active === "ksp")}
        ${navLink("/ai?type=rkt","Perencanaan","route",active === "planning")}
        ${navLink("/ai?type=rkas","RKAS Assistant","wallet-cards",active === "rkas")}
        <div class="menu-label">Pengelolaan</div>
        ${navLink("/ai?type=activity","Program & Kegiatan","folder-kanban",active === "activity")}
        ${navLink("/ai?type=performance","Kinerja Kepala Sekolah","briefcase-business",active === "performance")}
        ${navLink("/documents","Pusat Dokumen","files",active === "documents")}
      </nav>
      <div class="sidebar-profile"><span class="user-avatar">${escapeHtml(initials(principal))}</span><div><strong>${escapeHtml(principal)}</strong><small>Kepala sekolah</small></div><button class="sidebar-logout" data-logout aria-label="Keluar">${icon("log-out")}</button></div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="page-heading"><small>${new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}</small><strong>${escapeHtml(title)}</strong></div>
        <a class="mobile-brand" href="/dashboard" data-route>${brand(true)}</a>
        <div class="top-actions"><label class="global-search">${icon("search")}<input id="global-search" aria-label="Cari dokumen" placeholder="Cari dokumen atau fitur"></label><button class="btn btn-primary" data-new-document>${icon("sparkles")} Pratinjau AI</button>${themeToggle(false)}<button class="icon-btn" aria-label="Notifikasi">${icon("bell")}<span class="notice-dot"></span></button></div>
      </header>
      <main id="main-content" class="content">${content}</main>
      <nav class="mobile-bottom" aria-label="Navigasi mobile">
        <a class="mobile-nav-item ${active === "dashboard" ? "active" : ""}" href="/dashboard" data-route>${icon("home")}Beranda</a>
        <a class="mobile-nav-item" href="/dashboard#agenda" data-route>${icon("calendar-days")}Agenda</a>
        <a class="mobile-nav-item ${["ksp","pbd","planning","rkas","activity","performance"].includes(active) ? "active" : ""}" href="/ai" data-route>${icon("sparkles")}Fitur AI</a>
        <a class="mobile-nav-item ${active === "documents" ? "active" : ""}" href="/documents" data-route>${icon("folder")}Dokumen</a>
      </nav>
    </div>
  </div>`;
}

function renderDashboard() {
  const school = state.school || demoSchool;
  const principal = school.principal_name || "Kepala Sekolah";
  const docs = state.documents.length ? state.documents : demoDocuments;
  const completion = calculateCompletion(school);
  document.title = "Beranda — Bantu Beres KEPSEK AI";
  const content = `<section class="command-hero">
    <div class="welcome-row"><div class="welcome"><small>Selamat datang, ${escapeHtml(principal)} 👋</small><h1>Siap membantu pekerjaan sekolah hari ini.</h1><p>Ada ${docs.filter((doc) => doc.status !== "approved").length || 3} dokumen yang masih perlu ditinjau.</p></div><div class="completion"><div class="completion-ring" style="--completion:${completion}%"><span>${completion}%</span></div><div><small>Kelengkapan workspace</small><strong>${completion >= 80 ? "Sudah baik" : "Hampir siap"}</strong></div></div></div>
    <form class="ai-command ai-command-paused" id="quick-ai-form">${icon("sparkles")}<input name="prompt" aria-label="Perintah untuk Kepsek AI" placeholder="Fitur AI akan diaktifkan pada tahap berikutnya" disabled><button aria-label="AI belum aktif" disabled>${icon("lock-keyhole")}</button></form>
  </section>
  <div class="dashboard-columns">
    <div>
      <section class="panel"><div class="panel-head"><div><h2>Prioritas hari ini</h2><p>Disusun dari agenda, dokumen, dan tenggat sekolah</p></div><button class="panel-link">Lihat agenda</button></div>
        <div class="priority-list">
          <button class="priority" data-open-ai="ksp"><span class="priority-icon tone-purple">${icon("book-open-check")}</span><span><strong>Tinjau KSP Tahun ${escapeHtml(school.academic_year || "2026/2027")}</strong><small>Periksa kembali data dan konsistensi dokumen</small></span><span class="priority-time">10.00<span class="badge badge-amber">Penting</span></span></button>
          <button class="priority"><span class="priority-icon tone-blue">${icon("users")}</span><span><strong>Rapat program penguatan literasi</strong><small>Ruang rapat • tim pengembang sekolah</small></span><span class="priority-time">13.00</span></button>
          <button class="priority" data-open-ai="performance"><span class="priority-icon tone-green">${icon("file-check-2")}</span><span><strong>Lengkapi bukti dukung kinerja</strong><small>Pemetaan aktivitas dan dokumen akuntabilitas</small></span><span class="priority-time">Besok</span></button>
        </div>
      </section>
      <div class="shortcuts">
        ${quickCard("ksp","book-open-check","Susun KSP","Dari profil sekolah")}
        ${quickCard("pbd","chart-no-axes-combined","Analisis PBD","Temukan prioritas")}
        ${quickCard("rkt","route","Buat RKT","Turunkan program")}
        ${quickCard("activity","folder-kanban","Administrasi kegiatan","SK sampai laporan")}
      </div>
    </div>
    <aside id="agenda" class="panel today-panel"><div class="panel-head"><div><h2>Hari ini</h2><p>Agenda kepala sekolah</p></div><button class="panel-link" data-add-agenda>${icon("plus")}</button></div>
      <div class="datebox"><span class="date-number">${String(new Date().getDate()).padStart(2,"0")}</span><div><strong>${new Intl.DateTimeFormat("id-ID",{weekday:"long",month:"long"}).format(new Date())}</strong><small>3 agenda • 1 tenggat</small></div></div>
      <div class="timeline"><div class="event now"><time>08.00</time><strong>Briefing pagi</strong><small>Ruang kepala sekolah</small></div><div class="event"><time>10.00</time><strong>Review dokumen KSP</strong><small>Bersama tim pengembang</small></div><div class="event"><time>13.00</time><strong>Rapat program literasi</strong><small>Ruang rapat</small></div></div>
      <div class="memory-health"><div class="memory-heading"><span>Memori Sekolah</span><strong>${completion}% lengkap</strong></div><div class="progress-track"><div class="progress-fill" style="--progress:${completion}%"></div></div><small>Lengkapi profil dan dokumen untuk hasil AI yang lebih spesifik.</small></div>
    </aside>
  </div>`;
  app.innerHTML = appShell(content, "dashboard", "Beranda Kepala Sekolah");
}

function quickCard(type, iconName, title, subtitle) {
  return `<button class="shortcut" data-open-ai="${type}"><span class="shortcut-icon">${icon(iconName)}</span><strong>${title}</strong><small>${subtitle}</small></button>`;
}

function calculateCompletion(school) {
  const values = [school.name, school.npsn, school.level, school.address, school.principal_name, school.profile_data?.vision, school.profile_data?.mission, school.profile_data?.student_count, school.profile_data?.teacher_count];
  return Math.max(20, Math.round(values.filter(Boolean).length / values.length * 100));
}

function renderProfile() {
  const school = state.school || demoSchool;
  const profile = school.profile_data || {};
  const sources = state.sources.length ? state.sources : demoSources;
  document.title = "Profil & Memori Sekolah — Bantu Beres";
  const sourceRows = sources.map((source) => `<div class="source-row"><span class="source-icon">${icon(source.mime_type?.includes("spreadsheet") || source.name?.match(/xlsx|xls|csv/i) ? "file-spreadsheet" : source.mime_type?.includes("pdf") ? "file-text" : "files")}</span><span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.summary || "Tersimpan di Memori Sekolah")}</small></span><span class="badge ${source.status === "ready" ? "badge-green" : "badge-neutral"}">${source.status === "ready" ? "Siap" : "Tersimpan"}</span></div>`).join("");
  const content = `<div class="page-intro"><div><h1>Profil & Memori Sekolah</h1><p>Sumber data utama yang digunakan untuk menyusun seluruh perencanaan dan dokumen sekolah.</p></div><button class="btn btn-primary" form="profile-form">${icon("save")} Simpan perubahan</button></div>
    <div class="split-layout">
      <section class="panel"><h2 class="section-title">Data sekolah terverifikasi</h2><form id="profile-form"><div class="field-grid">
        ${profileField("Nama sekolah","name",school.name,true)}${profileField("NPSN","npsn",school.npsn,true)}${profileField("Jenjang","level",school.level,true)}${profileField("Kepala sekolah","principal_name",school.principal_name,true)}
        <div class="form-group field-span"><label for="address">Alamat sekolah</label><input class="form-control" id="address" name="address" value="${escapeHtml(school.address || "")}"></div>
        <div class="form-group field-span"><label for="vision">Visi sekolah</label><textarea class="form-control" id="vision" name="vision">${escapeHtml(profile.vision || "")}</textarea></div>
        <div class="form-group field-span"><label for="mission">Misi sekolah</label><textarea class="form-control" id="mission" name="mission">${escapeHtml(profile.mission || "")}</textarea></div>
        ${profileField("Jumlah peserta didik","student_count",profile.student_count || "",false,"number")}${profileField("Jumlah guru","teacher_count",profile.teacher_count || "",false,"number")}
        ${profileField("Jumlah tenaga kependidikan","staff_count",profile.staff_count || "",false,"number")}${profileField("Jumlah ruang kelas","classroom_count",profile.classroom_count || "",false,"number")}
        <div class="form-group field-span"><label for="priority">Prioritas sekolah</label><input class="form-control" id="priority" name="priority" value="${escapeHtml(profile.priority || "")}" placeholder="Contoh: Penguatan literasi dan kualitas pembelajaran"></div>
      </div><div class="panel-actions"><button class="btn btn-primary" type="submit">${icon("save")} Simpan profil</button></div></form></section>
      <aside><section class="panel"><div class="panel-head"><div><h2>Dokumen sumber</h2><p>Word, Excel, PDF, dan gambar</p></div></div><label class="upload-zone" for="memory-upload"><input id="memory-upload" type="file" multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*"><span class="upload-icon">${icon("upload-cloud")}</span><span><strong>Unggah dokumen</strong><small>AI akan membantu membaca dan merangkumnya.</small></span></label><div class="source-list">${sourceRows}</div></section></aside>
    </div>`;
  app.innerHTML = appShell(content, "profile", "Profil & Memori Sekolah");
}

function profileField(label, name, value, readonly = false, type = "text") {
  return `<div class="form-group"><label for="${name}">${label}</label><input class="form-control" id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${readonly ? 'readonly aria-readonly="true"' : ""}></div>`;
}

function renderDocuments() {
  const docs = state.documents.length ? state.documents : demoDocuments;
  document.title = "Pusat Dokumen — Bantu Beres";
  const cards = docs.map((doc) => `<article class="document-card" data-document-id="${escapeHtml(doc.id)}" tabindex="0" role="button"><div class="document-card-top"><span class="document-icon">${icon(documentIcon(doc.type))}</span><span class="badge ${statusClass(doc.status)}">${statusLabel(doc.status)}</span></div><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(aiTypes[doc.type]?.label || "Dokumen sekolah")}</p><div class="document-meta"><span>Versi ${doc.version || 1}</span><span>${formatDate(doc.updated_at || new Date())}</span></div></article>`).join("");
  const content = `<div class="page-intro"><div><h1>Pusat Dokumen</h1><p>Semua draft, dokumen yang sedang ditinjau, dan arsip sekolah tersimpan dengan riwayat versinya.</p></div><button class="btn btn-primary" data-new-document>${icon("plus")} Buat dokumen</button></div>
    <div class="stats-grid"><div class="stat"><span class="stat-icon">${icon("files")}</span><div><small>Semua dokumen</small><strong>${docs.length}</strong></div></div><div class="stat"><span class="stat-icon">${icon("file-clock")}</span><div><small>Perlu ditinjau</small><strong>${docs.filter((doc) => doc.status === "review").length}</strong></div></div><div class="stat"><span class="stat-icon">${icon("file-check-2")}</span><div><small>Sudah disetujui</small><strong>${docs.filter((doc) => doc.status === "approved").length}</strong></div></div></div>
    ${cards ? `<div class="document-grid">${cards}</div>` : `<div class="panel empty-state"><span class="empty-icon">${icon("files")}</span><h3>Belum ada dokumen</h3><p>Buat dokumen pertama dengan bantuan KEPSEK AI.</p><button class="btn btn-primary" data-new-document>Mulai membuat</button></div>`}`;
  app.innerHTML = appShell(content, "documents", "Pusat Dokumen");
}

function documentIcon(type) {
  return ({ ksp: "book-open-check", pbd: "chart-no-axes-combined", rkt: "route", rkjm: "map", rkas: "wallet-cards", activity: "folder-kanban", sop: "list-checks", performance: "briefcase-business" })[type] || "file-text";
}

function statusClass(status) {
  return ({ approved: "badge-green", review: "badge-amber", draft: "badge-neutral" })[status] || "badge-neutral";
}

function statusLabel(status) {
  return ({ approved: "Disetujui", review: "Perlu ditinjau", draft: "Draft" })[status] || "Draft";
}

function renderAi() {
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  if (requestedType && aiTypes[requestedType]) state.aiType = requestedType;
  const type = aiTypes[state.aiType] || aiTypes.ksp;
  const aiEnabled = Boolean(state.config?.aiConfigured);
  const sources = state.sources.length ? state.sources : demoSources;
  document.title = `${type.label} — Bantu Beres KEPSEK AI`;
  const contextRows = sources.slice(0,4).map((source) => `<div class="source-row"><span class="source-icon">${icon("file-check-2")}</span><span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.summary || "Sumber siap digunakan")}</small></span>${icon("circle-check")}</div>`).join("");
  const content = `<div class="page-intro"><div><h1>${escapeHtml(type.label)}</h1><p>${escapeHtml(type.description)}</p></div></div>
    <div class="ai-studio-layout">
      <section class="ai-compose">
        <div class="compose-head"><div class="eyebrow"><span class="eyebrow-dot"></span>${aiEnabled ? "KEPSEK AI siap membantu" : "Pratinjau fitur AI"}</div><h1>${escapeHtml(type.title)}</h1><p>Sampaikan kebutuhan dengan bahasa sehari-hari. Data sekolah yang relevan akan ditambahkan otomatis.</p></div>
        ${aiEnabled ? "" : `<div class="ai-paused-banner">${icon("shield-check")}<span><strong>AI belum diaktifkan</strong><small>Tampilan dan alur sudah dapat diperiksa. Setelah AI aktif, hasil akan berisi dokumen lengkap, ringkasan keputusan, data yang dipakai, bagian yang perlu dikonfirmasi, dan pemeriksaan konsistensi.</small></span></div>`}
        <form id="ai-form">
          <div class="compose-body"><div class="form-group"><label for="ai-type">Jenis pekerjaan</label><select class="form-control" id="ai-type" name="type">${Object.entries(aiTypes).map(([key,item]) => `<option value="${key}" ${key === state.aiType ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div>
            <label class="form-group"><span style="display:block;margin-bottom:8px;font-size:.84rem;font-weight:700">Instruksi Anda</span><span class="smart-input"><textarea id="ai-prompt" name="prompt" required>${escapeHtml(defaultPrompt(state.aiType))}</textarea><span class="smart-tools"><small>Semakin spesifik, hasil semakin sesuai.</small><span class="tool-buttons"><button type="button" class="tool-btn" aria-label="Lampirkan file">${icon("paperclip")}</button><button type="button" class="tool-btn" aria-label="Gunakan suara">${icon("mic")}</button></span></span></span></label>
            <div class="template-grid"><button type="button" class="template-card selected" data-template="Gunakan seluruh data terverifikasi dan buat dokumen baru dari awal."><strong>Buat dari awal</strong><small>Gunakan seluruh data terverifikasi.</small></button><button type="button" class="template-card" data-template="Perbarui dokumen sebelumnya dan pertahankan bagian yang masih relevan."><strong>Perbarui dokumen lama</strong><small>Pertahankan bagian yang masih relevan.</small></button></div>
          </div>
          <div class="compose-actions"><div class="model-ready ${aiEnabled ? "" : "offline"}"><span></span>${aiEnabled ? "Model AI siap • sumber terhubung" : "AI belum aktif • mode pratinjau"}</div><button class="btn btn-primary" type="submit" ${aiEnabled ? "" : "disabled"}>${icon(aiEnabled ? "sparkles" : "lock-keyhole")} ${aiEnabled ? "Susun draft" : "Segera tersedia"}</button></div>
        </form>
        <div class="generating" id="generating"><div class="ai-loader"><span class="ai-loader-icon">${icon("sparkles")}</span></div><h2>Sedang menyusun draft…</h2><p>KEPSEK AI membaca profil, sumber sekolah, dan memeriksa konsistensi hasil.</p><div class="processing-list"><div class="processing-item"><span>✓</span>Membaca Profil Sekolah</div><div class="processing-item"><span>✓</span>Menghubungkan sumber relevan</div><div class="processing-item"><span>•</span>Menyusun dan memeriksa draft</div></div></div>
        <div class="generation-done" id="generation-done"><span class="done-icon">${icon("file-check-2")}</span><h2>Draft berhasil disusun</h2><p>Dokumen masih berstatus draft dan perlu ditinjau kepala sekolah sebelum digunakan.</p><div class="result-preview"><strong id="result-title">${escapeHtml(type.label)}</strong><small id="result-summary">Draft siap ditinjau dan diedit.</small></div><div id="result-details" class="result-details"></div><div class="result-actions"><button class="btn btn-secondary" id="generate-again">Buat ulang</button><button class="btn btn-primary" id="open-result">Tinjau dan edit ${icon("arrow-right")}</button></div></div>
      </section>
      <aside class="context-column"><div class="context-summary"><span>${icon("brain-circuit")} Memori Sekolah</span><strong>${sources.length + 1} sumber siap digunakan</strong><small>Semua sumber berasal dari workspace ${escapeHtml((state.school || demoSchool).name)}.</small></div><section class="panel"><div class="panel-head"><div><h2>Sumber terhubung</h2><p>Data yang akan dipakai AI</p></div></div><div class="source-list">${contextRows}</div></section></aside>
    </div>`;
  app.innerHTML = appShell(content, activeForType(state.aiType), type.label);
}

function activeForType(type) {
  return ({ ksp: "ksp", pbd: "pbd", rkjm: "planning", rkt: "planning", rkas: "rkas", activity: "activity", sop: "activity", performance: "performance" })[type] || "ksp";
}

function defaultPrompt(type) {
  const school = state.school || demoSchool;
  return ({
    ksp: `Susun draft KSP tahun ${school.academic_year || "2026/2027"} berdasarkan profil sekolah dan prioritas dari Rapor Pendidikan. Gunakan bahasa formal yang mudah dipahami.`,
    pbd: "Analisis data mutu sekolah, tentukan indikator prioritas, akar masalah, rekomendasi pembenahan, dan indikator keberhasilannya.",
    rkjm: "Susun RKJM empat tahunan berdasarkan visi, kondisi, dan prioritas sekolah. Hubungkan sasaran, program, indikator, dan target per tahun.",
    rkt: "Susun RKT berdasarkan prioritas sekolah. Sertakan program, kegiatan, indikator, target, jadwal, dan penanggung jawab.",
    rkas: "Turunkan program RKT menjadi draft kegiatan dan anggaran. Tandai bagian yang perlu diverifikasi terhadap juknis BOSP dan ARKAS.",
    activity: "Susun dokumen administrasi kegiatan yang terdiri dari program, SK panitia, surat tugas, undangan, daftar hadir, notulen, berita acara, dan laporan.",
    sop: "Susun SOP sekolah lengkap dengan tujuan, ruang lingkup, penanggung jawab, langkah kerja, waktu layanan, dan dokumen pendukung.",
    performance: "Petakan aktivitas sekolah menjadi dokumen dan bukti dukung kinerja kepala sekolah, lalu susun refleksi serta tindak lanjut.",
  })[type] || "Susun dokumen berdasarkan profil dan kondisi sekolah.";
}

function renderDocumentEditor() {
  const id = decodeURIComponent(window.location.pathname.split("/").pop());
  const docs = state.documents.length ? state.documents : demoDocuments;
  const doc = docs.find((item) => item.id === id) || state.selectedDocument;
  if (!doc) { navigate("/documents"); return; }
  state.selectedDocument = doc;
  document.title = `${doc.title} — Bantu Beres`;
  const contentMeta = typeof doc.content === "object" && doc.content ? doc.content : {};
  const reviewItems = [
    ...(contentMeta.missingFields || []).map((item) => ({ tone: "warning", label: "Perlu dilengkapi", text: item })),
    ...(contentMeta.assumptions || []).map((item) => ({ tone: "neutral", label: "Asumsi draft", text: item })),
    ...(contentMeta.consistencyChecks || []).map((item) => ({ tone: item.status === "ok" ? "ok" : "warning", label: item.label || "Pemeriksaan", text: item.note || item.status })),
  ];
  const reviewPanel = reviewItems.length ? `<section class="panel review-panel"><h2 class="section-title">Catatan peninjauan</h2><div class="review-list">${reviewItems.slice(0,8).map((item) => `<div class="review-item ${item.tone}">${icon(item.tone === "ok" ? "circle-check" : item.tone === "warning" ? "circle-alert" : "circle-help")}<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.text)}</small></span></div>`).join("")}</div></section>` : "";
  const sourcePanel = contentMeta.sources?.length ? `<section class="panel"><h2 class="section-title">Sumber yang digunakan</h2><div class="editor-source-list">${contentMeta.sources.map((source) => `<span>${icon("file-check-2")}${escapeHtml(source)}</span>`).join("")}</div></section>` : "";
  const content = `<div class="page-intro"><div><h1>${escapeHtml(doc.title)}</h1><p>Versi ${doc.version || 1} • ${statusLabel(doc.status)} • Periksa bagian bertanda [PERLU DIKONFIRMASI]</p></div><button class="btn btn-primary" id="save-document">${icon("save")} Simpan perubahan</button></div>
    <div class="doc-editor"><section class="editor-paper"><textarea id="document-content" aria-label="Isi dokumen">${escapeHtml(normalizeContent(doc.content))}</textarea></section><aside class="editor-tools"><section class="panel"><h2 class="section-title">Status dokumen</h2><select class="form-control" id="document-status"><option value="draft" ${doc.status === "draft" ? "selected" : ""}>Draft</option><option value="review" ${doc.status === "review" ? "selected" : ""}>Perlu ditinjau</option><option value="approved" ${doc.status === "approved" ? "selected" : ""}>Disetujui</option></select></section>${reviewPanel}${sourcePanel}<section class="panel"><h2 class="section-title">Ekspor dokumen</h2><div class="export-list"><button class="btn btn-secondary" data-export="docx">${icon("file-text")} Word (.docx)</button><button class="btn btn-secondary" data-export="xlsx">${icon("file-spreadsheet")} Excel (.xlsx)</button><button class="btn btn-secondary" data-export="pdf">${icon("file-down")} PDF (.pdf)</button></div></section><button class="btn btn-ghost" data-route-to="/documents">${icon("arrow-left")} Kembali ke dokumen</button></aside></div>`;
  app.innerHTML = appShell(content, "documents", "Editor Dokumen");
}

function normalizeContent(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (content.markdown) return content.markdown;
  if (content.text) return content.text;
  return JSON.stringify(content, null, 2);
}

function normalizeSchool(row) {
  if (!row) return null;
  const context = row.school_context && typeof row.school_context === "object" ? row.school_context : {};
  return {
    ...row,
    address: context.address || "",
    principal_name: context.principal_name || state.user?.user_metadata?.full_name || "Kepala Sekolah",
    onboarding_complete: Boolean(context.onboarding_complete),
    profile_data: context.profile_data && typeof context.profile_data === "object" ? context.profile_data : {},
  };
}

function schoolContext(school) {
  return {
    ...(school.school_context && typeof school.school_context === "object" ? school.school_context : {}),
    address: school.address || "",
    principal_name: school.principal_name || "",
    onboarding_complete: Boolean(school.onboarding_complete),
    profile_data: school.profile_data || {},
  };
}

async function route(options = {}) {
  const routeName = currentRoute();
  const protectedRoute = !["landing", "auth"].includes(routeName);
  if (protectedRoute && !state.user) {
    if (routeName === "ai" && !state.config?.configured) {
      state.demo = true;
      state.user = { id: "demo-user", email: "demo@bantuberes.id", user_metadata: { full_name: "Budi Santoso" } };
      state.school = demoSchool;
      state.documents = [...demoDocuments];
      state.sources = [...demoSources];
    } else {
      navigate("/auth");
      return;
    }
  }
  if (protectedRoute && state.user && !state.school && routeName !== "onboarding") {
    navigate("/onboarding");
    return;
  }
  ({ landing: renderLanding, auth: renderAuth, onboarding: renderOnboarding, dashboard: renderDashboard, profile: renderProfile, documents: renderDocuments, ai: renderAi, "document-editor": renderDocumentEditor })[routeName]?.();
  bindPageEvents();
  refreshIcons(app);
  if (!options.preserveScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindPageEvents() {
  app.querySelectorAll("[data-route]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); navigate(link.getAttribute("href")); }));
  app.querySelectorAll("[data-route-to]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.routeTo)));
  app.querySelectorAll("[data-open-ai]").forEach((button) => button.addEventListener("click", () => { state.aiType = button.dataset.openAi; navigate(`/ai?type=${state.aiType}`); }));
  app.querySelectorAll("[data-new-document]").forEach((button) => button.addEventListener("click", () => navigate("/ai")));
  app.querySelectorAll("[data-logout]").forEach((button) => button.addEventListener("click", logout));
  app.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", toggleTheme));
  app.querySelector("[data-back-login]")?.addEventListener("click", () => { state.authNotice = null; renderAuth(); bindPageEvents(); });

  const authTabs = app.querySelectorAll("[data-auth-mode]");
  authTabs.forEach((tab) => tab.addEventListener("click", () => {
    authTabs.forEach((item) => item.classList.toggle("active", item === tab));
    const signup = tab.dataset.authMode === "signup";
    app.querySelector("#name-field").hidden = !signup;
    app.querySelector("#confirm-field").hidden = !signup;
    app.querySelector("#auth-form").dataset.mode = signup ? "signup" : "login";
    app.querySelector("#auth-submit-label").textContent = signup ? "Buat akun kepala sekolah" : "Masuk ke KEPSEK AI";
    app.querySelector("#password").autocomplete = signup ? "new-password" : "current-password";
    app.querySelector("#full-name").required = signup;
    app.querySelector("#confirm-password").required = signup;
    const error = app.querySelector("#auth-error");
    if (error) error.hidden = true;
  }));

  app.querySelector("#auth-form")?.addEventListener("submit", handleAuth);
  app.querySelector("#onboarding-form")?.addEventListener("submit", handleOnboarding);
  app.querySelector("#profile-form")?.addEventListener("submit", handleProfileSave);
  app.querySelector("#memory-upload")?.addEventListener("change", (event) => handleFiles([...event.target.files]));
  app.querySelector("#onboard-files")?.addEventListener("change", (event) => {
    state.pendingFiles = [...event.target.files];
    const status = app.querySelector("#onboard-file-status");
    if (status) status.textContent = state.pendingFiles.length ? `${state.pendingFiles.length} file dipilih. File akan diunggah setelah workspace berhasil dibuat.` : "Belum ada file dipilih.";
  });
  app.querySelector("#quick-ai-form")?.addEventListener("submit", (event) => { event.preventDefault(); const prompt = new FormData(event.currentTarget).get("prompt"); state.pendingPrompt = String(prompt || ""); navigate("/ai"); });
  if (state.pendingPrompt && app.querySelector("#ai-prompt")) { app.querySelector("#ai-prompt").value = state.pendingPrompt; state.pendingPrompt = ""; }
  app.querySelector("#ai-type")?.addEventListener("change", (event) => { state.aiType = event.target.value; navigate(`/ai?type=${state.aiType}`); });
  app.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => { app.querySelectorAll("[data-template]").forEach((item) => item.classList.remove("selected")); button.classList.add("selected"); const prompt = app.querySelector("#ai-prompt"); prompt.value = `${prompt.value}\n\n${button.dataset.template}`; }));
  app.querySelector("#ai-form")?.addEventListener("submit", handleGenerate);
  app.querySelector("#generate-again")?.addEventListener("click", () => { state.aiResult = null; renderAi(); bindPageEvents(); refreshIcons(app); });
  app.querySelector("#open-result")?.addEventListener("click", openGeneratedResult);
  app.querySelectorAll("[data-document-id]").forEach((card) => { const open = () => navigate(`/documents/${encodeURIComponent(card.dataset.documentId)}`); card.addEventListener("click", open); card.addEventListener("keydown", (event) => { if (["Enter"," "].includes(event.key)) open(); }); });
  app.querySelector("#save-document")?.addEventListener("click", saveDocument);
  app.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportDocument(button.dataset.export)));
}

async function handleAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button[type=submit]");
  const error = app.querySelector("#auth-error");
  const data = Object.fromEntries(new FormData(form));
  error.hidden = true;
  submit.disabled = true;
  try {
    if (!form.reportValidity()) throw new Error("Periksa kembali kolom yang wajib diisi.");
    if (form.dataset.mode === "signup" && data.password !== data.confirmPassword) throw new Error("Kata sandi yang diulangi belum sama.");
    if (state.demo || !state.supabase) {
      await wait(650);
      state.user = { id: "demo-user", email: data.email || "demo@bantuberes.id", user_metadata: { full_name: data.fullName || "Budi Santoso" } };
      state.school = demoSchool;
      state.documents = [...demoDocuments];
      state.sources = [...demoSources];
      navigate("/dashboard");
      return;
    }
    if (form.dataset.mode === "signup") {
      const { data: result, error: authError } = await state.supabase.auth.signUp({ email: data.email, password: data.password, options: { data: { full_name: data.fullName }, emailRedirectTo: `${window.location.origin}/auth` } });
      if (authError) throw authError;
      if (!result.session) { state.authNotice = data.email; renderAuth(); bindPageEvents(); return; }
      state.session = result.session; state.user = result.user; navigate("/onboarding");
    } else {
      const { data: result, error: authError } = await state.supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (authError) throw authError;
      state.session = result.session; state.user = result.user;
      await loadWorkspace();
      navigate(state.school ? "/dashboard" : "/onboarding");
    }
  } catch (cause) {
    error.textContent = humanError(cause);
    error.hidden = false;
  } finally { submit.disabled = false; }
}

async function handleOnboarding(event) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button[type=submit]");
  const errorBox = app.querySelector("#onboarding-error");
  const values = Object.fromEntries(new FormData(event.currentTarget));
  submit.disabled = true; errorBox.hidden = true;
  try {
    if (!event.currentTarget.reportValidity()) throw new Error("Periksa kembali data sekolah yang wajib diisi.");
    if (state.demo || !state.supabase) {
      state.school = { ...demoSchool, ...values, principal_name: values.principalName, onboarding_complete: true };
      if (state.pendingFiles?.length) await handleFiles(state.pendingFiles);
      navigate("/dashboard"); return;
    }
    await loadWorkspace();
    if (state.school) { toast("Workspace sekolah Anda sudah tersedia"); navigate("/dashboard"); return; }
    const { data: schoolRow, error } = await state.supabase.from("kepsek_schools").insert({ owner_user_id: state.user.id, name: values.name.trim(), npsn: values.npsn.trim(), level: values.level, status: values.status, school_context: { address: values.address?.trim() || "", principal_name: values.principalName.trim(), onboarding_complete: true, profile_data: {} } }).select().single();
    if (error) throw error;
    const { error: profileError } = await state.supabase.from("kepsek_profiles").upsert({ user_id: state.user.id, principal_name: values.principalName }, { onConflict: "user_id" });
    if (profileError) throw profileError;
    state.school = normalizeSchool(schoolRow); state.membership = { role: "owner" };
    toast("Workspace sekolah berhasil dibuat");
    if (state.pendingFiles?.length) {
      await handleFiles(state.pendingFiles);
      state.pendingFiles = [];
    }
    navigate("/dashboard");
  } catch (cause) { errorBox.textContent = humanError(cause); errorBox.hidden = false; }
  finally { submit.disabled = false; }
}

async function handleProfileSave(event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const updated = { ...state.school, address: values.address, profile_data: { ...(state.school.profile_data || {}), vision: values.vision, mission: values.mission, student_count: Number(values.student_count) || null, teacher_count: Number(values.teacher_count) || null, staff_count: Number(values.staff_count) || null, classroom_count: Number(values.classroom_count) || null, priority: values.priority } };
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_schools").update({ school_context: schoolContext(updated) }).eq("id", state.school.id);
      if (error) throw error;
    }
    state.school = updated; toast("Profil sekolah berhasil disimpan");
  } catch (cause) { toast(humanError(cause), "error"); }
}

async function handleFiles(files) {
  if (!files.length) return;
  for (const file of files) {
    toast(`Mengunggah ${file.name}…`);
    try {
      let source = { id: crypto.randomUUID(), name: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size, status: "stored", summary: "Dokumen tersimpan", created_at: new Date().toISOString() };
      if (!state.demo && state.supabase) {
        const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-");
        const path = `${state.school.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await state.supabase.storage.from("kepsek-school-files").upload(path,file,{ upsert:false, contentType:file.type });
        if (uploadError) throw uploadError;
        let extractedText = ""; let summary = state.config?.aiConfigured ? "Dokumen tersimpan dan siap digunakan" : "Dokumen tersimpan. Analisis AI belum diaktifkan.";
        if (state.config?.aiConfigured && file.size <= Number(state.config.maxInlineFileBytes || 3000000)) {
          const analysis = await analyzeUploadedFile(file);
          extractedText = analysis.text || ""; summary = analysis.summary || summary;
          source.status = analysis.text ? "ready" : "stored";
        }
        const { data: saved, error } = await state.supabase.from("kepsek_sources").insert({ school_id:state.school.id, uploaded_by:state.user.id, name:file.name, storage_path:path, mime_type:source.mime_type, size_bytes:file.size, status:source.status, extracted_text:extractedText, summary }).select().single();
        if (error) throw error;
        source = saved;
      } else {
        if (file.type.startsWith("text/") || file.name.match(/\.(txt|csv)$/i)) { source.extracted_text = (await file.text()).slice(0,20000); source.status = "ready"; source.summary = "Teks dokumen berhasil dibaca"; }
      }
      state.sources.unshift(source); toast(`${file.name} berhasil disimpan`);
    } catch (cause) { toast(`${file.name}: ${humanError(cause)}`,"error"); }
  }
  if (currentRoute() === "profile") { renderProfile(); bindPageEvents(); refreshIcons(app); }
}

async function analyzeUploadedFile(file) {
  if (file.name.match(/\.docx$/i)) {
    try {
      const mammoth = await import("https://esm.sh/mammoth@1.9.1?bundle");
      const mammothApi = mammoth.default || mammoth;
      const result = await mammothApi.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const textFile = new File([result.value], file.name, { type: "text/plain" });
      return analyzeFile(textFile, file.name);
    } catch { return { text:"", summary:"File Word tersimpan. Ekstraksi teks belum berhasil." }; }
  }
  if (file.name.match(/\.(xlsx|xls)$/i)) {
    try {
      const XLSX = await import("https://esm.sh/xlsx@0.18.5?bundle");
      const XLSXApi = XLSX.default || XLSX;
      const workbook = XLSXApi.read(await file.arrayBuffer());
      const text = workbook.SheetNames.map((name) => `LEMBAR: ${name}\n${XLSXApi.utils.sheet_to_csv(workbook.Sheets[name])}`).join("\n\n");
      const textFile = new File([text], file.name, { type: "text/plain" });
      return analyzeFile(textFile, file.name);
    } catch { return { text:"", summary:"File Excel tersimpan. Ekstraksi data belum berhasil." }; }
  }
  return analyzeFile(file, file.name);
}

async function analyzeFile(file, originalName = file.name) {
  const session = await activeSession();
  if (!session) return {};
  const base64 = await fileToBase64(file);
  const response = await fetch("/api/analyze-file", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session.access_token}` }, body:JSON.stringify({ schoolId:state.school.id, name:originalName, mimeType:file.type, data:base64 }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Dokumen belum dapat dianalisis");
  return payload;
}

async function handleGenerate(event) {
  event.preventDefault();
  if (!state.config?.aiConfigured) {
    toast("Fitur AI belum diaktifkan pada versi ini.", "error");
    return;
  }
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  state.aiType = values.type;
  form.hidden = true;
  app.querySelector("#generating").classList.add("show");
  try {
    let result;
    if (state.demo || !state.supabase) {
      throw new Error("Hubungkan workspace sekolah sebelum menggunakan AI.");
    } else {
      const session = await activeSession();
      if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");
      const context = { school: state.school, sources: state.sources.slice(0,8).map((source) => ({ name:source.name, summary:source.summary, text:(source.extracted_text || "").slice(0,8000) })) };
      const response = await fetch("/api/generate", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session.access_token}` }, body:JSON.stringify({ type:values.type, prompt:values.prompt, context }) });
      result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI belum dapat menyusun dokumen");
    }
    state.aiResult = result;
    app.querySelector("#generating").classList.remove("show");
    app.querySelector("#generation-done").classList.add("show");
    app.querySelector("#result-title").textContent = result.title || aiTypes[values.type].label;
    app.querySelector("#result-summary").textContent = result.summary || "Draft siap ditinjau dan diedit.";
    app.querySelector("#result-details").innerHTML = renderAiResultDetails(result);
    refreshIcons(app.querySelector("#generation-done"));
  } catch (cause) {
    app.querySelector("#generating").classList.remove("show");
    form.hidden = false;
    toast(humanError(cause),"error");
  }
}

function renderAiResultDetails(result = {}) {
  const missing = Array.isArray(result.missingFields) ? result.missingFields : [];
  const checks = Array.isArray(result.consistencyChecks) ? result.consistencyChecks : [];
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const okChecks = checks.filter((check) => check?.status === "ok").length;
  const metrics = [
    ["Bagian perlu dilengkapi", missing.length, missing.length ? "warning" : "ok"],
    ["Pemeriksaan konsistensi", `${okChecks}/${checks.length || 0}`, checks.length && okChecks === checks.length ? "ok" : "neutral"],
    ["Sumber digunakan", sources.length, sources.length ? "ok" : "warning"],
  ];
  return `<div class="result-metrics">${metrics.map(([label,value,tone]) => `<div class="result-metric ${tone}"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></div>`).join("")}</div>${missing.length ? `<div class="result-warning">${icon("circle-alert")}<span><strong>Perlu konfirmasi kepala sekolah</strong><small>${escapeHtml(missing.slice(0,3).join(" • "))}${missing.length > 3 ? ` • dan ${missing.length - 3} lainnya` : ""}</small></span></div>` : ""}`;
}

async function openGeneratedResult() {
  if (!state.aiResult) return;
  const type = state.aiType;
  let doc = { id:crypto.randomUUID(), school_id:state.school.id, title:state.aiResult.title || aiTypes[type].label, type, status:"draft", version:1, content:state.aiResult.content || state.aiResult.markdown || "", updated_at:new Date().toISOString() };
  try {
    if (!state.demo && state.supabase) {
      const { data, error } = await state.supabase.from("kepsek_documents").insert({ school_id:state.school.id, created_by:state.user.id, type, title:doc.title, status:"draft", content:{ markdown:doc.content, summary:state.aiResult.summary, assumptions:state.aiResult.assumptions || [], missingFields:state.aiResult.missingFields || [], sources:state.aiResult.sources || [], consistencyChecks:state.aiResult.consistencyChecks || [], keyDecisions:state.aiResult.keyDecisions || [], documentMeta:state.aiResult.documentMeta || {} } }).select().single();
      if (error) throw error;
      doc = data;
    }
    state.documents.unshift(doc); state.selectedDocument = doc; navigate(`/documents/${encodeURIComponent(doc.id)}`);
  } catch (cause) { toast(humanError(cause),"error"); }
}

async function saveDocument() {
  const doc = state.selectedDocument;
  if (!doc) return;
  const content = app.querySelector("#document-content").value;
  const status = app.querySelector("#document-status").value;
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_documents").update({ content:{ ...(typeof doc.content === "object" ? doc.content : {}), markdown:content }, status, version:(doc.version || 1)+1, approved_at:status === "approved" ? new Date().toISOString() : null, approved_by:status === "approved" ? state.user.id : null }).eq("id",doc.id);
      if (error) throw error;
    }
    doc.content = { ...(typeof doc.content === "object" ? doc.content : {}), markdown:content }; doc.status = status; doc.version = (doc.version || 1)+1; doc.updated_at = new Date().toISOString();
    toast("Perubahan dokumen berhasil disimpan");
  } catch (cause) { toast(humanError(cause),"error"); }
}

async function exportDocument(format) {
  const doc = state.selectedDocument;
  const content = app.querySelector("#document-content")?.value || normalizeContent(doc?.content);
  if (!doc || !content) return;
  toast(`Menyiapkan file ${format.toUpperCase()}…`);
  try {
    if (format === "docx") {
      const { Document, Packer, Paragraph, TextRun } = await import("https://esm.sh/docx@9.5.1?bundle");
      const children = content.split(/\n/).map((line) => new Paragraph({ children:[new TextRun({ text:line || " ", bold:/^(BAB|JUDUL|RENCANA|KURIKULUM)/i.test(line) })] }));
      const blob = await Packer.toBlob(new Document({ sections:[{ children }] }));
      downloadBlob(blob,`${safeFilename(doc.title)}.docx`);
    } else if (format === "xlsx") {
      const XLSX = await import("https://esm.sh/xlsx@0.18.5?bundle");
      const XLSXApi = XLSX.default || XLSX;
      const rows = content.split(/\n/).map((line,index) => ({ No:index+1, Isi:line }));
      const book = XLSXApi.utils.book_new();
      XLSXApi.utils.book_append_sheet(book,XLSXApi.utils.json_to_sheet(rows),"Dokumen");
      XLSXApi.writeFile(book,`${safeFilename(doc.title)}.xlsx`);
    } else {
      const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2?bundle");
      const pdf = new jsPDF({ unit:"mm", format:"a4" });
      pdf.setFont("helvetica","normal"); pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(content,170);
      let y = 18;
      for (const line of lines) { if (y > 280) { pdf.addPage(); y = 18; } pdf.text(line,20,y); y += 6; }
      pdf.save(`${safeFilename(doc.title)}.pdf`);
    }
    toast("File berhasil dibuat");
  } catch (cause) { toast(`Ekspor gagal: ${humanError(cause)}`,"error"); }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url),1000);
}

function safeFilename(value) { return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-|-$/g,"") || "dokumen-sekolah"; }

async function loadWorkspace() {
  if (!state.supabase || !state.user) return;
  const { data, error } = await state.supabase.from("kepsek_schools").select("*").eq("owner_user_id",state.user.id).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if (error) throw error;
  state.membership = data ? { role:"owner" } : null;
  state.school = normalizeSchool(data);
  if (!state.school) return;
  const [docs,sources,projects,agendas] = await Promise.all([
    state.supabase.from("kepsek_documents").select("*").eq("school_id",state.school.id).order("updated_at",{ascending:false}),
    state.supabase.from("kepsek_sources").select("*").eq("school_id",state.school.id).order("created_at",{ascending:false}),
    state.supabase.from("kepsek_projects").select("*").eq("school_id",state.school.id).order("updated_at",{ascending:false}),
    state.supabase.from("kepsek_agendas").select("*").eq("school_id",state.school.id).gte("starts_at",new Date(Date.now()-86400000).toISOString()).order("starts_at",{ascending:true}).limit(20),
  ]);
  state.documents = docs.data || []; state.sources = sources.data || []; state.projects = projects.data || []; state.agendas = agendas.data || [];
}

async function activeSession() {
  if (!state.supabase) return null;
  const { data } = await state.supabase.auth.getSession();
  state.session = data.session; return data.session;
}

async function logout() {
  if (state.supabase && !state.demo) await state.supabase.auth.signOut();
  state.user = null; state.session = null; state.school = null; state.documents = []; state.sources = []; state.demo = !state.config?.configured; navigate("/auth");
}

function humanError(cause) {
  const message = cause?.message || String(cause || "Terjadi kesalahan");
  if (/Invalid login credentials/i.test(message)) return "Email atau kata sandi belum benar.";
  if (/already registered/i.test(message)) return "Email ini sudah terdaftar. Silakan masuk.";
  if (/kepsek_schools_status_check|violates check constraint/i.test(message)) return "Status atau jenjang sekolah belum sesuai. Pilih nilai yang tersedia lalu coba lagi.";
  if (/kepsek_schools_owner_user_id_key|duplicate key.*owner_user_id/i.test(message)) return "Akun ini sudah memiliki workspace sekolah. Silakan masuk kembali ke dashboard.";
  if (/kepsek_schools_npsn_key|duplicate key.*npsn/i.test(message)) return "NPSN ini sudah digunakan pada workspace lain. Periksa kembali NPSN sekolah.";
  if (/row-level security|permission denied/i.test(message)) return "Akses data belum diizinkan. Keluar lalu masuk kembali, kemudian coba lagi.";
  if (/Kata sandi yang diulangi|Periksa kembali/i.test(message)) return message;
  if (/fetch/i.test(message)) return "Koneksi ke layanan belum berhasil. Periksa internet dan coba lagi.";
  return message;
}

function fileToBase64(file) {
  return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(file); });
}

function wait(ms) { return new Promise((resolve) => window.setTimeout(resolve,ms)); }

async function init() {
  try {
    const response = await fetch("/api/config");
    state.config = response.ok ? await response.json() : { configured:false };
  } catch { state.config = { configured:false }; }
  state.demo = !state.config.configured;
  if (state.config.configured) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.75.1?bundle");
      state.supabase = createClient(state.config.supabaseUrl,state.config.supabasePublishableKey,{ auth:{ persistSession:true,autoRefreshToken:true,detectSessionInUrl:true } });
      const { data } = await state.supabase.auth.getSession();
      state.session = data.session; state.user = data.session?.user || null;
      if (state.user) await loadWorkspace();
      state.supabase.auth.onAuthStateChange((_event,session) => { state.session = session; state.user = session?.user || null; });
    } catch (cause) { console.warn("Supabase initialization failed",cause); state.demo = true; }
  }
  state.loading = false;
  await route();
}

window.addEventListener("popstate",route);
init();
