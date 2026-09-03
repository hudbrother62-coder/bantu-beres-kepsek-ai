import test from "node:test";
import assert from "node:assert/strict";
import configHandler from "../api/config.js";
import healthHandler from "../api/health.js";
import generateHandler from "../api/generate.js";
import chatHandler from "../api/chat.js";
import { generateConversation, keyCount } from "../lib/gemini.js";

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
