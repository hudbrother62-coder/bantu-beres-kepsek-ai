import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "index.html",
  "assets/styles.css",
  "assets/app.js",
  "assets/bantu-beres-logo.jpg",
  "manifest.webmanifest",
  "api/config.js",
  "api/health.js",
  "api/generate.js",
  "api/analyze-file.js",
  "lib/gemini.js",
  "lib/supabase-auth.js",
  "lib/public-config.js",
  "supabase/migrations/20260902143000_kepsek_workspace_v1.sql",
  "vercel.json",
];

for (const file of required) await access(resolve(root, file));

for (const file of ["assets/app.js", "api/config.js", "api/health.js", "api/generate.js", "api/analyze-file.js", "lib/gemini.js", "lib/public-config.js", "lib/supabase-auth.js"]) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr}`);
}

const env = await readFile(resolve(root, ".env.example"), "utf8");
if (/AIza[\w-]{20,}/.test(env)) throw new Error("Potential real API key found in .env.example");
const appSource = await readFile(resolve(root, "assets/app.js"), "utf8");
if (!appSource.includes("AI belum diaktifkan") || !appSource.includes("kepsek_documents")) {
  throw new Error("AI paused state or isolated Supabase tables are missing");
}

for (const file of ["package.json", "vercel.json", "manifest.webmanifest"]) {
  JSON.parse(await readFile(resolve(root, file), "utf8"));
}

const vercel = JSON.parse(await readFile(resolve(root, "vercel.json"), "utf8"));
if (vercel.framework !== null || vercel.outputDirectory !== "." || vercel.functions) throw new Error("Vercel must use the Other preset, root output, and no stale functions glob");
for (const route of ["/auth","/onboarding","/dashboard","/profile","/documents","/documents/:path*","/ai"]) {
  if (!vercel.rewrites?.some((rewrite) => rewrite.source === route && rewrite.destination === "/")) {
    throw new Error(`Missing SPA rewrite for ${route}`);
  }
}

const logo = await readFile(resolve(root, "assets/bantu-beres-logo.jpg"));
const logoHash = createHash("sha256").update(logo).digest("hex");
if (logoHash !== "457ce3c58a6616300c03b846b856cd6efb5a9fff54226ea28fd528bf9276b7a6") {
  throw new Error("The approved Bantu Beres logo was changed");
}

const html = await readFile(resolve(root, "index.html"), "utf8");
if (!html.includes('lang="id"') || !html.includes('name="viewport"')) {
  throw new Error("index.html is missing required localization or viewport metadata");
}

console.log(`Verified ${required.length} required files and JavaScript syntax.`);
