const ROOT="https://api.groq.com/openai/v1";
const TEXT=["openai/gpt-oss-120b","qwen/qwen3.8-27b","openai/gpt-oss-20b","meta-models/muse-spark-open","llama-3.3-70b-versatile","llama-3.1-8b-instant"];
const VISION=["qwen/qwen3.8-27b","meta-models/muse-spark-open","qwen/qwen3.6-27b"];
const CACHE=new Map();
export function validGroqKey(x){const k=String(x||"").trim();return /^gsk_[A-Za-z0-9_-]{20,}$/.test(k)?k:"";}
export function configuredKeys(){
  return [...new Set([process.env.GROQ_API_KEY_1||process.env.GROQ_API_KEY,process.env.GROQ_API_KEY_2,process.env.GROQ_API_KEY_3].map(validGroqKey).filter(Boolean))];
}
export function keyCount(){return configuredKeys().length;}
export async function testGroqKey(key){
  const k=validGroqKey(key);
  if(!k)throw Object.assign(new Error("Masukkan API key GroqCloud diawali gsk_."),{status:400});
  const models=await modelsFor(k,false);
  return {provider:"groq",model:models[0],modelSelection:"automatic"};
}
async function modelsFor(key,vision){
  let c=CACHE.get(key),ids=c?.until>Date.now()?c.ids:null;
  if(!ids){
    const r=await fetch(ROOT+"/models",{headers:{Authorization:"Bearer "+key},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw Object.assign(new Error(r.status===401||r.status===403?"API key GroqCloud ditolak.":r.status===429?"Kuota GroqCloud terbatas.":"Gagal membaca model GroqCloud."),{status:r.status});
    const p=await r.json();
    ids=new Set((p.data||[]).filter(x=>x.active!==false).map(x=>x.id));
    CACHE.set(key,{ids,until:Date.now()+300000});
  }
  const models=(vision?VISION:TEXT).filter(m=>ids.has(m));
  if(!models.length)throw Object.assign(new Error("Tidak ada model GroqCloud yang cocok untuk akun ini."),{status:503});
  return models;
}
function partsToContent(parts=[]){
  const a=[];
  for(const p of parts){
    if(typeof p.text==="string"&&p.text.trim())a.push({type:"text",text:p.text});
    if(p.inlineData){
      const mime=String(p.inlineData.mimeType||"");
      if(!/^image\/(png|jpeg|webp)$/.test(mime))throw Object.assign(new Error("GroqCloud tidak mendukung PDF mentah; simpan PDF atau unggah gambar/teks."),{status:415});
      a.push({type:"image_url",image_url:{url:"data:"+mime+";base64,"+p.inlineData.data}});
    }
  }
  return a;
}
async function invoke(key,model,messages,json,maxOutputTokens,temperature,topP){
  let r;
  try{
    r=await fetch(ROOT+"/chat/completions",{method:"POST",signal:AbortSignal.timeout(55000),
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},
      body:JSON.stringify({model,messages,temperature,top_p:topP,max_completion_tokens:Math.min(8192,Math.max(512,maxOutputTokens)),
        ...(json?{response_format:{type:"json_object"}}:{})})});
  }catch(cause){throw Object.assign(new Error("GroqCloud tidak dapat dihubungi."),{status:503});}
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(body.error?.message||"GroqCloud error "+r.status),{status:r.status});
  const text=String(body.choices?.[0]?.message?.content||"").trim();
  if(!text)throw Object.assign(new Error("Model belum memberikan teks."),{status:502});
  return {text,usage:body.usage||null};
}
function hashSeed(value){let h=2166136261;for(const c of String(value||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
async function run({seed,userKey,system,parts,history=[],json=false,schema=null,maxOutputTokens=4096,temperature=0.2,topP=0.9}){
  const apps=configuredKeys(),shift=apps.length?hashSeed(seed)%apps.length:0;
  const candidates=[...apps.slice(shift),...apps.slice(0,shift)].map((key,i)=>({key,slot:i+1,scope:"application"}));
  if(validGroqKey(userKey))candidates.push({key:validGroqKey(userKey),slot:"personal",scope:"personal"});
  if(!candidates.length)throw Object.assign(new Error("API key GroqCloud belum diatur."),{status:503,publicMessage:"Buka Pengaturan AI untuk memasukkan key GroqCloud (gsk_)."});
  const content=partsToContent(parts),vision=content.some(x=>x.type==="image_url");
  const messages=[{role:"system",content:String(system||"")+(schema?"\nKeluarkan JSON valid sesuai skema: "+JSON.stringify(schema):"")},
    ...history.map(x=>({role:x.role==="assistant"?"assistant":"user",content:x.content})),
    {role:"user",content:vision?content:content.map(x=>x.text||"").join("\n\n")}];
  let lastError,tries=0;
  for(const item of candidates){
    let models;
    try{models=await modelsFor(item.key,vision);}catch(cause){lastError=cause;continue;}
    for(const model of models){
      tries++;
      try{
        const a=await invoke(item.key,model,messages,json,maxOutputTokens,temperature,topP);
        return {...a,metadata:{model,keySlot:item.slot,keyScope:item.scope,attempts:tries,usage:a.usage}};
      }catch(cause){lastError=cause;if(![400,404,408,429,500,502,503,504].includes(Number(cause.status)))break;}
    }
  }
  const status=lastError?.status===429?429:503;
  throw Object.assign(new Error(lastError?.message||"Layanan GroqCloud belum tersedia."),{status,publicMessage:status===429?"Kuota GroqCloud sedang penuh. Gunakan key lain atau coba kembali.":"Layanan GroqCloud belum tersedia. Periksa key dan model di Pengaturan AI."});
}
function parseJson(text){
  const cleaned=String(text||"").trim();
  try{return JSON.parse(cleaned);}catch{
    const a=cleaned.indexOf("{"),b=cleaned.lastIndexOf("}");
    if(a>=0&&b>a){try{return JSON.parse(cleaned.slice(a,b+1));}catch{}}
    return {title:"Dokumen Sekolah",summary:"Perlu peninjauan",content:cleaned,assumptions:[],sources:[]};
  }
}
export async function generateStructured({systemInstruction,parts,seed="document",maxOutputTokens=8192,responseSchema,temperature=0.2,topP=0.9,userKey=""}){
  const r=await run({seed,userKey,system:systemInstruction,parts,json:true,schema:responseSchema,temperature,topP,maxOutputTokens});
  return {...parseJson(r.text),metadata:r.metadata};
}
export async function generateGroundedText({systemInstruction,prompt,seed="standards",maxOutputTokens=3072,temperature=0.1,userKey=""}){
  const r=await run({seed,userKey,system:systemInstruction+"\nTidak ada pencarian web real-time. Jangan mengaku telah memverifikasi sumber terkini.",parts:[{text:prompt}],temperature,maxOutputTokens});
  return {text:r.text,sources:[],metadata:r.metadata};
}
export async function generateConversation({systemInstruction,history=[],message,seed="conversation",maxOutputTokens=4096,userKey=""}){
  const h=history.slice(-16).map(x=>({role:x.role==="assistant"||x.role==="model"?"assistant":"user",content:String(x.content||"").slice(0,8000)})).filter(x=>x.content.trim());
  const r=await run({seed,userKey,system:systemInstruction,history:h,parts:[{text:message}],temperature:0.55,topP:0.92,maxOutputTokens});
  return {reply:r.text,metadata:r.metadata};
}
