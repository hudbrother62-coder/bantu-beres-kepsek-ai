import { NextResponse } from 'next/server';

export async function POST(req:Request){
 const body = await req.json();

 // Gemini API dipanggil di sini.
 // API key diambil dari server environment variable.

 return NextResponse.json({
   success:true,
   message:"AI Gateway siap dihubungkan ke Gemini",
   input:body
 });
}