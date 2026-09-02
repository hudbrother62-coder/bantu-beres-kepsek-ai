import test from "node:test";
import assert from "node:assert/strict";
import configHandler from "../api/config.js";
import healthHandler from "../api/health.js";
import generateHandler from "../api/generate.js";

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
