import { deleteUserGroqKey, saveUserGroqKey, userKeyStatus } from "../lib/user-ai-key.js";
import { testGroqKey } from "../lib/groq.js";
import { jsonBody, requireUser, sendError } from "../lib/supabase-auth.js";

export default async function handler(request,response) {
  response.setHeader("Cache-Control","no-store, max-age=0");
  try {
    const {user,token}=await requireUser(request);
    if(request.method==="GET")return response.status(200).json({providers:await userKeyStatus(token,user.id)});
    if(request.method==="DELETE"){await deleteUserGroqKey(token,user.id);return response.status(200).json({ok:true});}
    if(request.method!=="POST")return response.status(405).json({error:"Metode tidak diizinkan."});
    const key=String(jsonBody(request,2000).apiKey||"").trim();
    const status=await testGroqKey(key);
    await saveUserGroqKey(token,user.id,key);
    return response.status(200).json({ok:true,provider:"groq",model:status.model,modelSelection:"automatic",keyHint:key.slice(0,4)+"••••"+key.slice(-4)});
  }catch(cause){return sendError(response,cause);}
}
