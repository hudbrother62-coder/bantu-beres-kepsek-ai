const ROOT="https://api.groq.com/openai/v1";
const TEXT=["openai/gpt-oss-120b","openai/gpt-oss-20b","qwen/qwen3.8-27b","meta-models/muse-spark-open"];
const VISION=["qwen/qwen3.8-27b"];
const CACHE=new Map();
const COOLDOWNS=new Map();
function retryAfterMs(v){if(!v)return 0;const n=Number(v);if(Number.isFinite(n))return Math.max(0,Math.min(300000,n*1000));const t=Date.parse(v);return Number.isFinite(t)?Math.max(0,Math.min(300000,t-Date.now())):0;}
export function validGroqKey(x){const k=String(x||"").trim();return /^gsk_[A-Za-z0-9_-]{20,}$/.test(k)?k:"";}
export function configuredKeys(){
  return [...new Set([process.env.GROQ_API_KEY_1,process.env.GROQ_API_KEY,process.env.GROQ_API_KEY_2,process.env.GROQ_API_KEY_3].map(validGroqKey).filter(Boolean))];
}
export function keyCount(){return configuredKeys().length;}
export async function testGroqKey(key){
  const k=validGroqKey(key);
  if(!k)throw Object.assign(new Error("Masukkan API key GroqCloud diawali gsk_."),{status:400});
  const result=await run({
    userKey:k, personalOnly:true, json:true, maxOutputTokens:128,
    system:"Balas dengan satu objek JSON.",
    parts:[{text:'Kembalikan {"ok":true}.'}],
  });
  return {provider:"groq",model:result.metadata.model,modelSelection:"automatic"};
}
async function modelsFor(key,vision){
  let c=CACHE.get(key),ids=c?.until>Date.now()?c.ids:null;
  if(!ids){
    const r=await fetch(ROOT+"/models",{headers:{Authorization:"Bearer "+key},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw Object.assign(new Error(r.status===401||r.status===403?"API key GroqCloud ditolak.":r.status===429?"Kuota GroqCloud terbatas.":"Gagal membaca model GroqCloud."),{status:r.status,retryAfterMs:retryAfterMs(r.headers.get("retry-after"))});
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
    r=await fetch(ROOT+"/chat/completions",{method:"POST",signal:AbortSignal.timeout(95000),
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},
      body:JSON.stringify({model,messages,temperature,top_p:topP,max_completion_tokens:Math.min(5500,Math.max(128,maxOutputTokens)),
        ...(model.startsWith("openai/gpt-oss-")?{reasoning_effort:"low"}:{}),
        ...(json?{response_format:{type:"json_object"}}:{})})});
  }catch(cause){throw Object.assign(new Error("GroqCloud tidak dapat dihubungi."),{status:503});}
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error("GroqCloud HTTP "+r.status),{status:r.status,providerCode:body.error?.code,retryAfterMs:retryAfterMs(r.headers.get("retry-after"))});
  const text=String(body.choices?.[0]?.message?.content||"").trim();
  if(json){
    try{
      const parsed=JSON.parse(text);
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||body.choices?.[0]?.finish_reason==="length")throw new Error();
    }catch{
      throw Object.assign(new Error("Model mengembalikan JSON yang tidak lengkap atau tidak valid."),{status:502,providerCode:"invalid_json"});
    }
  }
  if(!text)throw Object.assign(new Error("Model belum memberikan teks."),{status:502});
  return {text,usage:body.usage||null};
}
function hashSeed(value){let h=2166136261;for(const c of String(value||"")){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
async function run({seed,userKey,personalOnly=false,system,parts,history=[],json=false,schema=null,maxOutputTokens=4096,temperature=0.2,topP=0.9}){
  const apps=personalOnly?[]:configuredKeys(),shift=apps.length?hashSeed(seed)%apps.length:0;
  const candidates=[...apps.slice(shift),...apps.slice(0,shift)].map((key,i)=>({key,slot:i+1,scope:"application"}));
  if(validGroqKey(userKey))candidates.push({key:validGroqKey(userKey),slot:"personal",scope:"personal"});
  if(!candidates.length)throw Object.assign(new Error("API key GroqCloud belum diatur."),{status:503,publicMessage:"Buka Pengaturan AI untuk memasukkan key GroqCloud (gsk_)."});
  const content=partsToContent(parts),vision=content.some(x=>x.type==="image_url");
  const messages=[{role:"system",content:String(system||"")+(schema?"\nKeluarkan JSON valid sesuai skema: "+JSON.stringify(schema):"")},
    ...history.map(x=>({role:x.role==="assistant"?"assistant":"user",content:x.content})),
    {role:"user",content:vision?content:content.map(x=>x.text||"").join("\n\n")}];
  let lastError,tries=0,rateLimited=false,minWait=Infinity;
  const failures=new Set();
  // Different models may have separate token limits; do not stop at the first 429.
  for(let pass=0;pass<2;pass++){
    if(pass){
      if(!rateLimited||minWait>20000)break;
      await new Promise(resolve=>setTimeout(resolve,Math.max(1000,minWait)));
    }
    rateLimited=false;
    minWait=Infinity;
    for(const item of candidates){
      let models;
      try{models=await modelsFor(item.key,vision);}
      catch(cause){
        lastError=cause;failures.add(cause.status);
        if(cause.status===429){rateLimited=true;minWait=Math.min(minWait,cause.retryAfterMs||15000);}
        continue;
      }
      for(const model of models){
        const cacheId=item.key+"|"+model;
        const remaining=(COOLDOWNS.get(cacheId)||0)-Date.now();
        if(remaining>0){rateLimited=true;minWait=Math.min(minWait,remaining);continue;}
        tries++;
        try{
          const a=await invoke(item.key,model,messages,json,maxOutputTokens,temperature,topP);
          COOLDOWNS.delete(cacheId);
          return {...a,metadata:{model,keySlot:item.slot,keyScope:item.scope,attempts:tries,usage:a.usage}};
        }catch(cause){
          lastError=cause;failures.add(cause.status);
          console.warn("Groq completion failed",{model,keyScope:item.scope,status:cause.status,providerCode:/^[a-z0-9_]{1,60}$/.test(cause.providerCode||"")?cause.providerCode:undefined});
          if(cause.status===429){
            const delay=Math.max(1000,cause.retryAfterMs||15000);
            COOLDOWNS.set(cacheId,Date.now()+delay);
            rateLimited=true;
            minWait=Math.min(minWait,delay);
            continue;
          }
          if(cause.status===401)break;
        }
      }
    }
  }
  if(failures.has(429)||rateLimited)throw Object.assign(new Error("GroqCloud rate limit"),{
    status:429,code:"GROQ_RATE_LIMIT",retryAfterMs:Number.isFinite(minWait)?Math.ceil(minWait):15000,
    publicMessage:"Kuota GroqCloud sedang penuh. Data yang sudah diisi tetap tersedia. Coba lagi sebentar lagi atau gunakan key pribadi di Pengaturan AI.",
  });
  if(failures.size===1&&(failures.has(401)||failures.has(403)))throw Object.assign(new Error("GroqCloud access denied"),{
    status:503,code:"GROQ_ACCESS_DENIED",
    publicMessage:validGroqKey(userKey)?"GroqCloud menolak akses key atau model. Uji key di Pengaturan AI.":"Akses GroqCloud aplikasi ditolak. Hubungi admin atau tambahkan key pribadi di Pengaturan AI.",
  });
  throw Object.assign(new Error(lastError?.message||"Layanan GroqCloud belum tersedia."),{
    status:503,code:"GROQ_GENERATION_FAILED",publicMessage:"GroqCloud gagal menyelesaikan permintaan. Coba lagi. Jika berulang, uji key di Pengaturan AI.",
  });
}
export async function generateStructured({systemInstruction,parts,seed="document",maxOutputTokens=8192,responseSchema,temperature=0.2,topP=0.9,userKey=""}){
  const r=await run({seed,userKey,system:systemInstruction,parts,json:true,schema:responseSchema,temperature,topP,maxOutputTokens});
  return {...JSON.parse(r.text),metadata:r.metadata};
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
