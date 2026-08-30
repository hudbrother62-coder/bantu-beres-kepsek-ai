export default function Home(){
 return (
  <main className="min-h-screen p-8">
   <h1 className="text-4xl font-bold text-purple-700">
    BantuBeres Kepsek AI
   </h1>
   <p className="mt-4 text-lg">
    Asisten digital Kepala Sekolah untuk administrasi, kurikulum,
    perencanaan dan dokumen sekolah.
   </p>

   <div className="grid md:grid-cols-4 gap-4 mt-8">
    {[
     'KSP Generator',
     'RKJM & RKT',
     'Administrasi Sekolah',
     'AI Assistant'
    ].map(x=>
     <div key={x} className="bg-white rounded-xl shadow p-5">
      {x}
     </div>
    )}
   </div>
  </main>
 )
}