import { cleanDocumentText, documentStatistics, parseDocumentBlocks } from "/assets/document-format.js";
import { renderAiText } from "/assets/ai-text-format.js";
import { isIdleSession, SESSION_IDLE_MS } from "/assets/session-policy.js";

const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const APP_NAME = "Bantu Beres – Asisten AI Kepala Sekolah";
const SESSION_ACTIVITY_KEY = "bb-session-last-activity";
const ACTIVITY_WRITE_INTERVAL_MS = 30_000;
let lastActivityWrite = 0;
let idleCheckTimer = null;

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
  teamMembers: [],
  workspaceInvites: [],
  templateFolders: [],
  assistantMessages: [],
  assistantSending: false,
  assistantDraft: "",
  selectedDocument: null,
  documentMode: "preview",
  aiType: "ksp",
  aiResult: null,
  demo: false,
  loading: true,
  authNotice: null,
  pendingFiles: [],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedAgendaDate: "",
  configUpdatedAt: 0,
  idleLogoutInProgress: false,
  pendingInviteToken: new URLSearchParams(window.location.search).get("token") || new URLSearchParams(window.location.search).get("invite") || "",
  inviteError: "",
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

function demoAgendaDate(dayOffset, hour, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

const demoAgendas = [
  { id: "agenda-briefing", title: "Briefing pagi", description: "Koordinasi singkat kesiapan pembelajaran dan layanan sekolah.", starts_at: demoAgendaDate(0,8), ends_at: demoAgendaDate(0,8,30), status: "scheduled", priority: "normal", metadata: { category:"Rapat", location:"Ruang kepala sekolah", rundown:"08.00 Pembukaan\n08.10 Informasi penting\n08.20 Pembagian tindak lanjut" } },
  { id: "agenda-ksp", title: "Review dokumen KSP", description: "Meninjau data, struktur, dan konsistensi KSP bersama tim pengembang.", starts_at: demoAgendaDate(0,10), ends_at: demoAgendaDate(0,11,30), status: "scheduled", priority: "high", metadata: { category:"Kurikulum", location:"Ruang rapat", rundown:"10.00 Cek profil sekolah\n10.30 Tinjau pengorganisasian pembelajaran\n11.00 Catat revisi" } },
  { id: "agenda-literasi", title: "Rapat program literasi", description: "Menetapkan kegiatan, indikator, dan penanggung jawab program literasi.", starts_at: demoAgendaDate(0,13), ends_at: demoAgendaDate(0,14,30), status: "scheduled", priority: "normal", metadata: { category:"Perencanaan", location:"Ruang rapat", rundown:"13.00 Pemaparan kondisi\n13.30 Penetapan program\n14.00 Pembagian tugas" } },
  { id: "agenda-supervisi", title: "Tindak lanjut supervisi", description: "Membahas hasil observasi dan rencana pendampingan.", starts_at: demoAgendaDate(1,9), ends_at: demoAgendaDate(1,10), status: "scheduled", priority: "high", metadata: { category:"Supervisi", location:"Ruang kepala sekolah", rundown:"09.00 Refleksi\n09.25 Rencana perbaikan\n09.45 Kesepakatan tindak lanjut" } },
];

const driveLibrary = [
  { id:"sop", name:"SOP Sekolah", count:116, icon:"list-checks", description:"Kumpulan SOP berbagai layanan dan bidang sekolah.", url:"https://drive.google.com/drive/folders/1NoGEOkaB-jgtR5ZOCvi3BHcR5YE-TN0j" },
  { id:"supervisi", name:"Instrumen Supervisi", count:4, icon:"clipboard-check", description:"Instrumen penelaahan ATP, modul ajar, administrasi, dan pelaksanaan pembelajaran.", url:"https://drive.google.com/drive/folders/1bwXV5zWnLO7R9fI8D7Z7z21KCTUQ89Tu" },
  { id:"ksp", name:"KSP / KOSP SD", count:42, icon:"book-open-check", description:"Format, contoh, dan lampiran kurikulum satuan pendidikan.", url:"https://drive.google.com/drive/folders/10EVhLR86p-eDCGGn42nrD7hsmvRWrneA" },
  { id:"program", name:"Program Kerja Kepala Sekolah", count:6, icon:"folder-kanban", description:"Format program kerja untuk pengelolaan kegiatan kepala sekolah.", url:"https://drive.google.com/drive/folders/1HuiEnCv6MZGTQq1Dr7ICCMNopJMtaAAM" },
  { id:"perencanaan", name:"EDS, RKS, RKJM, RKT & RKAS", count:26, icon:"route", description:"Pustaka format perencanaan dan penganggaran sekolah.", url:"https://drive.google.com/drive/folders/1er4FWVqJoe3BWmR-CQMeXlkyYr2tNde2" },
  { id:"bonus-bukti", name:"Bonus Bukti Dukung", count:87, icon:"file-check-2", description:"Bukti dukung untuk kepala sekolah, wakasek, dan guru.", url:"https://drive.google.com/drive/folders/17joD1iDRY-jdiAS-yPl4RLG3YXK04sez" },
  { id:"laporan", name:"Perencanaan & Laporan", count:10, icon:"file-text", description:"Format perencanaan dan laporan satuan pendidikan.", url:"https://drive.google.com/drive/folders/1p41ALqNOY3g9xUdHtWz-4VGNQWNyAf9l" },
  { id:"pkks", name:"Penilaian Kinerja Kepala Sekolah", count:35, icon:"briefcase-business", description:"Format PKKS, pemetaan bukti, dan dokumen pendukung.", url:"https://drive.google.com/drive/folders/1BYeYq7CK7L3X280q7AFlGaj5enbP1Dsi" },
  { id:"book", name:"Buku Panduan", count:7, icon:"book-open-check", description:"Buku acuan yang mendukung pekerjaan kepala sekolah.", url:"https://drive.google.com/drive/folders/1hYxso9HpO3AMulR6NxoYrQ_q1L40arNo" },
  { id:"bukti", name:"Bukti Dukung Kepala Sekolah", count:87, icon:"files", description:"Arsip format bukti dukung kepala sekolah, wakasek, dan guru.", url:"https://drive.google.com/drive/folders/1VjPQw6I5HTRN-Fxdq19TDDoA2NT61LIq" },
  { id:"kehadiran", name:"Rangkuman Kehadiran Guru", count:5, icon:"users", description:"Format rangkuman dan analisis kehadiran guru.", url:"https://drive.google.com/drive/folders/1zbuhmSUg97Ld1uRTGWdPg2Q2lyP4Lt-D" },
];

const demoTeamMembers = [
  { id:"team-1", user_id:"demo-member-1", display_name:"Siti Rahmawati", email:"operator@harapbangsa.sch.id", joined_at:new Date().toISOString() },
  { id:"team-2", user_id:"demo-member-2", display_name:"Andi Pratama", email:"wakasek@harapbangsa.sch.id", joined_at:new Date().toISOString() },
];

const demoTemplateFolders = [
  { id:"folder-demo", name:"Format Khusus SDN Harapan Bangsa", category:"Folder sekolah", description:"Template internal yang tetap tersimpan di Google Drive sekolah.", drive_url:"https://drive.google.com/drive/folders/1EEoLPNgaLdnPdzJLvgxx_TVgvV7_E3DO" },
];

const assistantSuggestions = [
  "Apa tiga prioritas sekolah yang paling penting saat ini?",
  "Bantu saya menyiapkan poin rapat minggu ini.",
  "Apa data Memori Sekolah yang masih perlu dilengkapi?",
  "Berikan ide program sederhana sesuai kondisi sekolah saya.",
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
  "clipboard-check": '<rect width="16" height="18" x="4" y="3" rx="2"/><path d="M9 3V1h6v2M8 12l2 2 5-5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  "file-check-2": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
  "file-clock": '<path d="M14 2H6a2 2 0 0 0-2 2v7M14 2v6h6M16 13a5 5 0 1 0 5 5M16 15v3l2 1"/>',
  "file-down": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 12v6m-3-3 3 3 3-3"/>',
  "file-spreadsheet": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8M11 13v4"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  files: '<path d="M15 2H6a2 2 0 0 0-2 2v13"/><rect width="14" height="16" x="6" y="6" rx="2"/><path d="M14 6v4h4"/>',
  "external-link": '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  "folder-kanban": '<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M8 11v5M12 11v3M16 11v6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  "layout-dashboard": '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  "list-checks": '<path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17M10 6h11M10 12h11M10 18h11"/>',
  "lock-keyhole": '<rect width="18" height="12" x="3" y="10" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>',
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
  "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
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
    <span class="brand-symbol" aria-hidden="true"><img src="/assets/bantu-beres-symbol.png" alt=""></span>
    <span class="brand-copy"><span class="brand-name"><span>Bantu</span><span>Beres</span></span><span class="brand-product">Asisten AI Kepala Sekolah</span></span>
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
    "/calendar": "calendar",
    "/profile": "profile",
    "/documents": "documents",
    "/ai": "ai",
    "/assistant": "assistant",
    "/team": "team",
    "/templates": "templates",
    "/guide": "guide",
    "/more": "more",
    "/join": "join",
  }[path] || "landing";
}

function ambient() {
  return `<div class="ambient"></div><div class="ambient-grid"></div>`;
}

function renderLanding() {
  document.title = `${APP_NAME}.`;
  app.innerHTML = `${ambient()}<main id="main-content" class="public-page">
    <nav class="public-nav glass" aria-label="Navigasi utama">
      <a href="/" data-route aria-label="${APP_NAME}">${brand()}</a>
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
          <div class="mini-top"><div class="mini-brand"><span class="brand-symbol"><img src="/assets/bantu-beres-symbol.png" alt=""></span>Bantu Beres</div><div class="window-dots"><span></span><span></span><span></span></div></div>
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
    <section class="public-section"><div class="section-heading"><div class="eyebrow"><span class="eyebrow-dot"></span>Masalah yang dibereskan</div><h2>Administrasi sekolah tidak seharusnya menghabiskan waktu memimpin.</h2><p>Bantu Beres mengurangi pengulangan, membantu menjaga konsistensi, dan membuat pekerjaan penting lebih mudah ditemukan.</p></div><div class="problem-grid">
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
    <section id="keamanan" class="public-section"><div class="section-heading"><div class="eyebrow"><span class="eyebrow-dot"></span>Pertanyaan umum</div><h2>Jelas sebelum mulai.</h2></div><div class="faq-list"><details class="faq-item"><summary>Apakah hasil AI hanya berupa kerangka?</summary><p>Tidak. Sistem menyusun dokumen lengkap, mengikuti memori dan template sekolah, lalu memeriksa struktur serta konsistensinya. Kepala sekolah tetap meninjau dan mengesahkan hasil sebelum digunakan.</p></details><details class="faq-item"><summary>Apakah Bantu Beres menggantikan ARKAS atau e-Kinerja?</summary><p>Tidak. Bantu Beres membantu menyusun, memeriksa, dan mengelola dokumen kerja. Penginputan serta pengesahan tetap dilakukan melalui sistem resmi.</p></details><details class="faq-item"><summary>Apakah data sekolah lain dapat terlihat?</summary><p>Tidak. Database menggunakan workspace dan Row Level Security untuk memisahkan akses setiap sekolah.</p></details><details class="faq-item"><summary>Format apa yang dapat diunggah dan diekspor?</summary><p>Dokumen dapat diunggah dalam format Word, Excel, PDF, CSV, teks, atau gambar. Hasil dapat diekspor ke Word, Excel, dan PDF.</p></details></div></section>
    <section class="final-cta"><h2>Lebih sedikit mengulang administrasi. Lebih banyak waktu memimpin sekolah.</h2><p>Bangun Memori Sekolah dan mulai susun pekerjaan pertama bersama Bantu Beres.</p><button class="btn btn-primary" data-route-to="/auth">Buat workspace sekolah ${icon("arrow-right")}</button></section>
    <footer class="public-footer"><a href="/" data-route>${brand()}</a><span>© ${new Date().getFullYear()} Bantu Beres. Asisten AI membantu menyusun draft dan bukan sistem resmi pemerintah.</span><div class="footer-links"><a href="#">Privasi</a><a href="#">Ketentuan</a><a href="#cara-kerja">Cara kerja</a></div></footer>
  </main>`;
}

function problemCard(number,title,text) { return `<article class="problem-card"><span class="problem-number">${number}</span><h3>${title}</h3><p>${text}</p></article>`; }
function moduleCard(iconName,title,text) { return `<article class="module-card"><span class="feature-icon">${icon(iconName)}</span><h3>${title}</h3><p>${text}</p></article>`; }

function renderAuth() {
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite") || state.pendingInviteToken || "";
  const signup = params.get("mode") === "signup";
  if (inviteToken) state.pendingInviteToken = inviteToken;
  document.title = `Masuk — ${APP_NAME}`;
  app.innerHTML = `${ambient()}<main id="main-content" class="auth-page">
    <section class="auth-story">
      <div class="auth-story-head"><a href="/" data-route>${brand()}</a>${themeToggle(false)}</div>
      <div class="auth-message"><div class="eyebrow"><span class="eyebrow-dot"></span>Ruang kerja kepala sekolah</div><h1>Semua pekerjaan sekolah dalam <span class="gradient-text">satu tempat.</span></h1><p>Masuk untuk melanjutkan perencanaan, dokumen, agenda, dan pengelolaan kinerja sekolah Anda.</p></div>
      <div class="auth-proof"><span class="proof">${icon("shield-check")} Data antar sekolah terpisah</span><span class="proof">${icon("history")} Riwayat perubahan tersimpan</span></div>
    </section>
    <section class="auth-panel">
      <div class="auth-box">
        ${state.authNotice ? `<div class="auth-confirmation"><span class="confirmation-icon">${icon("mail")}</span><h2>Periksa email Anda</h2><p>Tautan konfirmasi akun telah dikirim ke <strong>${escapeHtml(state.authNotice)}</strong>. Setelah dikonfirmasi, kembali ke halaman ini untuk masuk.</p><button class="btn btn-primary btn-block" data-back-login>Kembali ke halaman masuk</button></div>` : `
          <h2>${inviteToken ? "Gabung ke workspace sekolah" : "Selamat datang"}</h2><p>${inviteToken ? "Gunakan email yang menerima undangan. Akun Anda akan memperoleh akses kerja penuh." : "Masuk atau buat akun untuk mengelola workspace sekolah."}</p>
          ${inviteToken ? `<div class="invite-auth-note">${icon("users")} Undangan tim sekolah terdeteksi</div>` : ""}
          ${state.demo ? '<div class="demo-notice">Mode pratinjau aktif. Anda dapat menjelajahi seluruh tampilan web; fitur AI belum diaktifkan.</div>' : ""}
          <div class="auth-tabs"><button type="button" class="auth-tab ${signup ? "" : "active"}" data-auth-mode="login">Masuk</button><button type="button" class="auth-tab ${signup ? "active" : ""}" data-auth-mode="signup">Buat akun</button></div>
          <form id="auth-form" data-mode="${signup ? "signup" : "login"}" novalidate>
            <div id="name-field" class="form-group" ${signup ? "" : "hidden"}><label for="full-name">Nama lengkap</label><input class="form-control" id="full-name" name="fullName" autocomplete="name" placeholder="Contoh: Siti Rahmawati" ${signup ? "required" : ""}></div>
            <div class="form-group"><label for="email">Email</label><input class="form-control" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="kepsek@sekolah.sch.id" required></div>
            <div class="form-group"><label for="password">Kata sandi</label><input class="form-control" id="password" name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" placeholder="Minimal 8 karakter" required></div>
            <div id="confirm-field" class="form-group" ${signup ? "" : "hidden"}><label for="confirm-password">Ulangi kata sandi</label><input class="form-control" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Ketik ulang kata sandi" ${signup ? "required" : ""}></div>
            <div id="auth-error" class="form-error" role="alert" hidden></div>
            <button class="btn btn-primary btn-block" type="submit"><span id="auth-submit-label">${signup ? "Buat akun" : "Masuk ke workspace"}</span>${icon("arrow-right")}</button>
          </form>
          <div class="auth-foot">${inviteToken ? "Setiap anggota memakai akun sendiri; tidak perlu berbagi kata sandi kepala sekolah." : "Akun ini membuat satu ruang kerja privat untuk sekolah Anda. Data pengguna sekolah lain tidak dapat diakses."}</div>`}
      </div>
    </section>
  </main>`;
}

function renderOnboarding() {
  document.title = `Siapkan Workspace Sekolah — ${APP_NAME}`;
  app.innerHTML = `<main id="main-content" class="onboarding-page">
    <header class="onboarding-head">${brand()}<div class="onboarding-head-actions">${themeToggle(false)}<button class="btn btn-secondary" type="button" data-route-to="/guide">${icon("circle-help")} Butuh bantuan</button></div></header>
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
        ${navLink("/assistant","Asisten AI","brain-circuit",active === "assistant")}
        ${navLink("/calendar","Agenda & Kalender","calendar-days",active === "calendar")}
        ${navLink("/profile","Profil & Memori","database",active === "profile")}
        ${navLink("/team","Tim Sekolah","users",active === "team")}
        ${navLink("/ai?type=pbd","Mutu & PBD","chart-no-axes-combined",active === "pbd")}
        ${navLink("/ai?type=ksp","KSP & Kurikulum","book-open-check",active === "ksp")}
        ${navLink("/ai?type=rkt","Perencanaan","route",active === "planning")}
        ${navLink("/ai?type=rkas","RKAS Assistant","wallet-cards",active === "rkas")}
        <div class="menu-label">Pengelolaan</div>
        ${navLink("/ai?type=activity","Program & Kegiatan","folder-kanban",active === "activity")}
        ${navLink("/ai?type=performance","Kinerja Kepala Sekolah","briefcase-business",active === "performance")}
        ${navLink("/documents","Pusat Dokumen","files",active === "documents")}
        <div class="menu-label">Referensi & bantuan</div>
        ${navLink("/templates","Pustaka Format","folder",active === "templates")}
        ${navLink("/guide","Panduan Kerja","circle-help",active === "guide")}
      </nav>
      <div class="sidebar-profile"><span class="user-avatar">${escapeHtml(initials(principal))}</span><div><strong>${escapeHtml(principal)}</strong><small>Akses penuh sekolah</small></div><button class="sidebar-logout" data-logout aria-label="Keluar">${icon("log-out")}</button></div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="page-heading"><small>${new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}</small><strong>${escapeHtml(title)}</strong></div>
        <a class="mobile-brand" href="/dashboard" data-route>${brand(true)}</a>
        <div class="top-actions"><label class="global-search">${icon("search")}<input id="global-search" aria-label="Cari dokumen" placeholder="Cari dokumen atau fitur"></label><button class="btn btn-primary" data-new-document>${icon("sparkles")} ${state.config?.aiConfigured ? "Buat dengan AI" : "Pratinjau AI"}</button>${themeToggle(false)}<button class="icon-btn" aria-label="Notifikasi">${icon("bell")}<span class="notice-dot"></span></button></div>
      </header>
      <main id="main-content" class="content">${content}</main>
      <nav class="mobile-bottom" aria-label="Navigasi mobile">
        <a class="mobile-nav-item ${active === "dashboard" ? "active" : ""}" href="/dashboard" data-route>${icon("home")}Beranda</a>
        <a class="mobile-nav-item ${active === "assistant" ? "active" : ""}" href="/assistant" data-route>${icon("brain-circuit")}Asisten</a>
        <a class="mobile-nav-item ${active === "calendar" ? "active" : ""}" href="/calendar" data-route>${icon("calendar-days")}Agenda</a>
        <a class="mobile-nav-item ${active === "documents" ? "active" : ""}" href="/documents" data-route>${icon("folder")}Dokumen</a>
        <a class="mobile-nav-item ${["more","team","templates","guide","profile","ksp","pbd","planning","rkas","activity","performance"].includes(active) ? "active" : ""}" href="/more" data-route>${icon("menu")}Menu</a>
      </nav>
    </div>
  </div>`;
}

function renderDashboard() {
  const school = state.school || demoSchool;
  const principal = school.principal_name || "Kepala Sekolah";
  const docs = state.documents.length ? state.documents : demoDocuments;
  const completion = calculateCompletion(school);
  const todayKey = localDateKey(new Date());
  const todayAgendas = agendasForDate(todayKey);
  const upcomingAgendas = currentAgendas().filter((agenda) => new Date(agenda.starts_at) >= startOfToday()).slice(0,3);
  const timeline = todayAgendas.length ? todayAgendas.map((agenda) => agendaTimelineItem(agenda)).join("") : `<div class="agenda-empty compact"><span class="empty-icon">${icon("calendar-days")}</span><strong>Belum ada agenda hari ini</strong><small>Tambahkan kegiatan agar rundown harian tersusun.</small><button class="btn btn-secondary" data-add-agenda data-date="${todayKey}">${icon("plus")} Tambah agenda</button></div>`;
  const priorityRows = upcomingAgendas.length ? upcomingAgendas.map((agenda) => priorityAgendaItem(agenda)).join("") : `<button class="priority" data-add-agenda data-date="${todayKey}"><span class="priority-icon tone-blue">${icon("calendar-days")}</span><span><strong>Susun agenda pertama</strong><small>Tambahkan rapat, supervisi, atau kegiatan sekolah.</small></span><span class="priority-time">Tambah</span></button>`;
  const aiEnabled = Boolean(state.config?.aiConfigured);
  document.title = `Beranda — ${APP_NAME}`;
  const content = `<section class="command-hero">
    <div class="welcome-row"><div class="welcome"><small>Selamat datang, ${escapeHtml(principal)} 👋</small><h1>Siap membantu pekerjaan sekolah hari ini.</h1><p>Ada ${docs.filter((doc) => doc.status !== "approved").length || 3} dokumen yang masih perlu ditinjau.</p></div><div class="completion"><div class="completion-ring" style="--completion:${completion}%"><span>${completion}%</span></div><div><small>Kelengkapan workspace</small><strong>${completion >= 80 ? "Sudah baik" : "Hampir siap"}</strong></div></div></div>
    <form class="ai-command ${aiEnabled ? "" : "ai-command-paused"}" id="quick-ai-form">${icon("sparkles")}<input name="prompt" aria-label="Pesan untuk Asisten AI" placeholder="${aiEnabled ? "Tanya Asisten AI tentang sekolah Anda…" : "AI belum aktif — periksa konfigurasi server"}" ${aiEnabled ? "" : "disabled"}><button aria-label="${aiEnabled ? "Kirim ke Asisten AI" : "AI belum aktif"}" ${aiEnabled ? "" : "disabled"}>${icon(aiEnabled ? "arrow-right" : "lock-keyhole")}</button></form>
  </section>
  <div class="dashboard-columns">
    <div>
      <section class="panel"><div class="panel-head"><div><h2>Agenda terdekat</h2><p>Hari ini, besok, dan kegiatan berikutnya</p></div><button class="panel-link" data-route-to="/calendar">Lihat kalender</button></div>
        <div class="priority-list">
          ${priorityRows}
        </div>
      </section>
      <div class="shortcuts">
        ${quickCard("ksp","book-open-check","Susun KSP","Dari profil sekolah")}
        ${quickCard("pbd","chart-no-axes-combined","Analisis PBD","Temukan prioritas")}
        ${quickCard("rkt","route","Buat RKT","Turunkan program")}
        ${quickCard("activity","folder-kanban","Administrasi kegiatan","SK sampai laporan")}
      </div>
    </div>
    <aside id="agenda" class="panel today-panel"><div class="panel-head"><div><h2>Hari ini</h2><p>Rundown kepala sekolah</p></div><button class="panel-link add-round" data-add-agenda data-date="${todayKey}">${icon("plus")}<span>Tambah</span></button></div>
      <div class="datebox"><span class="date-number">${String(new Date().getDate()).padStart(2,"0")}</span><div><strong>${new Intl.DateTimeFormat("id-ID",{weekday:"long",month:"long"}).format(new Date())}</strong><small>${todayAgendas.length} agenda terjadwal</small></div></div>
      <div class="timeline">${timeline}</div>
      <button class="calendar-cta" data-route-to="/calendar">${icon("calendar-days")}<span><strong>Buka kalender lengkap</strong><small>Lihat dan edit agenda satu tahun</small></span>${icon("arrow-right")}</button>
      <div class="memory-health"><div class="memory-heading"><span>Memori Sekolah</span><strong>${completion}% lengkap</strong></div><div class="progress-track"><div class="progress-fill" style="--progress:${completion}%"></div></div><small>Lengkapi profil dan dokumen untuk hasil AI yang lebih spesifik.</small></div>
    </aside>
  </div>`;
  app.innerHTML = appShell(content, "dashboard", "Beranda Kepala Sekolah");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0,0,0,0);
  return date;
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function currentAgendas() {
  return [...(state.agendas || [])].sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
}

function agendasForDate(dateKey) {
  return currentAgendas().filter((agenda) => localDateKey(agenda.starts_at) === dateKey && agenda.status !== "cancelled");
}

function agendaTimelineItem(agenda) {
  const time = new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(agenda.starts_at));
  const location = agenda.metadata?.location || agenda.description || "Detail belum ditambahkan";
  return `<button class="event ${agenda.priority === "high" ? "now" : ""}" data-edit-agenda="${escapeHtml(agenda.id)}"><time>${escapeHtml(time)}</time><strong>${escapeHtml(agenda.title)}</strong><small>${escapeHtml(location)}</small></button>`;
}

function priorityAgendaItem(agenda) {
  const starts = new Date(agenda.starts_at);
  const today = localDateKey(new Date());
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const dayLabel = localDateKey(starts) === today ? new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false}).format(starts) : localDateKey(starts) === localDateKey(tomorrowDate) ? "Besok" : new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short"}).format(starts);
  return `<button class="priority" data-edit-agenda="${escapeHtml(agenda.id)}"><span class="priority-icon ${agenda.priority === "high" ? "tone-purple" : "tone-blue"}">${icon("calendar-days")}</span><span><strong>${escapeHtml(agenda.title)}</strong><small>${escapeHtml(agenda.metadata?.location || agenda.metadata?.category || "Agenda sekolah")}</small></span><span class="priority-time">${escapeHtml(dayLabel)}${agenda.priority === "high" ? '<span class="badge badge-amber">Penting</span>' : ""}</span></button>`;
}

function renderCalendar() {
  const now = new Date();
  const todayKey = localDateKey(now);
  if (!state.selectedAgendaDate) state.selectedAgendaDate = todayKey;
  let selected = new Date(`${state.selectedAgendaDate}T12:00:00`);
  if (selected.getFullYear() !== state.calendarYear) {
    state.selectedAgendaDate = `${state.calendarYear}-${String(state.calendarMonth+1).padStart(2,"0")}-01`;
    selected = new Date(`${state.selectedAgendaDate}T12:00:00`);
  }
  state.calendarMonth = selected.getMonth();
  const yearAgendas = currentAgendas().filter((agenda) => new Date(agenda.starts_at).getFullYear() === state.calendarYear && agenda.status !== "cancelled");
  const monthAgendas = yearAgendas.filter((agenda) => new Date(agenda.starts_at).getMonth() === state.calendarMonth);
  const selectedAgendas = agendasForDate(state.selectedAgendaDate);
  const monthName = new Intl.DateTimeFormat("id-ID",{month:"long"}).format(new Date(state.calendarYear,state.calendarMonth,1));
  const monthCards = Array.from({length:12},(_,month) => {
    const count = yearAgendas.filter((agenda) => new Date(agenda.starts_at).getMonth() === month).length;
    const label = new Intl.DateTimeFormat("id-ID",{month:"short"}).format(new Date(state.calendarYear,month,1));
    return `<button class="year-month ${month === state.calendarMonth ? "active" : ""}" data-calendar-month="${month}"><span>${escapeHtml(label)}</span><strong>${count}</strong><small>agenda</small></button>`;
  }).join("");
  const firstDay = new Date(state.calendarYear,state.calendarMonth,1);
  const daysInMonth = new Date(state.calendarYear,state.calendarMonth+1,0).getDate();
  const leading = (firstDay.getDay()+6)%7;
  const dayCells = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map((day) => `<span class="weekday">${day}</span>`);
  for (let blank=0; blank<leading; blank++) dayCells.push('<span class="calendar-blank" aria-hidden="true"></span>');
  for (let day=1; day<=daysInMonth; day++) {
    const dateKey = `${state.calendarYear}-${String(state.calendarMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const count = monthAgendas.filter((agenda) => localDateKey(agenda.starts_at) === dateKey).length;
    dayCells.push(`<button class="calendar-day ${dateKey === todayKey ? "today" : ""} ${dateKey === state.selectedAgendaDate ? "selected" : ""} ${count ? "has-events" : ""}" data-calendar-date="${dateKey}" aria-label="${day} ${escapeHtml(monthName)}, ${count} agenda"><span>${day}</span>${count ? `<small>${count}</small>` : ""}</button>`);
  }
  const rundownRows = selectedAgendas.length ? selectedAgendas.map(agendaRundownCard).join("") : `<div class="agenda-empty"><span class="empty-icon">${icon("calendar-days")}</span><strong>Belum ada kegiatan</strong><small>Jadwal pada tanggal ini masih kosong.</small><button class="btn btn-primary" data-add-agenda data-date="${state.selectedAgendaDate}">${icon("plus")} Tambah kegiatan</button></div>`;
  const selectedLabel = new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(selected);
  document.title = `Agenda & Kalender — ${APP_NAME}`;
  const content = `<div class="page-intro calendar-intro"><div><h1>Agenda & Kalender Sekolah</h1><p>Susun kegiatan kepala sekolah sepanjang tahun dan lihat rundown setiap hari.</p></div><button class="btn btn-primary" data-add-agenda data-date="${state.selectedAgendaDate}">${icon("plus")} Tambah agenda</button></div>
    <section class="calendar-toolbar panel"><div class="year-switch"><button class="icon-btn" data-calendar-year="${state.calendarYear-1}" aria-label="Tahun sebelumnya">${icon("arrow-left")}</button><div><small>Tahun agenda</small><strong>${state.calendarYear}</strong></div><button class="icon-btn" data-calendar-year="${state.calendarYear+1}" aria-label="Tahun berikutnya">${icon("arrow-right")}</button></div><div class="calendar-summary"><span><strong>${yearAgendas.length}</strong><small>Agenda tahun ini</small></span><span><strong>${monthAgendas.length}</strong><small>Bulan terpilih</small></span><button class="btn btn-secondary" data-calendar-today>Ke hari ini</button></div></section>
    <section class="year-overview"><div class="section-heading-inline"><div><h2>Kalender ${state.calendarYear}</h2><p>Pilih bulan untuk melihat tanggal dan kegiatannya.</p></div></div><div class="year-month-grid">${monthCards}</div></section>
    <div class="calendar-workspace">
      <section class="panel month-panel"><div class="panel-head"><div><h2>${escapeHtml(monthName)} ${state.calendarYear}</h2><p>Pilih tanggal untuk membuka rundown</p></div><button class="panel-link" data-add-agenda data-date="${state.selectedAgendaDate}">${icon("plus")} Tambah</button></div><div class="month-calendar">${dayCells.join("")}</div><div class="calendar-legend"><span><i></i>Hari ini</span><span><i></i>Ada agenda</span></div></section>
      <aside class="panel rundown-panel"><div class="panel-head"><div><h2>Rundown harian</h2><p>${escapeHtml(selectedLabel)}</p></div><span class="badge badge-purple">${selectedAgendas.length} kegiatan</span></div><div class="rundown-list">${rundownRows}</div></aside>
    </div>`;
  app.innerHTML = appShell(content,"calendar","Agenda & Kalender");
}

function agendaRundownCard(agenda) {
  const start = new Date(agenda.starts_at);
  const end = agenda.ends_at ? new Date(agenda.ends_at) : null;
  const time = new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false}).format(start);
  const endTime = end ? new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false}).format(end) : "Selesai";
  const metadata = agenda.metadata || {};
  const rundown = String(metadata.rundown || agenda.description || "Belum ada rincian rundown.").split(/\n+/).filter(Boolean);
  return `<article class="rundown-card ${agenda.priority === "high" ? "important" : ""}"><div class="rundown-time"><strong>${escapeHtml(time)}</strong><small>${escapeHtml(endTime)}</small></div><div class="rundown-body"><div class="rundown-title"><div><span class="agenda-category">${escapeHtml(metadata.category || "Kegiatan")}</span><h3>${escapeHtml(agenda.title)}</h3></div><button class="edit-agenda" data-edit-agenda="${escapeHtml(agenda.id)}">Edit</button></div>${metadata.location ? `<p class="agenda-location">${escapeHtml(metadata.location)}</p>` : ""}${metadata.assignedTo ? `<p class="agenda-assignee">${icon("user-check")} Penanggung jawab: ${escapeHtml(metadata.assignedTo)}</p>` : ""}<ol>${rundown.slice(0,5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></div></article>`;
}

function openAgendaDialog(agendaId = "", requestedDate = "") {
  const agenda = currentAgendas().find((item) => item.id === agendaId);
  const start = agenda ? new Date(agenda.starts_at) : new Date(`${requestedDate || state.selectedAgendaDate || localDateKey(new Date())}T08:00:00`);
  const end = agenda?.ends_at ? new Date(agenda.ends_at) : new Date(start.getTime()+60*60*1000);
  const metadata = agenda?.metadata || {};
  const timeValue = (date) => `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
  const assigneeOptions = [`<option value="">Belum ditentukan</option>`,...teamAccessRows().map((member) => { const name = member.display_name || member.email; return `<option value="${escapeHtml(name)}" ${metadata.assignedTo === name ? "selected" : ""}>${escapeHtml(name)}</option>`; })].join("");
  const modal = `<div class="dialog-backdrop" id="agenda-dialog"><section class="dialog agenda-dialog" role="dialog" aria-modal="true" aria-labelledby="agenda-dialog-title"><div class="dialog-head"><div><h2 id="agenda-dialog-title">${agenda ? "Edit agenda" : "Tambah agenda"}</h2><p>${agenda ? "Perbarui jadwal dan rundown kegiatan." : "Isi yang penting dulu; detail lain boleh menyusul."}</p></div><button class="btn btn-ghost compact-button" type="button" data-dialog-close>Batal</button></div><form id="agenda-form" data-agenda-id="${escapeHtml(agenda?.id || "")}"><div class="field-grid agenda-form-grid"><div class="form-group field-span"><label for="agenda-title">Nama kegiatan</label><input class="form-control" id="agenda-title" name="title" value="${escapeHtml(agenda?.title || "")}" placeholder="Contoh: Rapat evaluasi program" minlength="3" required></div><div class="form-group"><label for="agenda-date">Tanggal</label><input class="form-control" id="agenda-date" name="date" type="date" value="${localDateKey(start)}" required></div><div class="form-group"><label for="agenda-category">Jenis kegiatan</label><select class="form-control" id="agenda-category" name="category">${["Rapat","Supervisi","Kurikulum","Perencanaan","Kinerja","Kegiatan","Lainnya"].map((item) => `<option ${metadata.category === item ? "selected" : ""}>${item}</option>`).join("")}</select></div><div class="form-group"><label for="agenda-start">Mulai</label><input class="form-control" id="agenda-start" name="startTime" type="time" value="${timeValue(start)}" required></div><div class="form-group"><label for="agenda-end">Selesai</label><input class="form-control" id="agenda-end" name="endTime" type="time" value="${timeValue(end)}"></div><div class="form-group field-span"><label for="agenda-location">Tempat <small>(opsional)</small></label><input class="form-control" id="agenda-location" name="location" value="${escapeHtml(metadata.location || "")}" placeholder="Contoh: Ruang rapat"></div><div class="form-group field-span"><label for="agenda-description">Catatan singkat <small>(opsional)</small></label><textarea class="form-control" id="agenda-description" name="description" placeholder="Tujuan atau hal penting yang perlu diingat">${escapeHtml(agenda?.description || "")}</textarea></div><div class="form-group field-span"><label for="agenda-rundown">Rundown detail <small>(satu baris untuk setiap urutan)</small></label><textarea class="form-control rundown-input" id="agenda-rundown" name="rundown" placeholder="08.00 Pembukaan\n08.15 Pembahasan utama\n09.00 Tindak lanjut">${escapeHtml(metadata.rundown || "")}</textarea></div><div class="form-group"><label for="agenda-assignee">Penanggung jawab <small>(opsional)</small></label><select class="form-control" id="agenda-assignee" name="assignedTo">${assigneeOptions}</select></div><div class="form-group"><label for="agenda-priority">Prioritas</label><select class="form-control" id="agenda-priority" name="priority"><option value="normal" ${agenda?.priority !== "high" ? "selected" : ""}>Biasa</option><option value="high" ${agenda?.priority === "high" ? "selected" : ""}>Penting</option><option value="low" ${agenda?.priority === "low" ? "selected" : ""}>Rendah</option></select></div><div class="form-group"><label for="agenda-status">Status</label><select class="form-control" id="agenda-status" name="status"><option value="scheduled" ${agenda?.status !== "completed" ? "selected" : ""}>Terjadwal</option><option value="completed" ${agenda?.status === "completed" ? "selected" : ""}>Selesai</option><option value="cancelled" ${agenda?.status === "cancelled" ? "selected" : ""}>Dibatalkan</option></select></div></div><div id="agenda-error" class="form-error" role="alert" hidden></div><div class="dialog-actions">${agenda ? '<button class="btn btn-danger" type="button" data-delete-agenda>Hapus</button>' : '<span></span>'}<button class="btn btn-primary" type="submit">${icon("save")} Simpan agenda</button></div></form></section></div>`;
  app.insertAdjacentHTML("beforeend",modal);
  document.body.classList.add("dialog-open");
  bindAgendaDialog();
  app.querySelector("#agenda-title")?.focus();
}

function closeAgendaDialog() {
  app.querySelector("#agenda-dialog")?.remove();
  document.body.classList.remove("dialog-open");
}

function bindAgendaDialog() {
  const dialog = app.querySelector("#agenda-dialog");
  dialog?.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click",closeAgendaDialog));
  dialog?.addEventListener("click",(event) => { if (event.target === dialog) closeAgendaDialog(); });
  dialog?.querySelector("#agenda-form")?.addEventListener("submit",handleAgendaSubmit);
  dialog?.querySelector("[data-delete-agenda]")?.addEventListener("click",deleteAgenda);
}

async function handleAgendaSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorBox = form.querySelector("#agenda-error");
  const submit = form.querySelector("button[type=submit]");
  const values = Object.fromEntries(new FormData(form));
  errorBox.hidden = true; submit.disabled = true;
  try {
    if (!form.reportValidity()) throw new Error("Lengkapi nama, tanggal, dan waktu mulai.");
    const startsAt = new Date(`${values.date}T${values.startTime}:00`);
    const endsAt = values.endTime ? new Date(`${values.date}T${values.endTime}:00`) : null;
    if (endsAt && endsAt < startsAt) throw new Error("Waktu selesai tidak boleh lebih awal dari waktu mulai.");
    const existing = currentAgendas().find((item) => item.id === form.dataset.agendaId);
    const payload = { title:values.title.trim(), description:values.description?.trim() || null, starts_at:startsAt.toISOString(), ends_at:endsAt?.toISOString() || null, status:values.status, priority:values.priority, metadata:{ ...(existing?.metadata || {}), category:values.category, location:values.location?.trim() || "", rundown:values.rundown?.trim() || "", assignedTo:values.assignedTo || "" } };
    let saved;
    if (state.demo || !state.supabase) {
      saved = existing ? { ...existing,...payload,updated_at:new Date().toISOString() } : { id:crypto.randomUUID(),school_id:state.school?.id,created_by:state.user?.id,...payload,created_at:new Date().toISOString(),updated_at:new Date().toISOString() };
    } else if (existing) {
      const { data,error } = await state.supabase.from("kepsek_agendas").update(payload).eq("id",existing.id).eq("school_id",state.school.id).select().single();
      if (error) throw error; saved = data;
    } else {
      const { data,error } = await state.supabase.from("kepsek_agendas").insert({ school_id:state.school.id,created_by:state.user.id,...payload }).select().single();
      if (error) throw error; saved = data;
    }
    state.agendas = existing ? state.agendas.map((item) => item.id === existing.id ? saved : item) : [...state.agendas,saved];
    state.selectedAgendaDate = values.date;
    state.calendarYear = startsAt.getFullYear(); state.calendarMonth = startsAt.getMonth();
    closeAgendaDialog(); toast(existing ? "Agenda berhasil diperbarui" : "Agenda berhasil ditambahkan");
    currentRoute() === "calendar" ? renderCalendar() : renderDashboard(); bindPageEvents();
  } catch (cause) { errorBox.textContent = humanError(cause); errorBox.hidden = false; submit.disabled = false; }
}

async function deleteAgenda() {
  const form = app.querySelector("#agenda-form");
  const agenda = currentAgendas().find((item) => item.id === form?.dataset.agendaId);
  if (!agenda || !window.confirm(`Hapus agenda “${agenda.title}”? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_agendas").delete().eq("id",agenda.id).eq("school_id",state.school.id);
      if (error) throw error;
    }
    state.agendas = state.agendas.filter((item) => item.id !== agenda.id);
    closeAgendaDialog(); toast("Agenda berhasil dihapus"); renderCalendar(); bindPageEvents();
  } catch (cause) { toast(humanError(cause),"error"); }
}

async function loadAgendasForYear(year) {
  if (state.demo || !state.supabase || !state.school) return;
  const start = new Date(year,0,1).toISOString();
  const end = new Date(year+1,0,1).toISOString();
  const { data,error } = await state.supabase.from("kepsek_agendas").select("*").eq("school_id",state.school.id).gte("starts_at",start).lt("starts_at",end).order("starts_at",{ascending:true});
  if (error) throw error;
  state.agendas = data || [];
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
  const templateOptions = sources.filter((source) => source.status === "ready" || source.extracted_text).map((source) => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.name)}</option>`).join("");
  document.title = `Profil & Memori Sekolah — ${APP_NAME}`;
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

function isWorkspaceOwner() {
  return Boolean(state.membership?.isOwner || (state.school?.owner_user_id && state.school.owner_user_id === state.user?.id) || state.demo);
}

function teamAccessRows() {
  const school = state.school || demoSchool;
  const owner = {
    id: "workspace-owner",
    user_id: school.owner_user_id || state.user?.id || "demo-owner",
    display_name: school.principal_name || "Kepala Sekolah",
    email: isWorkspaceOwner() ? state.user?.email || "kepala.sekolah@sekolah.sch.id" : "Pengelola awal workspace",
    owner: true,
  };
  return [owner, ...(state.teamMembers || [])];
}

function renderTeam() {
  const members = teamAccessRows();
  const owner = isWorkspaceOwner();
  const invites = state.workspaceInvites || [];
  document.title = `Tim Sekolah — ${APP_NAME}`;
  const memberRows = members.map((member) => `<article class="access-row">
    <span class="access-avatar">${escapeHtml(initials(member.display_name || member.email))}</span>
    <span class="access-person"><strong>${escapeHtml(member.display_name || "Anggota sekolah")}</strong><small>${escapeHtml(member.email || "Email anggota")}</small></span>
    <span class="badge ${member.owner ? "badge-purple" : "badge-green"}">${member.owner ? "Pengelola akses" : "Akses penuh"}</span>
    ${owner && !member.owner ? `<button type="button" class="icon-btn danger-icon" data-remove-member="${escapeHtml(member.user_id)}" aria-label="Hapus akses ${escapeHtml(member.display_name || member.email)}" title="Hapus akses">${icon("trash")}</button>` : ""}
  </article>`).join("");
  const inviteRows = invites.filter((invite) => !invite.accepted_at && new Date(invite.expires_at) > new Date()).map((invite) => `<article class="invite-row">
    <span class="invite-icon">${icon("mail")}</span><span><strong>${escapeHtml(invite.email)}</strong><small>Berlaku sampai ${formatDate(invite.expires_at)}</small></span>
    ${invite.invite_url ? `<button type="button" class="btn btn-secondary compact-button" data-copy-invite="${escapeHtml(invite.invite_url)}">${icon("copy")} Salin tautan</button>` : `<span class="invite-link-note" title="Demi keamanan, tautan mentah hanya disimpan pada perangkat yang membuatnya.">Tautan tidak tersimpan di perangkat ini</span>`}
    <button type="button" class="icon-btn danger-icon" data-cancel-invite="${escapeHtml(invite.id)}" aria-label="Batalkan undangan">${icon("trash")}</button>
  </article>`).join("");
  const content = `<div class="page-intro"><div><span class="page-kicker">Satu sekolah, satu ruang kerja</span><h1>Tim Sekolah</h1><p>Bagikan pekerjaan kepada operator, wakasek, atau tim supervisi tanpa membagikan kata sandi kepala sekolah.</p></div>${owner ? `<button class="btn btn-primary" type="button" data-open-invite>${icon("user-plus")} Tambah anggota</button>` : ""}</div>
    <section class="access-explainer">
      <span class="access-explainer-icon">${icon("shield-check")}</span><div><strong>Akses kerja sama, akun tetap berbeda</strong><p>Semua anggota dapat memakai fitur dan data sekolah yang sama. Setiap orang masuk dengan emailnya sendiri, sehingga akses dapat dihentikan tanpa mengganti kata sandi seluruh tim.</p></div>
    </section>
    <div class="team-layout"><section class="panel"><div class="panel-head"><div><h2>Orang yang dapat masuk</h2><p>${members.length} akun terhubung ke workspace ini</p></div></div><div class="access-list">${memberRows}</div></section>
    <aside class="team-aside"><section class="panel"><div class="panel-head"><div><h2>Pembagian kerja sederhana</h2><p>Semua anggota memiliki akses kerja yang sama</p></div></div><div class="delegation-list"><span><b>1</b><span><strong>Undang orang yang dipercaya</strong><small>Gunakan email mereka sendiri.</small></span></span><span><b>2</b><span><strong>Bagi tugas lewat agenda</strong><small>Pilih penanggung jawab pada agenda kegiatan.</small></span></span><span><b>3</b><span><strong>Tinjau hasil bersama</strong><small>Dokumen dan memori sekolah tetap satu.</small></span></span></div></section>
    ${owner ? `<section class="panel"><div class="panel-head"><div><h2>Undangan aktif</h2><p>Bagikan lewat WhatsApp atau email</p></div></div>${inviteRows ? `<div class="invite-list">${inviteRows}</div>` : `<div class="small-empty">${icon("mail")}<span><strong>Belum ada undangan</strong><small>Buat tautan untuk anggota yang akan membantu.</small></span></div>`}</section>` : ""}</aside></div>`;
  app.innerHTML = appShell(content, "team", "Tim Sekolah");
}

function openInviteDialog() {
  const modal = `<div class="dialog-backdrop" id="invite-dialog"><section class="dialog small-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title"><div class="dialog-head"><div><h2 id="invite-dialog-title">Tambahkan anggota sekolah</h2><p>Anggota memakai email sendiri dan mendapat akses kerja penuh.</p></div><button class="btn btn-ghost compact-button" type="button" data-dialog-close>Batal</button></div><form id="invite-form"><div class="form-group"><label for="invite-name">Nama anggota</label><input class="form-control" id="invite-name" name="displayName" placeholder="Contoh: Siti Rahmawati" minlength="2" required></div><div class="form-group"><label for="invite-email">Email anggota</label><input class="form-control" id="invite-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="anggota@sekolah.sch.id" required></div><div class="safe-note">${icon("circle-alert")} Jangan masukkan kata sandi kepala sekolah. Sistem akan membuat tautan masuk khusus untuk email ini.</div><div id="invite-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><span></span><button class="btn btn-primary" type="submit">${icon("link")} Buat tautan undangan</button></div></form></section></div>`;
  document.body.insertAdjacentHTML("beforeend",modal);
  const dialog = document.querySelector("#invite-dialog");
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click",() => dialog.remove()));
  dialog.addEventListener("click",(event) => { if (event.target === dialog) dialog.remove(); });
  dialog.querySelector("#invite-form").addEventListener("submit",handleInviteCreate);
  dialog.querySelector("#invite-name")?.focus();
}

async function handleInviteCreate(event) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button[type=submit]");
  const errorBox = event.currentTarget.querySelector("#invite-error");
  const values = Object.fromEntries(new FormData(event.currentTarget));
  submit.disabled = true; errorBox.hidden = true;
  try {
    const email = String(values.email || "").trim().toLowerCase();
    if (email === String(state.user?.email || "").toLowerCase()) throw new Error("Email ini sudah menjadi pengelola workspace.");
    const token = secureToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const inviteUrl = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;
    let invite = { id:crypto.randomUUID(), school_id:state.school.id, email, display_name:String(values.displayName || "").trim(), token_hash:tokenHash, expires_at:expiresAt, invited_by:state.user.id, invite_url:inviteUrl };
    if (!state.demo && state.supabase) {
      const { data,error } = await state.supabase.from("kepsek_workspace_invites").insert({ school_id:state.school.id, email:invite.email, display_name:invite.display_name, token_hash:invite.token_hash, expires_at:invite.expires_at, invited_by:state.user.id }).select().single();
      if (error) throw error;
      invite = { ...data, invite_url:inviteUrl };
    }
    try { localStorage.setItem(`bb-invite-${invite.id}`,inviteUrl); } catch { /* Private browsing may block storage. */ }
    state.workspaceInvites.unshift(invite);
    document.querySelector("#invite-dialog")?.remove();
    renderTeam(); bindPageEvents();
    try {
      await copyText(inviteUrl);
      toast("Tautan undangan dibuat dan disalin");
    } catch {
      toast("Undangan berhasil dibuat. Gunakan tombol Salin tautan.","error");
    }
  } catch (cause) {
    errorBox.textContent = humanError(cause); errorBox.hidden = false;
  } finally { submit.disabled = false; }
}

async function removeTeamMember(userId) {
  const member = state.teamMembers.find((item) => item.user_id === userId);
  if (!member || !window.confirm(`Hentikan akses ${member.display_name || member.email}?`)) return;
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_workspace_members").delete().eq("school_id",state.school.id).eq("user_id",userId);
      if (error) throw error;
    }
    state.teamMembers = state.teamMembers.filter((item) => item.user_id !== userId);
    renderTeam(); bindPageEvents(); toast("Akses anggota dihentikan");
  } catch (cause) { toast(humanError(cause),"error"); }
}

async function cancelWorkspaceInvite(id) {
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_workspace_invites").delete().eq("id",id).eq("school_id",state.school.id);
      if (error) throw error;
    }
    localStorage.removeItem(`bb-invite-${id}`);
    state.workspaceInvites = state.workspaceInvites.filter((item) => item.id !== id);
    renderTeam(); bindPageEvents(); toast("Undangan dibatalkan");
  } catch (cause) { toast(humanError(cause),"error"); }
}

function secureToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2,"0")).join("");
}

async function copyText(value) {
  if (!value) throw new Error("Tautan undangan tidak tersedia. Buat undangan baru.");
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly","");
  input.style.position = "fixed";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  document.body.append(input);
  input.select();
  if (!document.execCommand("copy")) throw new Error("Tautan belum dapat disalin. Salin langsung dari bilah alamat.");
  input.remove();
}

function renderTemplates() {
  const ownFolders = state.templateFolders || [];
  document.title = `Pustaka Format — ${APP_NAME}`;
  const libraryCards = driveLibrary.map((folder) => driveFolderCard(folder,true)).join("");
  const ownCards = ownFolders.map((folder) => driveFolderCard({ ...folder, url:folder.drive_url, icon:"folder", count:null },false)).join("");
  const content = `<div class="page-intro"><div><span class="page-kicker">Tautan asli Google Drive</span><h1>Pustaka Format</h1><p>Gunakan format yang sudah tersedia langsung dari sumbernya. File tidak disalin atau dibuat ulang oleh aplikasi.</p></div><button class="btn btn-primary" type="button" data-open-folder>${icon("plus")} Tambah folder Drive</button></div>
    <section class="library-notice">${icon("external-link")}<span><strong>Semua kartu membuka folder asli</strong><small>Hak akses file tetap mengikuti pengaturan Google Drive pemilik folder.</small></span><a href="https://drive.google.com/drive/folders/1EEoLPNgaLdnPdzJLvgxx_TVgvV7_E3DO" target="_blank" rel="noopener noreferrer">Buka folder utama ${icon("arrow-up-right")}</a></section>
    <div class="library-toolbar"><label class="library-search">${icon("search")}<input id="library-search" placeholder="Cari SOP, supervisi, RKJM…" aria-label="Cari pustaka format"></label><span>${driveLibrary.length + ownFolders.length} folder tersedia</span></div>
    <section class="library-section"><div class="section-inline-head"><div><h2>Pustaka Bantu Beres</h2><p>Referensi dari folder Drive yang Anda berikan.</p></div></div><div class="drive-grid" id="drive-library-grid">${libraryCards}</div></section>
    <section class="library-section"><div class="section-inline-head"><div><h2>Folder sekolah saya</h2><p>Simpan tautan template internal tanpa memindahkan filenya.</p></div></div>${ownCards ? `<div class="drive-grid" id="own-library-grid">${ownCards}</div>` : `<div class="panel empty-library">${icon("folder")}<div><h3>Belum ada folder sekolah</h3><p>Tambahkan tautan Google Drive agar seluruh tim membuka format yang sama.</p></div><button class="btn btn-secondary" data-open-folder>Tambah folder</button></div>`}</section>`;
  app.innerHTML = appShell(content,"templates","Pustaka Format");
}

function driveFolderCard(folder, builtIn) {
  return `<article class="drive-card" data-library-search="${escapeHtml(`${folder.name} ${folder.description || ""} ${folder.category || ""}`.toLowerCase())}"><span class="drive-icon">${icon(folder.icon || "folder")}</span><span class="drive-card-copy"><small>${builtIn ? "Pustaka utama" : escapeHtml(folder.category || "Folder sekolah")}</small><h3>${escapeHtml(folder.name)}</h3><p>${escapeHtml(folder.description || "Folder format sekolah di Google Drive.")}</p></span><div class="drive-card-foot">${folder.count == null ? `<span>Google Drive</span>` : `<span>${folder.count} file</span>`}<a href="${escapeHtml(folder.url)}" target="_blank" rel="noopener noreferrer">Buka folder ${icon("external-link")}</a>${builtIn ? "" : `<button class="icon-btn danger-icon" type="button" data-remove-folder="${escapeHtml(folder.id)}" aria-label="Hapus tautan folder">${icon("trash")}</button>`}</div></article>`;
}

function openFolderDialog() {
  const modal = `<div class="dialog-backdrop" id="folder-dialog"><section class="dialog small-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title"><div class="dialog-head"><div><h2 id="folder-dialog-title">Tambah folder Google Drive</h2><p>Aplikasi hanya menyimpan tautannya; file tetap di Drive.</p></div><button class="btn btn-ghost compact-button" type="button" data-dialog-close>Batal</button></div><form id="folder-form"><div class="form-group"><label for="folder-name">Nama folder</label><input class="form-control" id="folder-name" name="name" placeholder="Contoh: Format Supervisi Internal" minlength="3" required></div><div class="form-group"><label for="folder-category">Kategori</label><input class="form-control" id="folder-category" name="category" placeholder="Contoh: Supervisi"></div><div class="form-group"><label for="folder-url">Tautan Google Drive</label><input class="form-control" id="folder-url" name="driveUrl" type="url" inputmode="url" placeholder="https://drive.google.com/drive/folders/…" required></div><div class="form-group"><label for="folder-description">Keterangan <small>(opsional)</small></label><textarea class="form-control" id="folder-description" name="description" placeholder="Isi atau kegunaan folder"></textarea></div><div id="folder-error" class="form-error" role="alert" hidden></div><div class="dialog-actions"><span></span><button class="btn btn-primary" type="submit">${icon("save")} Simpan tautan</button></div></form></section></div>`;
  document.body.insertAdjacentHTML("beforeend",modal);
  const dialog = document.querySelector("#folder-dialog");
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click",() => dialog.remove()));
  dialog.addEventListener("click",(event) => { if (event.target === dialog) dialog.remove(); });
  dialog.querySelector("#folder-form").addEventListener("submit",handleFolderCreate);
  dialog.querySelector("#folder-name")?.focus();
}

async function handleFolderCreate(event) {
  event.preventDefault();
  const submit = event.currentTarget.querySelector("button[type=submit]");
  const errorBox = event.currentTarget.querySelector("#folder-error");
  const values = Object.fromEntries(new FormData(event.currentTarget));
  submit.disabled = true; errorBox.hidden = true;
  try {
    const driveUrl = String(values.driveUrl || "").trim();
    const parsed = new URL(driveUrl);
    if (!/(^|\.)drive\.google\.com$/.test(parsed.hostname) && !/(^|\.)docs\.google\.com$/.test(parsed.hostname)) throw new Error("Masukkan tautan folder Google Drive yang benar.");
    let folder = { id:crypto.randomUUID(), school_id:state.school.id, name:String(values.name).trim(), category:String(values.category || "Folder sekolah").trim() || "Folder sekolah", description:String(values.description || "").trim(), drive_url:driveUrl, created_by:state.user.id };
    if (!state.demo && state.supabase) {
      const { data,error } = await state.supabase.from("kepsek_template_folders").insert({ school_id:state.school.id, name:folder.name, category:folder.category, description:folder.description, drive_url:folder.drive_url, created_by:state.user.id }).select().single();
      if (error) throw error;
      folder = data;
    }
    state.templateFolders.unshift(folder);
    document.querySelector("#folder-dialog")?.remove();
    renderTemplates(); bindPageEvents(); toast("Folder Drive berhasil ditambahkan");
  } catch (cause) { errorBox.textContent = humanError(cause); errorBox.hidden = false; }
  finally { submit.disabled = false; }
}

async function removeTemplateFolder(id) {
  if (!window.confirm("Hapus tautan folder dari pustaka? File di Google Drive tidak akan terhapus.")) return;
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_template_folders").delete().eq("id",id).eq("school_id",state.school.id);
      if (error) throw error;
    }
    state.templateFolders = state.templateFolders.filter((folder) => folder.id !== id);
    renderTemplates(); bindPageEvents(); toast("Tautan folder dihapus");
  } catch (cause) { toast(humanError(cause),"error"); }
}

function renderGuide() {
  document.title = `Panduan Kerja — ${APP_NAME}`;
  const steps = [
    ["1","Siapkan profil sekolah","Isi identitas, visi, misi, jumlah warga sekolah, dan prioritas utama.","/profile","Buka Profil & Memori"],
    ["2","Hubungkan tim tepercaya","Undang operator, wakasek, atau tim supervisi memakai email mereka sendiri.","/team","Atur Tim Sekolah"],
    ["3","Simpan sumber dan format","Unggah data sekolah ke Memori dan tautkan folder format asli di Google Drive.","/templates","Buka Pustaka Format"],
    ["4","Susun agenda kerja","Masukkan kegiatan setahun, rundown harian, tempat, lalu pilih penanggung jawab.","/calendar","Atur Agenda"],
    ["5","Buat dan tinjau dokumen","Pilih jenis dokumen, jelaskan kebutuhan, lalu periksa asumsi dan bagian yang kosong.","/ai","Mulai menyusun"],
    ["6","Setujui dan ekspor","Edit hasil bersama tim, ubah status menjadi disetujui, lalu unduh Word, Excel, atau PDF.","/documents","Buka Pusat Dokumen"],
  ];
  const content = `<div class="guide-hero"><div><span class="page-kicker">Panduan satu halaman</span><h1>Dari persiapan sampai dokumen selesai</h1><p>Ikuti urutan ini saat pertama kali menggunakan aplikasi. Setelah itu, pekerjaan harian cukup dimulai dari Beranda atau Agenda.</p></div><span class="guide-hero-icon">${icon("map")}</span></div>
    <section class="guide-safety"><div>${icon("shield-check")}<span><strong>Aturan paling penting</strong><small>Jangan pernah membagikan kata sandi kepala sekolah. Undang anggota dari menu Tim Sekolah agar akses tetap aman dan dapat dihentikan kapan saja.</small></span></div><button class="btn btn-secondary" data-route-to="/team">Atur akses tim</button></section>
    <section class="guide-flow">${steps.map(([number,title,text,path,action]) => `<article class="guide-step"><span>${number}</span><div><h2>${title}</h2><p>${text}</p><button class="guide-link" data-route-to="${path}">${action} ${icon("arrow-right")}</button></div></article>`).join("")}</section>
    <section class="panel guide-routine"><div class="panel-head"><div><h2>Pola kerja mingguan yang ringan</h2><p>Agar kepala sekolah tidak mengerjakan semuanya sendiri</p></div></div><div class="routine-grid"><div><strong>Senin</strong><small>Tetapkan agenda dan penanggung jawab.</small></div><div><strong>Selasa–Kamis</strong><small>Tim mengisi data, dokumen, dan bukti kegiatan.</small></div><div><strong>Jumat</strong><small>Kepala sekolah meninjau hasil dan tindak lanjut.</small></div><div><strong>Akhir bulan</strong><small>Ekspor dokumen penting dan rapikan pustaka.</small></div></div></section>
    <section class="guide-help"><span>${icon("circle-help")}</span><div><h2>Kalau bingung, mulai dari Asisten</h2><p>Tanyakan pekerjaan apa yang perlu diprioritaskan berdasarkan Memori Sekolah dan agenda yang tersimpan.</p></div><button class="btn btn-primary" data-route-to="/assistant">Buka Asisten AI</button></section>`;
  app.innerHTML = appShell(content,"guide","Panduan Kerja");
}

function renderMore() {
  const items = [
    ["sparkles","Fitur AI","KSP, PBD, RKJM, RKT, RKAS, kegiatan, SOP, dan kinerja.","/ai"],
    ["database","Profil & Memori","Data utama dan dokumen sumber sekolah.","/profile"],
    ["users","Tim Sekolah","Akses penuh untuk orang yang membantu.","/team"],
    ["folder","Pustaka Format","Folder template asli di Google Drive.","/templates"],
    ["circle-help","Panduan Kerja","Petunjuk lengkap dalam satu halaman.","/guide"],
  ];
  document.title = `Menu — ${APP_NAME}`;
  const content = `<div class="page-intro compact-intro"><div><h1>Semua Menu</h1><p>Pilih pekerjaan yang ingin dibuka.</p></div></div><div class="more-grid">${items.map(([iconName,title,text,path]) => `<button class="more-card" data-route-to="${path}"><span>${icon(iconName)}</span><div><strong>${title}</strong><small>${text}</small></div>${icon("arrow-right")}</button>`).join("")}</div>`;
  app.innerHTML = appShell(content,"more","Semua Menu");
}

function renderJoin() {
  const token = new URLSearchParams(window.location.search).get("token") || state.pendingInviteToken;
  state.pendingInviteToken = token || "";
  document.title = `Gabung Workspace — ${APP_NAME}`;
  const target = `/auth?invite=${encodeURIComponent(token || "")}`;
  const signedInError = state.user && state.inviteError ? `<div class="form-error invite-claim-error">${escapeHtml(state.inviteError)}</div><button class="btn btn-primary btn-block" type="button" data-invite-logout>Keluar dan gunakan email penerima</button>` : "";
  app.innerHTML = `${ambient()}<main id="main-content" class="join-page"><section class="join-card">${brand()}<span class="join-icon">${icon(token ? "users" : "circle-alert")}</span><h1>${token ? "Anda diundang membantu sekolah" : "Tautan undangan tidak lengkap"}</h1><p>${token ? "Masuk atau buat akun dengan email yang menerima undangan. Setelah itu Anda akan memakai workspace sekolah yang sama dengan akses kerja penuh." : "Minta pengelola workspace membuat dan mengirim ulang tautan dari menu Tim Sekolah."}</p>${signedInError || (token ? `<div class="join-promise">${icon("shield-check")} Kata sandi Anda tetap pribadi dan tidak dibagikan kepada anggota lain.</div><div class="join-actions"><button class="btn btn-primary" data-route-to="${target}&mode=login">Masuk dan bergabung</button><button class="btn btn-secondary" data-route-to="${target}&mode=signup">Buat akun baru</button></div>` : `<button class="btn btn-secondary" data-route-to="/auth">Ke halaman masuk</button>`)}</section></main>`;
}

function renderDocuments() {
  const docs = state.documents.length ? state.documents : demoDocuments;
  document.title = `Pusat Dokumen — ${APP_NAME}`;
  const cards = docs.map((doc) => `<article class="document-card" data-document-id="${escapeHtml(doc.id)}" tabindex="0" role="button"><div class="document-card-top"><span class="document-icon">${icon(documentIcon(doc.type))}</span><span class="badge ${statusClass(doc.status)}">${statusLabel(doc.status)}</span></div><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(aiTypes[doc.type]?.label || "Dokumen sekolah")}</p><div class="document-meta"><span>Versi ${doc.version || 1}</span><span>${formatDate(doc.updated_at || new Date())}</span></div></article>`).join("");
  const content = `<div class="page-intro"><div><h1>Pusat Dokumen</h1><p>Semua draft, dokumen yang sedang ditinjau, dan arsip sekolah tersimpan dengan riwayat versinya.</p></div><button class="btn btn-primary" data-new-document>${icon("plus")} Buat dokumen</button></div>
    <div class="stats-grid"><div class="stat"><span class="stat-icon">${icon("files")}</span><div><small>Semua dokumen</small><strong>${docs.length}</strong></div></div><div class="stat"><span class="stat-icon">${icon("file-clock")}</span><div><small>Perlu ditinjau</small><strong>${docs.filter((doc) => doc.status === "review").length}</strong></div></div><div class="stat"><span class="stat-icon">${icon("file-check-2")}</span><div><small>Sudah disetujui</small><strong>${docs.filter((doc) => doc.status === "approved").length}</strong></div></div></div>
    ${cards ? `<div class="document-grid">${cards}</div>` : `<div class="panel empty-state"><span class="empty-icon">${icon("files")}</span><h3>Belum ada dokumen</h3><p>Buat dokumen pertama dengan bantuan Asisten AI.</p><button class="btn btn-primary" data-new-document>Mulai membuat</button></div>`}`;
  app.innerHTML = appShell(content, "documents", "Pusat Dokumen");
}

function documentIcon(type) {
  return ({ ksp: "book-open-check", pbd: "chart-no-axes-combined", rkt: "route", rkjm: "map", rkas: "wallet-cards", activity: "folder-kanban", sop: "list-checks", performance: "briefcase-business" })[type] || "file-text";
}

function statusClass(status) {
  return ({ approved: "badge-green", review: "badge-amber", draft: "badge-neutral" })[status] || "badge-neutral";
}

function statusLabel(status) {
  return ({ approved: "Disetujui", review: "Siap ditinjau", draft: "Dalam penyusunan" })[status] || "Dalam penyusunan";
}

function renderAssistantText(value = "") {
  return renderAiText(value);
}

function assistantMessage(message) {
  const role = message.role === "assistant" ? "assistant" : "user";
  const label = role === "assistant" ? "Asisten AI" : "Anda";
  return `<article class="assistant-message ${role} ${message.failed ? "failed" : ""}">
    <span class="assistant-avatar">${role === "assistant" ? icon("brain-circuit") : escapeHtml(initials((state.school || demoSchool).principal_name))}</span>
    <div class="assistant-bubble"><div class="assistant-message-meta"><strong>${label}</strong><small>${message.created_at ? new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit"}).format(new Date(message.created_at)) : "sekarang"}</small></div><div class="assistant-message-text">${renderAssistantText(message.content)}</div>${message.failed ? `<button class="assistant-retry" data-retry-assistant="${escapeHtml(message.id)}">${icon("history")} Coba kirim lagi</button>` : ""}</div>
  </article>`;
}

function renderAssistant() {
  const school = state.school || demoSchool;
  const aiEnabled = Boolean(state.config?.aiConfigured);
  const messages = state.assistantMessages || [];
  const memoryCount = 1 + state.sources.length;
  document.title = `Asisten AI — ${APP_NAME}`;
  const empty = `<div class="assistant-empty">
    <span class="assistant-hero-icon">${icon("brain-circuit")}</span>
    <div><span class="assistant-kicker">Asisten pribadi kepala sekolah</span><h1>Apa yang ingin dibahas hari ini?</h1><p>Saya dapat diajak berpikir, menyiapkan keputusan, membahas pekerjaan sekolah, atau sekadar menjadi teman berdiskusi.</p></div>
    <div class="assistant-suggestions">${assistantSuggestions.map((suggestion) => `<button type="button" data-assistant-prompt="${escapeHtml(suggestion)}">${icon("sparkles")}<span>${escapeHtml(suggestion)}</span></button>`).join("")}</div>
  </div>`;
  const content = `<section class="assistant-shell">
    <header class="assistant-head"><div><div class="eyebrow"><span class="eyebrow-dot"></span>Terhubung ke Memori Sekolah</div><h1>Asisten AI</h1><p>Jawaban disesuaikan dengan ${escapeHtml(school.name)}.</p></div>${messages.length ? `<button class="btn btn-secondary assistant-clear" type="button" data-clear-assistant>${icon("history")} Percakapan baru</button>` : ""}</header>
    <div class="assistant-memory"><span class="assistant-memory-icon">${icon("shield-check")}</span><span><strong>${memoryCount} sumber memori siap digunakan</strong><small>Profil dan dokumen sekolah hanya digunakan di workspace ini.</small></span><a href="/profile" data-route>Lihat memori ${icon("arrow-right")}</a></div>
    <div class="assistant-conversation" id="assistant-conversation" aria-live="polite">
      ${messages.length ? messages.map(assistantMessage).join("") : empty}
      ${state.assistantSending ? `<article class="assistant-message assistant"><span class="assistant-avatar">${icon("brain-circuit")}</span><div class="assistant-bubble assistant-typing"><span></span><span></span><span></span><small>Asisten sedang berpikir…</small></div></article>` : ""}
    </div>
    ${aiEnabled ? `<form class="assistant-composer" id="assistant-form"><textarea name="message" id="assistant-input" rows="1" maxlength="6000" placeholder="Tulis pesan untuk Asisten AI…" aria-label="Pesan untuk Asisten AI" ${state.assistantSending ? "disabled" : ""}>${escapeHtml(state.assistantDraft || "")}</textarea><div class="assistant-compose-foot"><small>Enter untuk kirim • Shift+Enter untuk baris baru</small><button class="btn btn-primary" type="submit" ${state.assistantSending ? "disabled" : ""}>${icon("arrow-up-right")} <span>Kirim</span></button></div></form>` : `<div class="assistant-offline">${icon("circle-alert")}<span><strong>AI belum terhubung</strong><small>Periksa Environment Variables Gemini di Vercel, kemudian redeploy.</small></span></div>`}
  </section>`;
  app.innerHTML = appShell(content, "assistant", "Asisten AI");
  requestAnimationFrame(() => {
    const conversation = app.querySelector("#assistant-conversation");
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
    if (!state.assistantSending) app.querySelector("#assistant-input")?.focus({ preventScroll: true });
  });
}

function renderAi() {
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  if (requestedType && aiTypes[requestedType]) state.aiType = requestedType;
  const type = aiTypes[state.aiType] || aiTypes.ksp;
  const aiEnabled = Boolean(state.config?.aiConfigured);
  const sources = state.sources.length ? state.sources : demoSources;
  document.title = `${type.label} — ${APP_NAME}`;
  const sourceChips = sources.slice(0,4).map((source) => `<span class="source-chip">${icon("file-check-2")}${escapeHtml(source.name)}</span>`).join("");
  const content = `<div class="page-intro compact-intro"><div><h1>${escapeHtml(type.label)}</h1><p>${escapeHtml(type.description)}</p></div></div>
    <div class="ai-simple-shell">
      <div class="ai-steps" aria-label="Tahapan pembuatan dokumen"><span class="active"><b>1</b>Pilih dokumen</span><span><b>2</b>Jelaskan kebutuhan</span><span><b>3</b>Tinjau hasil</span></div>
      <section class="ai-compose ai-compose-simple">
        <div class="compose-head"><div class="eyebrow"><span class="eyebrow-dot"></span>${aiEnabled ? "Asisten AI siap membantu" : "Pratinjau fitur AI"}</div><h1>${escapeHtml(type.title)}</h1><p>Cukup pilih dokumen dan jelaskan kebutuhan. Profil serta data sekolah akan dipakai otomatis.</p></div>
        ${aiEnabled ? "" : `<div class="ai-paused-banner">${icon("shield-check")}<span><strong>AI belum diaktifkan</strong><small>Formulir sudah siap digunakan. Setelah API AI diaktifkan, tombol susun draft akan otomatis tersedia.</small></span></div>`}
        <form id="ai-form">
          <div class="compose-body simple-compose-body">
            <div class="simple-form-step"><span class="step-badge">1</span><div class="form-group"><label for="ai-type">Dokumen yang ingin dibuat</label><select class="form-control" id="ai-type" name="type">${Object.entries(aiTypes).map(([key,item]) => `<option value="${key}" ${key === state.aiType ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div></div>
            <div class="simple-form-step"><span class="step-badge">2</span><label class="form-group"><span class="input-label">Apa yang ingin disusun?</span><span class="smart-input"><textarea id="ai-prompt" name="prompt" required>${escapeHtml(defaultPrompt(state.aiType))}</textarea><span class="smart-tools"><small>Tulis dengan bahasa sehari-hari.</small><span class="tool-buttons"><button type="button" class="tool-btn" aria-label="Lampirkan file">${icon("paperclip")}</button><button type="button" class="tool-btn" aria-label="Gunakan suara">${icon("mic")}</button></span></span></span></label></div>
            <details class="advanced-options"><summary>Pengaturan tambahan</summary><div class="template-grid"><button type="button" class="template-card selected" data-template="Gunakan seluruh data terverifikasi dan buat dokumen baru dari awal."><strong>Buat dari awal</strong><small>Gunakan semua data sekolah.</small></button><button type="button" class="template-card" data-template="Perbarui dokumen sebelumnya dan pertahankan bagian yang masih relevan."><strong>Perbarui dokumen lama</strong><small>Pertahankan bagian yang relevan.</small></button></div><label class="form-group template-source-select"><span class="input-label">Format acuan khusus <small>(opsional)</small></span><select class="form-control" name="templateSourceId"><option value="">Pilih otomatis dari Memori Sekolah</option>${templateOptions}</select><small>Pilih file bila urutan bagian dan tabelnya harus diikuti secara khusus.</small></label></details>
            <div class="memory-strip"><span class="memory-strip-icon">${icon("brain-circuit")}</span><span><strong>Memori sekolah terhubung</strong><small>${sources.length + 1} sumber dari ${escapeHtml((state.school || demoSchool).name)}</small></span><details><summary>Lihat sumber</summary><div class="source-chips">${sourceChips}</div></details></div>
          </div>
          <div class="compose-actions"><div class="model-ready ${aiEnabled ? "" : "offline"}"><span></span>${aiEnabled ? "Siap menyusun dokumen lengkap" : "AI belum aktif"}</div><button class="btn btn-primary" type="submit" ${aiEnabled ? "" : "disabled"}>${icon(aiEnabled ? "sparkles" : "lock-keyhole")} ${aiEnabled ? "Susun dokumen lengkap" : "Segera tersedia"}</button></div>
        </form>
        <div class="generating" id="generating"><div class="ai-loader"><span class="ai-loader-icon">${icon("sparkles")}</span></div><h2>Sedang menyusun dokumen lengkap…</h2><p>Asisten memetakan template, membaca memori sekolah, memeriksa acuan resmi, lalu menguji mutu hasil.</p><div class="processing-list"><div class="processing-item"><span>✓</span>Membaca profil, memori, dan template</div><div class="processing-item"><span>✓</span>Memeriksa acuan pendidikan terkini</div><div class="processing-item"><span>•</span>Menyusun, menilai, dan memperbaiki hasil</div></div></div>
        <div class="generation-done" id="generation-done"><span class="done-icon">${icon("file-check-2")}</span><h2>Dokumen lengkap berhasil disusun</h2><p>Hasil sudah melewati pemeriksaan struktur, konsistensi, sumber, dan format. Kepala sekolah dapat meninjau, mengedit, lalu mengesahkannya.</p><div class="result-preview"><strong id="result-title">${escapeHtml(type.label)}</strong><small id="result-summary">Dokumen siap ditinjau dan diedit.</small></div><div id="result-details" class="result-details"></div><div class="result-actions"><button class="btn btn-secondary" id="generate-again">Susun ulang</button><button class="btn btn-primary" id="open-result">Buka hasil terformat ${icon("arrow-right")}</button></div></div>
      </section>
    </div>`;
  app.innerHTML = appShell(content, activeForType(state.aiType), type.label);
}

function activeForType(type) {
  return ({ ksp: "ksp", pbd: "pbd", rkjm: "planning", rkt: "planning", rkas: "rkas", activity: "activity", sop: "activity", performance: "performance" })[type] || "ksp";
}

function defaultPrompt(type) {
  const school = state.school || demoSchool;
  return ({
    ksp: `Susun KSP lengkap tahun ${school.academic_year || "2026/2027"} berdasarkan profil sekolah, template yang tersimpan, dan prioritas dari Rapor Pendidikan. Gunakan bahasa formal yang mudah dipahami serta matriks yang rinci.`,
    pbd: "Analisis data mutu sekolah, tentukan indikator prioritas, akar masalah, rekomendasi pembenahan, dan indikator keberhasilannya.",
    rkjm: "Susun RKJM empat tahunan berdasarkan visi, kondisi, dan prioritas sekolah. Hubungkan sasaran, program, indikator, dan target per tahun.",
    rkt: "Susun RKT berdasarkan prioritas sekolah. Sertakan program, kegiatan, indikator, target, jadwal, dan penanggung jawab.",
    rkas: "Turunkan program RKT menjadi dokumen kegiatan dan anggaran yang rinci. Periksa keterkaitan dengan Juknis BOSP terkini dan tandai bagian yang wajib diverifikasi sebelum dimasukkan ke ARKAS.",
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
  document.title = `${doc.title} — ${APP_NAME}`;
  const contentMeta = typeof doc.content === "object" && doc.content ? doc.content : {};
  const reviewItems = [
    ...(contentMeta.missingFields || []).map((item) => ({ tone: "warning", label: "Perlu dilengkapi", text: item })),
    ...(contentMeta.assumptions || []).map((item) => ({ tone: "neutral", label: "Asumsi kerja", text: item })),
    ...(contentMeta.consistencyChecks || []).map((item) => ({ tone: item.status === "ok" ? "ok" : "warning", label: item.label || "Pemeriksaan", text: item.note || item.status })),
    ...(contentMeta.qualityChecks || []).map((item) => ({ tone: item.status === "ok" ? "ok" : "warning", label: item.label || "Mutu dokumen", text: item.note || item.status })),
  ];
  const reviewPanel = reviewItems.length ? `<section class="panel review-panel"><h2 class="section-title">Catatan peninjauan</h2><div class="review-list">${reviewItems.slice(0,8).map((item) => `<div class="review-item ${item.tone}">${icon(item.tone === "ok" ? "circle-check" : item.tone === "warning" ? "circle-alert" : "circle-help")}<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.text)}</small></span></div>`).join("")}</div></section>` : "";
  const sourcePanel = contentMeta.sources?.length ? `<section class="panel"><h2 class="section-title">Sumber yang digunakan</h2><div class="editor-source-list">${contentMeta.sources.map((source) => `<span>${icon("file-check-2")}${escapeHtml(source)}</span>`).join("")}</div></section>` : "";
  const standardPanel = contentMeta.standardReferences?.length ? `<section class="panel"><h2 class="section-title">Acuan resmi</h2><div class="editor-standard-list">${contentMeta.standardReferences.map((reference) => `<a href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(reference.title)}</strong><small>${escapeHtml(reference.status || "Sumber resmi")}</small></a>`).join("")}</div></section>` : "";
  const markdown = normalizeContent(doc.content);
  const stats = documentStatistics(markdown);
  const content = `<div class="page-intro document-heading"><div><h1>${escapeHtml(doc.title)}</h1><p>Versi ${doc.version || 1} • ${statusLabel(doc.status)} • ${stats.headings} bagian • ${stats.tables} tabel</p></div><button class="btn btn-primary" id="save-document">${icon("save")} Simpan perubahan</button></div>
    <div class="document-mode-bar" role="tablist" aria-label="Mode dokumen"><button type="button" class="document-mode ${state.documentMode === "preview" ? "active" : ""}" data-document-mode="preview" role="tab" aria-selected="${state.documentMode === "preview"}">${icon("file-text")} Tampilan rapi</button><button type="button" class="document-mode ${state.documentMode === "edit" ? "active" : ""}" data-document-mode="edit" role="tab" aria-selected="${state.documentMode === "edit"}">${icon("save")} Edit isi</button><span>Simbol format tidak akan muncul pada file ekspor.</span></div>
    <div class="doc-editor"><section class="editor-paper"><div id="document-preview" class="document-preview" ${state.documentMode === "preview" ? "" : "hidden"}>${renderDocumentPreview(markdown)}</div><textarea id="document-content" aria-label="Isi dokumen" ${state.documentMode === "edit" ? "" : "hidden"}>${escapeHtml(markdown)}</textarea></section><aside class="editor-tools"><section class="panel quality-panel"><h2 class="section-title">Kesiapan dokumen</h2><div class="quality-score"><strong>${escapeHtml(contentMeta.qualityScore ?? "—")}${contentMeta.qualityScore != null ? "/100" : ""}</strong><small>${contentMeta.templateReference ? `Mengikuti ${escapeHtml(contentMeta.templateReference)}` : "Siap ditinjau kepala sekolah"}</small></div></section><section class="panel"><h2 class="section-title">Status dokumen</h2><select class="form-control" id="document-status"><option value="draft" ${doc.status === "draft" ? "selected" : ""}>Dalam penyusunan</option><option value="review" ${doc.status === "review" ? "selected" : ""}>Siap ditinjau</option><option value="approved" ${doc.status === "approved" ? "selected" : ""}>Disetujui</option></select></section>${reviewPanel}${sourcePanel}${standardPanel}<section class="panel"><h2 class="section-title">Ekspor tanpa simbol AI</h2><div class="export-list"><button class="btn btn-secondary" data-export="docx">${icon("file-text")} Word terformat (.docx)</button><button class="btn btn-secondary" data-export="xlsx">${icon("file-spreadsheet")} Excel terstruktur (.xlsx)</button><button class="btn btn-secondary" data-export="pdf">${icon("file-down")} PDF siap cetak (.pdf)</button></div></section><button class="btn btn-ghost" data-route-to="/documents">${icon("arrow-left")} Kembali ke dokumen</button></aside></div>`;
  app.innerHTML = appShell(content, "documents", "Editor Dokumen");
}

function renderDocumentPreview(markdown = "") {
  let listNumber = 0;
  return parseDocumentBlocks(markdown).map((block) => {
    if (block.type !== "list" || !block.ordered) listNumber = 0;
    if (block.type === "heading") return `<h${Math.min(block.level + 1, 5)} class="document-heading-${block.level}">${escapeHtml(block.text)}</h${Math.min(block.level + 1, 5)}>`;
    if (block.type === "paragraph") return `<p>${escapeHtml(block.text)}</p>`;
    if (block.type === "quote") return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
    if (block.type === "divider") return `<hr>`;
    if (block.type === "list") {
      if (block.ordered) listNumber += 1;
      return `<div class="document-list-item"><span>${block.ordered ? `${listNumber}.` : "•"}</span><p>${escapeHtml(block.text)}</p></div>`;
    }
    if (block.type === "table") return `<div class="document-table-wrap"><table><thead><tr>${block.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${block.headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    return "";
  }).join("") || `<div class="document-empty">Dokumen belum memiliki isi.</div>`;
}

function setDocumentMode(mode) {
  state.documentMode = mode === "edit" ? "edit" : "preview";
  const textarea = app.querySelector("#document-content");
  const preview = app.querySelector("#document-preview");
  if (!textarea || !preview) return;
  if (state.documentMode === "preview") preview.innerHTML = renderDocumentPreview(textarea.value);
  textarea.hidden = state.documentMode !== "edit";
  preview.hidden = state.documentMode !== "preview";
  app.querySelectorAll("[data-document-mode]").forEach((button) => {
    const active = button.dataset.documentMode === state.documentMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (state.documentMode === "edit") textarea.focus();
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
  const protectedRoute = !["landing", "auth", "join"].includes(routeName);
  if (protectedRoute && state.session && sessionExpiredByInactivity()) {
    await expireIdleSession();
    return;
  }
  const inviteToken = new URLSearchParams(window.location.search).get("token") || new URLSearchParams(window.location.search).get("invite") || state.pendingInviteToken;
  if (inviteToken) state.pendingInviteToken = inviteToken;
  if (["auth","join"].includes(routeName) && state.user && state.pendingInviteToken) {
    try { await claimWorkspaceInvite(state.pendingInviteToken); }
    catch (cause) { state.inviteError = humanError(cause); toast(state.inviteError,"error"); renderJoin(); bindPageEvents(); }
    return;
  }
  if (protectedRoute && Date.now() - state.configUpdatedAt > 30_000) await refreshConfig();
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
  ({ landing: renderLanding, auth: renderAuth, onboarding: renderOnboarding, dashboard: renderDashboard, calendar: renderCalendar, profile: renderProfile, documents: renderDocuments, ai: renderAi, assistant: renderAssistant, team: renderTeam, templates: renderTemplates, guide: renderGuide, more: renderMore, join: renderJoin, "document-editor": renderDocumentEditor })[routeName]?.();
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
  app.querySelectorAll("[data-add-agenda]").forEach((button) => button.addEventListener("click", () => openAgendaDialog("",button.dataset.date || state.selectedAgendaDate || localDateKey(new Date()))));
  app.querySelectorAll("[data-edit-agenda]").forEach((button) => button.addEventListener("click", () => openAgendaDialog(button.dataset.editAgenda)));
  app.querySelectorAll("[data-calendar-date]").forEach((button) => button.addEventListener("click", () => { state.selectedAgendaDate = button.dataset.calendarDate; state.calendarMonth = new Date(`${state.selectedAgendaDate}T12:00:00`).getMonth(); renderCalendar(); bindPageEvents(); }));
  app.querySelectorAll("[data-calendar-month]").forEach((button) => button.addEventListener("click", () => { state.calendarMonth = Number(button.dataset.calendarMonth); state.selectedAgendaDate = `${state.calendarYear}-${String(state.calendarMonth+1).padStart(2,"0")}-01`; renderCalendar(); bindPageEvents(); }));
  app.querySelectorAll("[data-calendar-year]").forEach((button) => button.addEventListener("click", async () => { try { state.calendarYear = Number(button.dataset.calendarYear); state.selectedAgendaDate = `${state.calendarYear}-${String(state.calendarMonth+1).padStart(2,"0")}-01`; await loadAgendasForYear(state.calendarYear); renderCalendar(); bindPageEvents(); } catch (cause) { toast(humanError(cause),"error"); } }));
  app.querySelector("[data-calendar-today]")?.addEventListener("click", async () => { try { const today = new Date(); state.calendarYear = today.getFullYear(); state.calendarMonth = today.getMonth(); state.selectedAgendaDate = localDateKey(today); await loadAgendasForYear(state.calendarYear); renderCalendar(); bindPageEvents(); } catch (cause) { toast(humanError(cause),"error"); } });
  app.querySelector("[data-back-login]")?.addEventListener("click", () => { state.authNotice = null; renderAuth(); bindPageEvents(); });

  const authTabs = app.querySelectorAll("[data-auth-mode]");
  authTabs.forEach((tab) => tab.addEventListener("click", () => {
    authTabs.forEach((item) => item.classList.toggle("active", item === tab));
    const signup = tab.dataset.authMode === "signup";
    app.querySelector("#name-field").hidden = !signup;
    app.querySelector("#confirm-field").hidden = !signup;
    app.querySelector("#auth-form").dataset.mode = signup ? "signup" : "login";
    app.querySelector("#auth-submit-label").textContent = signup ? "Buat akun" : "Masuk ke workspace";
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
  app.querySelector("#quick-ai-form")?.addEventListener("submit", (event) => { event.preventDefault(); const prompt = String(new FormData(event.currentTarget).get("prompt") || "").trim(); if (!prompt) return; state.assistantDraft = prompt; navigate("/assistant"); });
  if (state.pendingPrompt && app.querySelector("#ai-prompt")) { app.querySelector("#ai-prompt").value = state.pendingPrompt; state.pendingPrompt = ""; }
  app.querySelector("#ai-type")?.addEventListener("change", (event) => { state.aiType = event.target.value; navigate(`/ai?type=${state.aiType}`); });
  app.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => { app.querySelectorAll("[data-template]").forEach((item) => item.classList.remove("selected")); button.classList.add("selected"); const prompt = app.querySelector("#ai-prompt"); prompt.value = `${prompt.value}\n\n${button.dataset.template}`; }));
  app.querySelector("#ai-form")?.addEventListener("submit", handleGenerate);
  app.querySelector("#assistant-form")?.addEventListener("submit", handleAssistantSubmit);
  app.querySelector("#assistant-input")?.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } });
  app.querySelectorAll("[data-assistant-prompt]").forEach((button) => button.addEventListener("click", () => submitAssistantMessage(button.dataset.assistantPrompt)));
  app.querySelectorAll("[data-retry-assistant]").forEach((button) => button.addEventListener("click", () => { const failed = state.assistantMessages.find((message) => message.id === button.dataset.retryAssistant); if (!failed) return; state.assistantMessages = state.assistantMessages.filter((message) => message.id !== failed.id); submitAssistantMessage(failed.content); }));
  app.querySelector("[data-clear-assistant]")?.addEventListener("click", clearAssistantHistory);
  app.querySelector("#generate-again")?.addEventListener("click", () => { state.aiResult = null; renderAi(); bindPageEvents(); refreshIcons(app); });
  app.querySelector("#open-result")?.addEventListener("click", openGeneratedResult);
  app.querySelectorAll("[data-document-id]").forEach((card) => { const open = () => navigate(`/documents/${encodeURIComponent(card.dataset.documentId)}`); card.addEventListener("click", open); card.addEventListener("keydown", (event) => { if (["Enter"," "].includes(event.key)) open(); }); });
  app.querySelector("#save-document")?.addEventListener("click", saveDocument);
  app.querySelectorAll("[data-document-mode]").forEach((button) => button.addEventListener("click", () => setDocumentMode(button.dataset.documentMode)));
  app.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportDocument(button.dataset.export)));
  app.querySelectorAll("[data-open-invite]").forEach((button) => button.addEventListener("click",openInviteDialog));
  app.querySelectorAll("[data-remove-member]").forEach((button) => button.addEventListener("click",() => removeTeamMember(button.dataset.removeMember)));
  app.querySelectorAll("[data-cancel-invite]").forEach((button) => button.addEventListener("click",() => cancelWorkspaceInvite(button.dataset.cancelInvite)));
  app.querySelectorAll("[data-copy-invite]").forEach((button) => button.addEventListener("click",async () => { try { await copyText(button.dataset.copyInvite); toast("Tautan undangan disalin"); } catch (cause) { toast(humanError(cause),"error"); } }));
  app.querySelectorAll("[data-open-folder]").forEach((button) => button.addEventListener("click",openFolderDialog));
  app.querySelectorAll("[data-remove-folder]").forEach((button) => button.addEventListener("click",() => removeTemplateFolder(button.dataset.removeFolder)));
  app.querySelector("#library-search")?.addEventListener("input",(event) => {
    const query = String(event.target.value || "").trim().toLowerCase();
    app.querySelectorAll("[data-library-search]").forEach((card) => { card.hidden = query && !card.dataset.librarySearch.includes(query); });
  });
  app.querySelector("[data-invite-logout]")?.addEventListener("click",logoutForInvite);
}

async function logoutForInvite() {
  const token = state.pendingInviteToken;
  if (state.supabase && !state.demo) await state.supabase.auth.signOut({ scope:"local" });
  localStorage.removeItem(SESSION_ACTIVITY_KEY);
  state.user = null; state.session = null; state.school = null; state.membership = null; state.inviteError = ""; state.pendingInviteToken = token;
  navigate(`/auth?invite=${encodeURIComponent(token)}&mode=login`);
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
      state.agendas = [...demoAgendas];
      state.teamMembers = [...demoTeamMembers];
      state.templateFolders = [...demoTemplateFolders];
      if (state.pendingInviteToken) await claimWorkspaceInvite(state.pendingInviteToken);
      else navigate("/dashboard");
      return;
    }
    if (form.dataset.mode === "signup") {
      const inviteQuery = state.pendingInviteToken ? `?invite=${encodeURIComponent(state.pendingInviteToken)}` : "";
      const { data: result, error: authError } = await state.supabase.auth.signUp({ email: data.email, password: data.password, options: { data: { full_name: data.fullName }, emailRedirectTo: `${window.location.origin}/auth${inviteQuery}` } });
      if (authError) throw authError;
      if (!result.session) { state.authNotice = data.email; renderAuth(); bindPageEvents(); return; }
      state.session = result.session; state.user = result.user;
      markSessionActivity(true);
      if (state.pendingInviteToken) await claimWorkspaceInvite(state.pendingInviteToken);
      else navigate("/onboarding");
    } else {
      const { data: result, error: authError } = await state.supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (authError) throw authError;
      state.session = result.session; state.user = result.user;
      markSessionActivity(true);
      if (state.pendingInviteToken) await claimWorkspaceInvite(state.pendingInviteToken);
      else {
        await loadWorkspace();
        navigate(state.school ? "/dashboard" : "/onboarding");
      }
    }
  } catch (cause) {
    if (state.pendingInviteToken && state.user && !state.school && state.supabase && !state.demo) {
      await state.supabase.auth.signOut({ scope:"local" });
      localStorage.removeItem(SESSION_ACTIVITY_KEY);
      state.user = null; state.session = null;
    }
    error.textContent = humanError(cause);
    error.hidden = false;
  } finally { submit.disabled = false; }
}

async function claimWorkspaceInvite(token) {
  if (!token) return;
  if (state.demo || !state.supabase) {
    state.school = demoSchool;
    state.membership = { isOwner:false, access:"full" };
    state.teamMembers = [...demoTeamMembers];
    state.templateFolders = [...demoTemplateFolders];
    state.pendingInviteToken = "";
    state.inviteError = "";
    navigate("/dashboard");
    return;
  }
  const { error } = await state.supabase.rpc("kepsek_claim_workspace_invite",{ p_invite_token:token });
  if (error) throw error;
  state.pendingInviteToken = "";
  state.inviteError = "";
  await loadWorkspace();
  toast("Anda berhasil bergabung ke workspace sekolah");
  navigate("/dashboard");
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
    state.school = normalizeSchool(schoolRow); state.membership = { isOwner:true, access:"full" };
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

async function handleAssistantSubmit(event) {
  event.preventDefault();
  const message = String(new FormData(event.currentTarget).get("message") || "").trim();
  await submitAssistantMessage(message);
}

async function submitAssistantMessage(message) {
  const content = String(message || "").trim();
  if (state.assistantSending || content.length < 2) return;
  if (!state.config?.aiConfigured) {
    toast("AI belum terhubung. Periksa konfigurasi Gemini di Vercel.", "error");
    return;
  }
  const previousHistory = state.assistantMessages.filter((item) => !item.failed).slice(-16);
  const pending = { id: `pending-${crypto.randomUUID()}`, role: "user", content, created_at: new Date().toISOString(), pending: true };
  state.assistantDraft = "";
  state.assistantMessages.push(pending);
  state.assistantSending = true;
  renderAssistant();
  bindPageEvents();
  try {
    if (state.demo || !state.supabase) throw new Error("Hubungkan workspace sekolah sebelum menggunakan Asisten AI.");
    const session = await activeSession();
    if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        schoolId: state.school.id,
        message: content,
        history: previousHistory.map((item) => ({ role:item.role, content:item.content })),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || "Asisten belum dapat menjawab.");
      error.code = result.code;
      throw error;
    }
    const assistant = { id: crypto.randomUUID(), role:"assistant", content:String(result.reply || "").trim(), model:result.metadata?.model || null, metadata:result.metadata || {}, created_at:new Date().toISOString() };
    if (!assistant.content) throw new Error("Asisten belum menghasilkan jawaban.");
    let stored = [pending, assistant];
    const { data, error } = await state.supabase.from("kepsek_assistant_messages").insert([
      { school_id:state.school.id, user_id:state.user.id, role:"user", content },
      { school_id:state.school.id, user_id:state.user.id, role:"assistant", content:assistant.content, model:assistant.model, metadata:{ attempts:assistant.metadata.attempts || 1, usage:assistant.metadata.usage || null } },
    ]).select();
    if (error) {
      console.warn("Assistant history could not be saved", error.message);
      toast("Jawaban berhasil, tetapi riwayat belum tersimpan.", "error");
    } else if (Array.isArray(data) && data.length === 2) {
      stored = data;
    }
    state.assistantMessages = state.assistantMessages.filter((item) => item.id !== pending.id).concat(stored);
  } catch (cause) {
    pending.pending = false;
    pending.failed = true;
    state.assistantDraft = content;
    toast(humanError(cause), "error");
  } finally {
    state.assistantSending = false;
    renderAssistant();
    bindPageEvents();
  }
}

async function clearAssistantHistory() {
  if (!window.confirm("Mulai percakapan baru? Riwayat chat pada workspace ini akan dihapus.")) return;
  try {
    if (!state.demo && state.supabase) {
      const { error } = await state.supabase.from("kepsek_assistant_messages").delete().eq("school_id",state.school.id).eq("user_id",state.user.id);
      if (error) throw error;
    }
    state.assistantMessages = [];
    state.assistantDraft = "";
    renderAssistant();
    bindPageEvents();
    toast("Percakapan baru siap dimulai");
  } catch (cause) {
    toast(humanError(cause), "error");
  }
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
      const response = await fetch("/api/generate", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session.access_token}` }, body:JSON.stringify({ type:values.type, prompt:values.prompt, templateSourceId:values.templateSourceId || "", schoolId:state.school.id }) });
      result = await response.json();
      if (!response.ok) throw new Error(result.error || "AI belum dapat menyusun dokumen");
    }
    state.aiResult = result;
    app.querySelector("#generating").classList.remove("show");
    app.querySelector("#generation-done").classList.add("show");
    app.querySelector("#result-title").textContent = result.title || aiTypes[values.type].label;
    app.querySelector("#result-summary").textContent = result.summary || "Dokumen lengkap siap ditinjau dan diedit.";
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
    ["Skor mutu hasil", result.qualityScore != null ? `${result.qualityScore}/100` : "Diperiksa", Number(result.qualityScore) >= 82 ? "ok" : "warning"],
    ["Bagian perlu dilengkapi", missing.length, missing.length ? "warning" : "ok"],
    ["Pemeriksaan konsistensi", `${okChecks}/${checks.length || 0}`, checks.length && okChecks === checks.length ? "ok" : "neutral"],
    ["Sumber digunakan", sources.length, sources.length ? "ok" : "warning"],
  ];
  const template = result.templateReference || result.documentMeta?.templateReference;
  return `<div class="result-metrics">${metrics.map(([label,value,tone]) => `<div class="result-metric ${tone}"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></div>`).join("")}</div>${template ? `<div class="result-template">${icon("files")}<span><strong>Format yang diikuti</strong><small>${escapeHtml(template)}</small></span></div>` : ""}${missing.length ? `<div class="result-warning">${icon("circle-alert")}<span><strong>Perlu konfirmasi kepala sekolah</strong><small>${escapeHtml(missing.slice(0,3).join(" • "))}${missing.length > 3 ? ` • dan ${missing.length - 3} lainnya` : ""}</small></span></div>` : ""}`;
}

async function openGeneratedResult() {
  if (!state.aiResult) return;
  const type = state.aiType;
  let doc = { id:crypto.randomUUID(), school_id:state.school.id, title:state.aiResult.title || aiTypes[type].label, type, status:"review", version:1, content:state.aiResult.content || state.aiResult.markdown || "", updated_at:new Date().toISOString() };
  try {
    if (!state.demo && state.supabase) {
      const { data, error } = await state.supabase.from("kepsek_documents").insert({ school_id:state.school.id, created_by:state.user.id, type, title:doc.title, status:"review", content:{ markdown:doc.content, summary:state.aiResult.summary, assumptions:state.aiResult.assumptions || [], missingFields:state.aiResult.missingFields || [], sources:state.aiResult.sources || [], consistencyChecks:state.aiResult.consistencyChecks || [], qualityChecks:state.aiResult.qualityChecks || [], qualityScore:state.aiResult.qualityScore, standardReferences:state.aiResult.standardReferences || [], templateReference:state.aiResult.templateReference || state.aiResult.documentMeta?.templateReference || "", keyDecisions:state.aiResult.keyDecisions || [], documentMeta:state.aiResult.documentMeta || {} } }).select().single();
      if (error) throw error;
      doc = data;
    }
    state.documents.unshift(doc); state.selectedDocument = doc; state.documentMode = "preview"; navigate(`/documents/${encodeURIComponent(doc.id)}`);
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
    const blocks = parseDocumentBlocks(content);
    if (format === "docx") {
      const { AlignmentType, Document, Footer, HeadingLevel, PageNumber, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import("https://esm.sh/docx@9.5.1?bundle");
      const headingLevels = [HeadingLevel.TITLE,HeadingLevel.HEADING_1,HeadingLevel.HEADING_2,HeadingLevel.HEADING_3,HeadingLevel.HEADING_4];
      let orderedNumber = 0;
      const children = blocks.flatMap((block) => {
        if (block.type !== "list" || !block.ordered) orderedNumber = 0;
        if (block.type === "heading") return [new Paragraph({ heading:headingLevels[Math.min(block.level,4)], alignment:block.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT, spacing:{ before:block.level === 1 ? 240 : 180, after:120 }, children:[new TextRun({ text:block.text, bold:true })] })];
        if (block.type === "paragraph") return [new Paragraph({ alignment:AlignmentType.JUSTIFIED, spacing:{ after:120, line:360 }, children:[new TextRun({ text:block.text, size:22 })] })];
        if (block.type === "quote") return [new Paragraph({ indent:{ left:500 }, spacing:{ after:120 }, children:[new TextRun({ text:block.text, italics:true, color:"475569", size:21 })] })];
        if (block.type === "divider") return [new Paragraph({ spacing:{ before:90, after:90 }, children:[new TextRun({ text:"" })] })];
        if (block.type === "list") {
          if (block.ordered) orderedNumber += 1;
          return [new Paragraph({ indent:{ left:360, hanging:180 }, spacing:{ after:70 }, children:[new TextRun({ text:`${block.ordered ? `${orderedNumber}.` : "•"} ${block.text}`, size:22 })] })];
        }
        if (block.type === "table") return [new Table({ width:{ size:100, type:WidthType.PERCENTAGE }, rows:[
          new TableRow({ tableHeader:true, children:block.headers.map((cell) => new TableCell({ shading:{ fill:"E9EFF8" }, children:[new Paragraph({ children:[new TextRun({ text:cell, bold:true, size:19 })] })] })) }),
          ...block.rows.map((row) => new TableRow({ children:block.headers.map((_,index) => new TableCell({ children:[new Paragraph({ children:[new TextRun({ text:row[index] || "", size:19 })] })] })) })),
        ] })];
        return [];
      });
      const footer = new Footer({ children:[new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({ text:`${doc.title}  •  Halaman `, color:"64748B", size:18 }),new TextRun({ children:[PageNumber.CURRENT], color:"64748B", size:18 })] })] });
      const word = new Document({ creator:APP_NAME, title:doc.title, description:"Dokumen sekolah yang telah diformat oleh Bantu Beres", styles:{ default:{ document:{ run:{ font:"Arial", size:22 }, paragraph:{ spacing:{ line:300 } } } } }, sections:[{ properties:{ page:{ margin:{ top:1134,right:1134,bottom:1134,left:1134 } } }, footers:{ default:footer }, children }] });
      const blob = await Packer.toBlob(word);
      downloadBlob(blob,`${safeFilename(doc.title)}.docx`);
    } else if (format === "xlsx") {
      const XLSX = await import("https://esm.sh/xlsx@0.18.5?bundle");
      const XLSXApi = XLSX.default || XLSX;
      const book = XLSXApi.utils.book_new();
      const metadata = typeof doc.content === "object" && doc.content ? doc.content : {};
      const summary = XLSXApi.utils.aoa_to_sheet([
        ["DOKUMEN SEKOLAH"], ["Judul",doc.title], ["Sekolah",(state.school || demoSchool).name],
        ["Status",statusLabel(doc.status)], ["Versi",doc.version || 1], ["Dibuat dengan",APP_NAME],
        [], ["Ringkasan",metadata.summary || cleanDocumentText(content).slice(0,800)],
      ]);
      summary["!cols"] = [{ wch:22 },{ wch:95 }];
      XLSXApi.utils.book_append_sheet(book,summary,"Ringkasan");
      const narrativeRows = [["Bagian","Isi"]];
      let currentSection = doc.title;
      blocks.filter((block) => block.type !== "table" && block.type !== "divider").forEach((block) => {
        if (block.type === "heading") currentSection = block.text;
        else narrativeRows.push([currentSection,block.text || ""]);
      });
      const narrative = XLSXApi.utils.aoa_to_sheet(narrativeRows);
      narrative["!cols"] = [{ wch:38 },{ wch:110 }];
      XLSXApi.utils.book_append_sheet(book,narrative,"Narasi");
      blocks.filter((block) => block.type === "table").forEach((table,index) => {
        const sheet = XLSXApi.utils.aoa_to_sheet([table.headers,...table.rows]);
        sheet["!cols"] = table.headers.map((header,column) => ({ wch:Math.min(55,Math.max(15,String(header).length + 4,...table.rows.map((row) => String(row[column] || "").length + 2))) }));
        XLSXApi.utils.book_append_sheet(book,sheet,`Matriks ${index + 1}`);
      });
      XLSXApi.writeFile(book,`${safeFilename(doc.title)}.xlsx`);
    } else {
      const { jsPDF } = await import("https://esm.sh/jspdf@2.5.2?bundle");
      const autoTableModule = await import("https://esm.sh/jspdf-autotable@3.8.4?bundle");
      const autoTable = autoTableModule.default;
      const pdf = new jsPDF({ unit:"mm", format:"a4" });
      const margin = 18;
      let y = 22;
      const ensureSpace = (height = 12) => { if (y + height > 278) { pdf.addPage(); y = 22; } };
      const writeText = (text,{ size=10.5,bold=false,indent=0,after=3,lineHeight=5.3 } = {}) => {
        pdf.setFont("helvetica",bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(29,40,56);
        const lines = pdf.splitTextToSize(String(text),174-indent);
        for (const line of lines) { ensureSpace(lineHeight); pdf.text(line,margin+indent,y); y += lineHeight; }
        y += after;
      };
      let listNumber = 0;
      for (const block of blocks) {
        if (block.type !== "list" || !block.ordered) listNumber = 0;
        if (block.type === "heading") { ensureSpace(block.level === 1 ? 24 : 15); writeText(block.text,{ size:block.level === 1 ? 16 : block.level === 2 ? 13 : 11.5,bold:true,after:block.level === 1 ? 7 : 4,lineHeight:block.level === 1 ? 7 : 5.8 }); }
        else if (block.type === "paragraph") writeText(block.text,{ after:3,lineHeight:5.3 });
        else if (block.type === "quote") writeText(block.text,{ size:9.5,indent:6,after:4,lineHeight:5 });
        else if (block.type === "divider") { ensureSpace(6); pdf.setDrawColor(210,220,232); pdf.line(margin,y,192,y); y += 6; }
        else if (block.type === "list") { if (block.ordered) listNumber += 1; writeText(`${block.ordered ? `${listNumber}.` : "•"} ${block.text}`,{ indent:5,after:1,lineHeight:5.1 }); }
        else if (block.type === "table") {
          ensureSpace(20);
          autoTable(pdf,{ startY:y, head:[block.headers], body:block.rows, margin:{ left:margin,right:margin }, styles:{ font:"helvetica",fontSize:7.5,cellPadding:2,overflow:"linebreak",valign:"top",lineColor:[207,218,232],lineWidth:.2 }, headStyles:{ fillColor:[53,72,105],textColor:255,fontStyle:"bold" }, alternateRowStyles:{ fillColor:[247,249,252] }, didDrawPage:() => { y = 22; } });
          y = (pdf.lastAutoTable?.finalY || y) + 7;
        }
      }
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page); pdf.setDrawColor(220,226,235); pdf.line(margin,287,192,287);
        pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.setTextColor(100,116,139);
        pdf.text(doc.title.slice(0,80),margin,292); pdf.text(`Halaman ${page} dari ${pages}`,192,292,{ align:"right" });
      }
      pdf.setProperties({ title:doc.title, subject:"Dokumen sekolah", author:APP_NAME, creator:APP_NAME });
      pdf.save(`${safeFilename(doc.title)}.pdf`);
    }
    toast("File terformat berhasil dibuat tanpa simbol Markdown");
  } catch (cause) { toast(`Ekspor gagal: ${humanError(cause)}`,"error"); }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url),1000);
}

function safeFilename(value) { return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-|-$/g,"") || "dokumen-sekolah"; }

async function loadWorkspace() {
  if (!state.supabase || !state.user) return;
  const { data, error } = await state.supabase.from("kepsek_schools").select("*").order("created_at",{ascending:true}).limit(1).maybeSingle();
  if (error) throw error;
  state.membership = data ? { isOwner:data.owner_user_id === state.user.id, access:"full" } : null;
  state.school = normalizeSchool(data);
  if (!state.school) return;
  const calendarStart = new Date(state.calendarYear,0,1).toISOString();
  const calendarEnd = new Date(state.calendarYear+1,0,1).toISOString();
  const [docs,sources,projects,agendas,assistant,members,invites,folders] = await Promise.all([
    state.supabase.from("kepsek_documents").select("*").eq("school_id",state.school.id).order("updated_at",{ascending:false}),
    state.supabase.from("kepsek_sources").select("*").eq("school_id",state.school.id).order("created_at",{ascending:false}),
    state.supabase.from("kepsek_projects").select("*").eq("school_id",state.school.id).order("updated_at",{ascending:false}),
    state.supabase.from("kepsek_agendas").select("*").eq("school_id",state.school.id).gte("starts_at",calendarStart).lt("starts_at",calendarEnd).order("starts_at",{ascending:true}),
    state.supabase.from("kepsek_assistant_messages").select("*").eq("school_id",state.school.id).eq("user_id",state.user.id).order("created_at",{ascending:false}).limit(60),
    state.supabase.from("kepsek_workspace_members").select("*").eq("school_id",state.school.id).order("joined_at",{ascending:true}),
    state.supabase.from("kepsek_workspace_invites").select("id,school_id,email,display_name,expires_at,accepted_at,created_at").eq("school_id",state.school.id).order("created_at",{ascending:false}),
    state.supabase.from("kepsek_template_folders").select("*").eq("school_id",state.school.id).order("updated_at",{ascending:false}),
  ]);
  state.documents = docs.data || []; state.sources = sources.data || []; state.projects = projects.data || []; state.agendas = agendas.data || [];
  state.assistantMessages = (assistant.data || []).reverse();
  state.teamMembers = (members.data || []).filter((member) => member.user_id !== state.school.owner_user_id);
  state.workspaceInvites = (invites.data || []).map((invite) => ({ ...invite, invite_url:localStorage.getItem(`bb-invite-${invite.id}`) || "" }));
  state.templateFolders = folders.data || [];
}

function lastSessionActivity() {
  const value = Number(localStorage.getItem(SESSION_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function sessionExpiredByInactivity() {
  return isIdleSession(lastSessionActivity(),Date.now(),Boolean(state.session));
}

function markSessionActivity(force = false) {
  if (!state.session || state.demo || sessionExpiredByInactivity()) return;
  const now = Date.now();
  if (!force && now - lastActivityWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
  localStorage.setItem(SESSION_ACTIVITY_KEY,String(now));
  lastActivityWrite = now;
}

function clearWorkspaceState() {
  state.user = null; state.session = null; state.school = null; state.membership = null;
  state.documents = []; state.sources = []; state.projects = []; state.agendas = [];
  state.assistantMessages = []; state.teamMembers = []; state.workspaceInvites = [];
  state.templateFolders = []; state.pendingInviteToken = ""; state.selectedDocument = null;
}

async function expireIdleSession() {
  if (!state.session || state.idleLogoutInProgress) return;
  state.idleLogoutInProgress = true;
  try {
    if (state.supabase && !state.demo) await state.supabase.auth.signOut({ scope:"local" });
  } catch (cause) {
    console.warn("Local idle sign-out failed",cause);
  } finally {
    localStorage.removeItem(SESSION_ACTIVITY_KEY);
    clearWorkspaceState();
    state.demo = !state.config?.configured;
    state.idleLogoutInProgress = false;
    navigate("/auth");
    toast("Sesi berakhir setelah 2 jam tanpa aktivitas. Silakan masuk kembali.","error");
  }
}

async function handleSessionActivity() {
  if (!state.session || state.demo) return;
  if (sessionExpiredByInactivity()) { await expireIdleSession(); return; }
  markSessionActivity();
}

async function activeSession() {
  if (!state.supabase) return null;
  if (sessionExpiredByInactivity()) { await expireIdleSession(); return null; }
  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  state.user = data.session?.user || null;
  if (data.session && !lastSessionActivity()) markSessionActivity(true);
  return data.session;
}

async function logout() {
  if (state.supabase && !state.demo) await state.supabase.auth.signOut({ scope:"local" });
  localStorage.removeItem(SESSION_ACTIVITY_KEY);
  clearWorkspaceState();
  state.demo = !state.config?.configured;
  navigate("/auth");
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
  await refreshConfig();
  state.demo = !state.config.configured;
  if (state.config.configured) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.75.1?bundle");
      state.supabase = createClient(state.config.supabaseUrl,state.config.supabasePublishableKey,{ auth:{ persistSession:true,autoRefreshToken:true,detectSessionInUrl:true } });
      const { data } = await state.supabase.auth.getSession();
      state.session = data.session; state.user = data.session?.user || null;
      if (state.session && sessionExpiredByInactivity()) {
        await state.supabase.auth.signOut({ scope:"local" });
        localStorage.removeItem(SESSION_ACTIVITY_KEY);
        state.session = null; state.user = null;
      } else if (state.user) {
        if (!lastSessionActivity()) markSessionActivity(true);
        await loadWorkspace();
      }
      state.supabase.auth.onAuthStateChange((event,session) => {
        state.session = session; state.user = session?.user || null;
        if (!session || event === "SIGNED_OUT") localStorage.removeItem(SESSION_ACTIVITY_KEY);
        else if (!lastSessionActivity()) markSessionActivity(true);
      });
    } catch (cause) { console.warn("Supabase initialization failed",cause); state.demo = true; }
  }
  for (const eventName of ["pointerdown","keydown","touchstart","scroll"]) window.addEventListener(eventName,handleSessionActivity,{ passive:true });
  idleCheckTimer = window.setInterval(() => { if (sessionExpiredByInactivity()) expireIdleSession(); },60_000);
  state.loading = false;
  await route();
}

async function refreshConfig() {
  try {
    const response = await fetch(`/api/config?ts=${Date.now()}`, { cache:"no-store" });
    state.config = response.ok ? await response.json() : { configured:false, aiConfigured:false };
  } catch {
    state.config = state.config || { configured:false, aiConfigured:false };
  }
  state.configUpdatedAt = Date.now();
  return state.config;
}

window.addEventListener("popstate",route);
window.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible") return;
  await handleSessionActivity();
  if (Date.now() - state.configUpdatedAt < 30_000) return;
  const wasEnabled = Boolean(state.config?.aiConfigured);
  await refreshConfig();
  if (wasEnabled !== Boolean(state.config?.aiConfigured) && !["landing","auth"].includes(currentRoute())) await route({ preserveScroll:true });
});
init();
