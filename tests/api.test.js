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

test("config never exposes Groq secrets", () => {
  const response=responseMock();
  configHandler({method:"GET"},response);
  assert.equal(response.statusCode,200);
  assert.equal(response.payload.aiProvider,"groq");
  assert.equal(response.payload.aiModel,"automatic");
  assert.equal("groqKey" in response.payload,false);
  assert.equal(response.headers["Cache-Control"],"no-store, max-age=0");
});

test("health reports Groq status without exposing secrets", () => {
  const response=responseMock();
  healthHandler({method:"GET"},response);
  assert.equal(response.statusCode,200);
  assert.equal(response.payload.ok,true);
  assert.equal(response.payload.services.supabase,true);
  assert.equal(typeof response.payload.services.groqKeyCount,"number");
  assert.equal(response.payload.services.modelSelection,"automatic");
});

test("generate endpoint requires an authenticated user", async () => {
  const response=responseMock();
  await generateHandler({method:"POST",headers:{},body:{type:"ksp",prompt:"Susun dokumen",context:{}}},response);
  assert.equal(response.statusCode,401);
});

test("assistant endpoint requires an authenticated user", async () => {
  const response=responseMock();
  await chatHandler({method:"POST",headers:{},body:{schoolId:"school",message:"Halo"}},response);
  assert.equal(response.statusCode,401);
});

test("Groq configuration recognizes GROQ_API_KEY_1", () => {
  const original=process.env.GROQ_API_KEY_1;
  process.env.GROQ_API_KEY_1="gsk_testlongvalidkeywiththirtycharacters123";
  try{assert.ok(keyCount()>=1);}finally{
    if(original===undefined)delete process.env.GROQ_API_KEY_1;
    else process.env.GROQ_API_KEY_1=original;
  }
});

function withGroqMock(responseText,check) {
  const originalFetch=globalThis.fetch, originalKey=process.env.GROQ_API_KEY_1;
  const key="gsk_distincttestkeyforautomaticmodel12345";
  process.env.GROQ_API_KEY_1=key;
  const calls=[];
  globalThis.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).endsWith("/models"))return new Response(JSON.stringify({data:[
      {id:"llama-3.3-70b-versatile",active:true},
      {id:"llama-3.1-8b-instant",active:true}
    ]}),{status:200,headers:{"Content-Type":"application/json"}});
    return new Response(JSON.stringify({choices:[{message:{content:responseText}}],usage:{total_tokens:15}}),{status:200,headers:{"Content-Type":"application/json"}});
  };
  return async (invoke)=>{
    try{const result=await invoke();check(result,calls,key);}
    finally{globalThis.fetch=originalFetch;
      if(originalKey===undefined)delete process.env.GROQ_API_KEY_1;else process.env.GROQ_API_KEY_1=originalKey;}
  };
}

test("conversation calls GroqCloud chat completions and preserves roles",async()=>{
  const run=withGroqMock("Jawaban jelas.",(result,calls,key)=>{
    assert.equal(result.reply,"Jawaban jelas.");
    const post=calls.find(c=>c.url.endsWith("/chat/completions"));
    assert.ok(post);
    assert.equal(post.options.headers.Authorization,"Bearer "+key);
    const body=JSON.parse(post.options.body);
    assert.equal(body.model,"llama-3.3-70b-versatile");
    assert.deepEqual(body.messages.map(x=>x.role),["system","user","assistant","user"]);
  });
  await run(()=>generateConversation({systemInstruction:"Jawab jelas.",history:[
    {role:"user",content:"Satu"},{role:"assistant",content:"Dua"}],message:"Tiga",seed:"test"}));
});

test("structured output requests JSON from Groq and includes schema instructions",async()=>{
  const run=withGroqMock('{"title":"Dokumen","content":"Isi"}',(result,calls)=>{
    assert.equal(result.title,"Dokumen");
    const body=JSON.parse(calls.find(c=>c.url.endsWith("/chat/completions")).options.body);
    assert.equal(body.response_format.type,"json_object");
    assert.match(body.messages[0].content,/title/);
  });
  const schema={type:"object",properties:{title:{type:"string"},content:{type:"string"}},required:["title","content"]};
  await run(()=>generateStructured({systemInstruction:"Susun JSON.",parts:[{text:"Isi"}],responseSchema:schema}));
});

test("standards review does not falsely claim real-time Google Search grounding",async()=>{
  const run=withGroqMock("Perlu cek regulasi resmi.",(result,calls)=>{
    assert.deepEqual(result.sources,[]);
    const body=JSON.parse(calls.find(c=>c.url.endsWith("/chat/completions")).options.body);
    assert.equal("tools" in body,false);
    assert.match(body.messages[0].content,/tidak ada pencarian web real-time/i);
  });
  await run(()=>generateGroundedText({systemInstruction:"Periksa.",prompt:"Periksa acuan."}));
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
