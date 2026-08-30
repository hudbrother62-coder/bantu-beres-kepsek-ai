export async function generateGemini(prompt:string){
 const key = process.env.AQ.Ab8RN6K_mXQXaYqeDK6msYQZDToFxxkZSl2S7qk_rbZzVaDQzg;

 if(!key){
  throw new Error('Gemini API key belum diatur');
 }

 // Implementasi Gemini SDK ditempatkan di sini.
 return {
  text:'Generated response',
 }
}
