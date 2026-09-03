import test from "node:test";
import assert from "node:assert/strict";
import configHandler from "../api/config.js";
import healthHandler from "../api/health.js";
import generateHandler from "../api/generate.js";
import chatHandler from "../api/chat.js";
import { generateConversation, generateGroundedText, generateStructured, keyCount } from "../lib/gemini.js";
import { selectRelevantSources, validateGeneratedDocument } from "../api/generate.js";
import { cleanDocumentText, documentStatistics, parseDocumentBlocks } from "../assets/document-format.js";
import { standardsFor, STANDARDS_VERIFIED_AT } from "../lib/education-standards.js";
import { isIdleSession, SESSION_IDLE_MS } from "../assets/session-policy.js";
import { containsVisibleAiMarkup, renderAiText } from "../assets/ai-text-format.js";

function responseMock() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test("config never exposes Gemini secrets", () => {
  const response = responseMock();
  configHandler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.equal("geminiKey" in response.payload, false);
  assert.equal(response.payload.configured, true);
  assert.equal(response.payload.aiConfigured, false);
  assert.equal(response.headers["Cache-Control"], "no-store, max-age=0");
});

test("health reports service configuration without secret values", () => {
  const response = responseMock();
  healthHandler({ method: "GET" }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.ok, true);
  assert.equal(response.payload.services.supabase, true);
  assert.equal(typeof response.payload.services.geminiKeyCount, "number");
});

test("generate endpoint requires an authenticated user", async () => {
  const response = responseMock();
  await generateHandler({ method: "POST", headers: {}, body: { type: "ksp", prompt: "Susun dokumen sekolah", context: {} } }, response);
  assert.equal(response.statusCode, 401);
  assert.match(response.payload.error, /masuk/i);
});

test("assistant endpoint requires an authenticated user", async () => {
  const response = responseMock();
  await chatHandler({ method: "POST", headers: {}, body: { schoolId: "school", message: "Halo" } }, response);
  assert.equal(response.statusCode, 401);
  assert.match(response.payload.error, /masuk/i);
});

test("Gemini configuration recognizes supported environment aliases", () => {
  const before = process.env.GEMINI_KEY_1;
  process.env.GEMINI_KEY_1 = "test-key-with-more-than-twenty-characters";
  assert.equal(keyCount(), 1);
  if (before === undefined) delete process.env.GEMINI_KEY_1;
  else process.env.GEMINI_KEY_1 = before;
});

test("conversation sends server-side Gemini key and returns model text", async () => {
  const beforeKey = process.env.GEMINI_KEY_1;
  const beforeFetch = globalThis.fetch;
  let captured;
  process.env.GEMINI_KEY_1 = "test-key-with-more-than-twenty-characters";
  globalThis.fetch = async (url, options) => {
    captured = { url:String(url), options, body:JSON.parse(options.body) };
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "Jawaban yang jelas." }] } }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4 },
    }), { status:200, headers:{ "Content-Type":"application/json" } });
  };
  try {
    const result = await generateConversation({
      systemInstruction: "Jawab jelas.",
      history: [{ role:"user", content:"Pertanyaan sebelumnya" }, { role:"assistant", content:"Jawaban sebelumnya" }],
      message: "Pertanyaan baru",
      seed: "test",
    });
    assert.equal(result.reply, "Jawaban yang jelas.");
    assert.match(captured.url, /gemini-3\.7-flash:generateContent/);
    assert.equal(captured.options.headers["x-goog-api-key"], process.env.GEMINI_KEY_1);
    assert.deepEqual(captured.body.contents.map((item) => item.role), ["user","model","user"]);
  } finally {
    globalThis.fetch = beforeFetch;
    if (beforeKey === undefined) delete process.env.GEMINI_KEY_1;
    else process.env.GEMINI_KEY_1 = beforeKey;
  }
});

test("structured generation sends an explicit JSON schema to Gemini", async () => {
  const beforeKey = process.env.GEMINI_KEY_1;
  const beforeFetch = globalThis.fetch;
  let body;
  process.env.GEMINI_KEY_1 = "test-key-with-more-than-twenty-characters";
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(JSON.stringify({ candidates:[{ content:{ parts:[{ text:'{"title":"Dokumen","content":"Isi"}' }] } }] }),{ status:200,headers:{ "Content-Type":"application/json" } });
  };
  try {
    const schema = { type:"object",properties:{ title:{ type:"string" },content:{ type:"string" } },required:["title","content"] };
    const result = await generateStructured({ systemInstruction:"Susun.",parts:[{ text:"Isi" }],responseSchema:schema });
    assert.equal(result.title,"Dokumen");
    assert.deepEqual(body.generationConfig.responseSchema,schema);
    assert.equal(body.generationConfig.responseMimeType,"application/json");
  } finally {
    globalThis.fetch = beforeFetch;
    if (beforeKey === undefined) delete process.env.GEMINI_KEY_1; else process.env.GEMINI_KEY_1 = beforeKey;
  }
});

test("grounded standards check enables Google Search without exposing the key", async () => {
  const beforeKey = process.env.GEMINI_KEY_1;
  const beforeFetch = globalThis.fetch;
  let captured;
  process.env.GEMINI_KEY_1 = "test-key-with-more-than-twenty-characters";
  globalThis.fetch = async (url,options) => {
    captured = { url:String(url),headers:options.headers,body:JSON.parse(options.body) };
    return new Response(JSON.stringify({ candidates:[{ content:{ parts:[{ text:"Acuan resmi terverifikasi." }] },groundingMetadata:{ groundingChunks:[{ web:{ title:"BPK",uri:"https://peraturan.bpk.go.id/" } }] } }] }),{ status:200,headers:{ "Content-Type":"application/json" } });
  };
  try {
    const result = await generateGroundedText({ systemInstruction:"Periksa.",prompt:"Periksa acuan." });
    assert.deepEqual(captured.body.tools,[{ googleSearch:{} }]);
    assert.equal(captured.headers["x-goog-api-key"],process.env.GEMINI_KEY_1);
    assert.equal(result.sources[0].title,"BPK");
  } finally {
    globalThis.fetch = beforeFetch;
    if (beforeKey === undefined) delete process.env.GEMINI_KEY_1; else process.env.GEMINI_KEY_1 = beforeKey;
  }
});

test("uploaded templates are prioritized over unrelated recent files", () => {
  const selected = selectRelevantSources([
    { name:"Catatan rapat baru.txt",summary:"umum",extracted_text:"isi",created_at:"2026-09-03" },
    { name:"Template KSP Resmi Sekolah.docx",summary:"format kurikulum",extracted_text:"struktur",created_at:"2025-01-01",status:"ready" },
  ],"ksp");
  assert.equal(selected[0].name,"Template KSP Resmi Sekolah.docx");
});

test("document formatter removes visible Markdown symbols and preserves tables", () => {
  const sample = "# KSP SEKOLAH\n\n**Nama:** SD Contoh\n\n| Program | Target |\n|---|---|\n| Literasi | 90% |";
  const blocks = parseDocumentBlocks(sample);
  assert.equal(blocks.some((block) => block.type === "table"),true);
  assert.equal(cleanDocumentText(sample).includes("**"),false);
  assert.deepEqual(documentStatistics(sample),{ characters:61,headings:1,tables:1,placeholders:0 });
});

test("quality gate rejects short AI-looking drafts", () => {
  const quality = validateGeneratedDocument({ content:"# DRAFT\n\nSebagai AI, berikut kerangka singkat." },"ksp");
  assert.equal(quality.shouldRefine,true);
  assert.ok(quality.score < 82);
  assert.ok(quality.checks.some((check) => check.label === "Kebersihan hasil" && check.status === "warning"));
});

test("education standards registry is versioned and uses official sources", () => {
  assert.match(STANDARDS_VERIFIED_AT,/^\d{4}-\d{2}-\d{2}$/);
  const ksp = standardsFor("ksp");
  assert.ok(ksp.length >= 8);
  assert.ok(ksp.every((item) => /^https:\/\/(?:[^/]+\.)?(?:go\.id|kemendikdasmen\.go\.id)/.test(item.url)));
});

test("session remains active for two hours and expires after inactivity", () => {
  const now = Date.now();
  assert.equal(isIdleSession(now - SESSION_IDLE_MS,now,true),false);
  assert.equal(isIdleSession(now - SESSION_IDLE_MS - 1,now,true),true);
  assert.equal(isIdleSession(now - SESSION_IDLE_MS - 1,now,false),false);
});

test("assistant formatter removes raw AI markers and renders readable structure", () => {
  const raw = '* 1. "**10 Menit Siap Belajar**"\n* **Bentuk:** Pembiasaan kelas\n\n### Langkah\n- Rapikan meja\n- Siapkan buku';
  const rendered = renderAiText(raw);
  assert.match(rendered, /<ol>/);
  assert.match(rendered, /<strong>10 Menit Siap Belajar<\/strong>/);
  assert.match(rendered, /<h3>Langkah<\/h3>/);
  assert.match(rendered, /<ul>/);
  assert.equal(/\*\*|###|>\*/.test(rendered), false);
  assert.equal(containsVisibleAiMarkup(raw), true);
});

test("assistant formatter escapes model HTML and keeps arithmetic stars", () => {
  const rendered = renderAiText("Nilai: 2 * 3 = 6\n\n<script>alert(1)</script>");
  assert.match(rendered, /2 \* 3 = 6/);
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /&lt;script&gt;/);
});
