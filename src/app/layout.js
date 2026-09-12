import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'ZakatKu',
  description: 'Aplikasi Penerimaan & Penyaluran Zakat',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-orange-50 min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  )
}