export default function Dashboard(){
 return (
  <main className="p-8">
   <h1 className="text-3xl font-bold">Dashboard Kepala Sekolah</h1>
   <div className="mt-6 grid md:grid-cols-3 gap-4">
    <div className="bg-white p-5 rounded-xl">Administrasi 81%</div>
    <div className="bg-white p-5 rounded-xl">34 Dokumen</div>
    <div className="bg-white p-5 rounded-xl">5 Perlu perhatian</div>
   </div>
  </main>
 )
}