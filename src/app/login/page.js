'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const USERS = [
  { email: 'admin@zakatku.local', password: 'Admin123!', name: 'Administrator', role: 'admin' },
  { email: 'amil@zakatku.local', password: 'Amil123!', name: 'Amil Masjid', role: 'amil' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Delay kecil biar terasa natural
    setTimeout(() => {
      const user = USERS.find(
        (u) => u.email === email.trim() && u.password === password
      )

      if (!user) {
        setError('Email atau password salah')
        setLoading(false)
        return
      }

      // Simpan session di localStorage
      localStorage.setItem(
        'zakatku_user',
        JSON.stringify({ email: user.email, name: user.name, role: user.role })
      )

      router.push('/')
      router.refresh()
    }, 500)
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🕌</div>
          <h1 className="text-2xl font-bold text-slate-800">ZakatKu</h1>
          <p className="text-slate-500 text-sm mt-1">Silakan login untuk melanjutkan</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@zakatku.local"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-2.5 rounded-lg font-medium transition"
          >
            {loading ? 'Memproses...' : '🔐 Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center">
            Testing mode — login lokal
          </p>
        </div>
      </div>
    </div>
  )
}