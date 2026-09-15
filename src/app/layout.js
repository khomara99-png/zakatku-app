import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'ZakatKu - DKM Nurul Huda',
  description: 'Aplikasi Penerimaan & Penyaluran Zakat Fitrah',
  manifest: '/manifest.json',
  themeColor: '#10B981',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZakatKu',
  },
  icons: {
    icon: '/zakatku-logo.png',
    apple: '/zakatku-logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/zakatku-logo.png" />
        <link rel="apple-touch-icon" href="/zakatku-logo.png" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ZakatKu" />
      </head>
      <body className="bg-slate-50 min-h-screen">
        <Navbar />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registered:', registration.scope);
                    },
                    function(err) {
                      console.log('Service Worker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}