import assert from "node:assert/strict";
import test from "node:test";
import { generateStructured, testGroqKey } from "../lib/groq.js";

const personalKey = "gsk_personalregressionkey0123456789";
const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

function mockGroq(t, complete) {
  const attempts = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("/models")) return Response.json({ data: models.map(id => ({ id })) });
    const body = JSON.parse(options.body);
    attempts.push({ body, authorization: options.headers.Authorization });
    return complete(body);
  });
  return attempts;
}

test("personal key verification runs an actual JSON completion and tries another model after a denial", async t => {
  const attempts = mockGroq(t, ({model}) => model === models[0]
    ? Response.json({error:{code:"model_permission_denied"}}, {status:403})
    : Response.json({choices:[{message:{content:'{"ok":true}'}}]}));
  const status = await testGroqKey(personalKey);
  assert.equal(status.model, models[1]);
  assert.deepEqual(attempts.map(({body}) => body.model), models);
  assert.ok(attempts.every(({body,authorization}) =>
    authorization === "Bearer " + personalKey && body.response_format.type === "json_object"));
});

test("structured generation retries a truncated completion instead of accepting broken JSON", async t => {
  const attempts = mockGroq(t, ({model}) => model === models[0]
    ? Response.json({choices:[{finish_reason:"length",message:{content:'{"title":'}}]})
    : Response.json({choices:[{message:{content:'{"title":"KSP"}'}}]}));
  const result = await generateStructured({
    systemInstruction:"Susun JSON.", parts:[{text:"KSP"}], userKey:personalKey,
  });
  assert.equal(result.title, "KSP");
  assert.deepEqual(attempts.map(({body}) => body.model), models);
});

test("long KSP composition caps output to protect Groq minute quota", async t => {
  const attempts = mockGroq(t, () =>
    Response.json({choices:[{message:{content:'{"title":"KSP"}'},finish_reason:"stop"}]}));
  const result = await generateStructured({
    systemInstruction:"Susun dokumen kurikulum yang lengkap.",
    parts:[{text:"KSP tahun ajaran 2026/2027"}],
    maxOutputTokens:20_000,
    userKey:personalKey,
  });
  assert.equal(result.title,"KSP");
  assert.equal(attempts.length,1);
  assert.equal(attempts[0].body.max_completion_tokens,5_500);
});

test("Groq 429 checks the next model, then returns Retry-After when all models are limited", async t => {
  const attempts = mockGroq(t, () =>
    Response.json({error:{code:"rate_limit_exceeded"}},{status:429,headers:{"retry-after":"120"}}));
  await assert.rejects(() => testGroqKey(personalKey), error =>
    error.code==="GROQ_RATE_LIMIT" && error.status===429);
  assert.equal(attempts.length,2);
});
