'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menu = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/muzakki', label: '👥 Muzakki' },
  { href: '/mustahik', label: '🤲 Mustahik' },
  { href: '/penerimaan', label: '📥 Penerimaan' },
]

export default function Navbar() {
  const path = usePathname()

  return (
    <nav className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          🕌 ZakatKu
        </Link>
        <div className="flex gap-1">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                path === m.href
                  ? 'bg-emerald-900 font-semibold'
                  : 'hover:bg-emerald-600'
              }`}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}