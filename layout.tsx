import './globals.css'

export const metadata = {
 title: 'BantuBeres Kepsek AI',
 description: 'Asisten administrasi sekolah berbasis AI'
}

export default function RootLayout({children}:{children:React.ReactNode}){
 return (
  <html lang="id">
   <body>{children}</body>
  </html>
 )
}