'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const menu = [
  { href: '/', label: '🏠 Dashboard' },
  { href: '/muzakki', label: '👥 Muzakki' },
  { href: '/penerimaan', label: '📥 Penerimaan' },
  { href: '/mustahik', label: '🤲 Mustahik' },
  { href: '/penyaluran', label: '📤 Penyaluran' },
  { href: '/kas-masjid', label: '🕌 Kas Masjid' },
]

export default function Navbar() {
  const path = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Sembunyikan navbar di halaman login
  if (path === '/login') return null

  return (
    <nav className="bg-emerald-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="font-bold text-lg flex-shrink-0">
          🕌 ZakatKu
        </Link>

        <div className="flex gap-1 flex-wrap flex-1 justify-center">
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

        {user && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-600 text-sm"
            >
              <span className="hidden md:inline">{profile?.full_name || user.email}</span>
              <span className="inline-block w-2 h-2 bg-emerald-300 rounded-full"></span>
              <span className="text-xs opacity-75 hidden md:inline">▼</span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 w-56 z-50">
                <div className="p-3 border-b border-slate-200">
                  <p className="font-medium text-sm">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <p className="text-xs text-emerald-700 mt-1 uppercase font-medium">
                    {profile?.role || 'user'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}