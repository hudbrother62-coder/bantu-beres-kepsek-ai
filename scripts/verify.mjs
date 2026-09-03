import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/document-format.js",
  "assets/ai-text-format.js",
  "assets/session-policy.js",
  "assets/bantu-beres-symbol.png",
  "manifest.webmanifest",
  "api/config.js",
  "api/health.js",
  "api/generate.js",
  "api/chat.js",
  "api/analyze-file.js",
  "lib/gemini.js",
  "lib/education-standards.js",
  "lib/supabase-auth.js",
  "lib/public-config.js",
  "supabase/migrations/20260902140000_kepsek_core.sql",
  "supabase/migrations/20260902143000_kepsek_workspace_v1.sql",
  "supabase/migrations/20260902230500_harden_agenda_privileges.sql",
  "supabase/migrations/20260903015000_add_kepsek_assistant_messages.sql",
  "supabase/migrations/20260903143000_add_full_access_team_and_library.sql",
  "vercel.json",
];

for (const file of required) await access(resolve(root, file));

for (const file of ["assets/app.js", "assets/document-format.js", "assets/session-policy.js", "api/config.js", "api/health.js", "api/generate.js", "api/chat.js", "api/analyze-file.js", "lib/gemini.js", "lib/education-standards.js", "lib/public-config.js", "lib/supabase-auth.js"]) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr}`);
}

const env = await readFile(resolve(root, ".env.example"), "utf8");
if (/AIza[\w-]{20,}/.test(env)) throw new Error("Potential real API key found in .env.example");
const appSource = await readFile(resolve(root, "assets/app.js"), "utf8");
if (!appSource.includes("AI belum diaktifkan") || !appSource.includes("kepsek_documents")) {
  throw new Error("AI paused state or isolated Supabase tables are missing");
}
if (appSource.includes("data-lucide") || appSource.includes("lucide@") || !appSource.includes("iconPaths")) {
  throw new Error("Icons must use the bundled inline SVG renderer");
}
if (/priceCard|#harga|Paket sekolah|Mulai paket/i.test(appSource)) {
  throw new Error("Pricing and package purchase UI must remain removed");
}
for (const expected of ['value="Negeri"', 'value="Swasta"', "status: values.status", "data-theme-toggle", "missingFields", "consistencyChecks"]) {
  if (!appSource.includes(expected)) throw new Error(`Missing onboarding, theme, or AI review requirement: ${expected}`);
}
for (const expected of ["SESSION_IDLE_MS", 'signOut({ scope:"local" })', "parseDocumentBlocks", "document-preview", "templateSourceId", "qualityScore", "standardReferences"]) {
  if (!appSource.includes(expected)) throw new Error(`Missing session, formatted document, template, or quality requirement: ${expected}`);
}

const generateSource = await readFile(resolve(root,"api/generate.js"),"utf8");
for (const expected of ["generateGroundedText", "reviewDocument", "responseSchema", "standardsContext", "validateGeneratedDocument", "evidence-template-standards-independent-review-v3"]) {
  if (!generateSource.includes(expected)) throw new Error(`Missing high-quality generation pipeline requirement: ${expected}`);
}

for (const file of ["package.json", "vercel.json", "manifest.webmanifest"]) {
  JSON.parse(await readFile(resolve(root, file), "utf8"));
}

const vercel = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
if (vercel.framework !== null || vercel.outputDirectory !== "." || vercel.functions) throw new Error("Vercel must use the Other preset, root output, and no stale functions glob");
for (const route of ["/auth","/onboarding","/dashboard","/calendar","/profile","/documents","/documents/:path*","/ai","/assistant","/team","/templates","/guide","/more","/join"]) {
  if (!vercel.rewrites?.some((rewrite) => rewrite.source === route && rewrite.destination === "/")) {
    throw new Error(`Missing SPA rewrite for ${route}`);
  }
}

for (const expected of ["renderCalendar", "handleAgendaSubmit", "loadAgendasForYear", "data-add-agenda", "data-edit-agenda", "ai-steps"]) {
  if (!appSource.includes(expected)) throw new Error(`Missing annual agenda or simplified AI workflow: ${expected}`);
}
for (const expected of ["renderAssistant", "handleAssistantSubmit", "kepsek_assistant_messages", "data-clear-assistant", "/api/chat"]) {
  if (!appSource.includes(expected)) throw new Error(`Missing Asisten Kepsek requirement: ${expected}`);
}
for (const expected of ["renderTeam", "kepsek_workspace_invites", "renderTemplates", "driveLibrary", "renderGuide", "kepsek_claim_workspace_invite"]) {
  if (!appSource.includes(expected)) throw new Error(`Missing team, Drive library, or guide requirement: ${expected}`);
}

const logo = await readFile(resolve(root, "assets/bantu-beres-symbol.png"));
if (logo.length < 10_000 || logo.subarray(1,4).toString("ascii") !== "PNG") throw new Error("Transparent Bantu Beres PNG logo is missing or invalid");

const html = await readFile(resolve(root, "index.html"), "utf8");
if (!html.includes('lang="id"') || !html.includes('name="viewport"')) {
  throw new Error("index.html is missing required localization or viewport metadata");
}

console.log(`Verified ${required.length} required files and JavaScript syntax.`);
