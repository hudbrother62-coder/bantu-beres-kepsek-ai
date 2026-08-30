export async function generateGemini(prompt:string){
 const key = process.env.GEMINI_API_KEY_1;

 if(!key){
  throw new Error('Gemini API key belum diatur');
 }

 // Implementasi Gemini SDK ditempatkan di sini.
 return {
  text:'Generated response',
 }
}