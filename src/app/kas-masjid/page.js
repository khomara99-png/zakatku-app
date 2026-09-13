'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function KasMasjidPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tipe, setTipe] = useState('keluar')
  const [form, setForm] = useState({
    nominal: '',
    keterangan: '',
    sumber: '',
    tanggal: new Date().toISOString().slice(0, 10),
  })

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('kas_masjid')
      .select('*')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalMasuk = list
    .filter((x) => x.tipe === 'masuk')
    .reduce((s, x) => s + Number(x.nominal || 0), 0)
  const totalKeluar = list
    .filter((x) => x.tipe === 'keluar')
    .reduce((s, x) => s + Number(x.nominal || 0), 0)
  const saldo = totalMasuk - totalKeluar

  function bukaForm(tipeBaru) {
    setTipe(tipeBaru)
    setForm({
      nominal: '',
      keterangan: '',
      sumber: '',
      tanggal: new Date().toISOString().slice(0, 10),
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nominal = parseInt(form.nominal) || 0
    if (nominal <= 0) return alert('Nominal harus lebih dari 0')
    if (!form.keterangan.trim()) return alert('Keterangan wajib diisi')

    // ⭐ VALIDASI SALDO — pengeluaran tidak boleh melebihi saldo
    if (tipe === 'keluar' && nominal > saldo) {
      return alert(
        `❌ PENGELUARAN MELEBIHI SALDO!\n\n` +
        `Saldo Kas Masjid: Rp ${saldo.toLocaleString('id-ID')}\n` +
        `Pengeluaran: Rp ${nominal.toLocaleString('id-ID')}\n` +
        `Kekurangan: Rp ${(nominal - saldo).toLocaleString('id-ID')}\n\n` +
        `Silakan periksa kembali nominal.`
      )
    }

    const data = {
      tipe,
      nominal,
      keterangan: form.keterangan,
      sumber: form.sumber || (tipe === 'masuk' ? 'manual' : 'operasional'),
      tanggal: form.tanggal,
    }

    const { error } = await supabase.from('kas_masjid').insert(data)
    if (error) return alert('Gagal simpan: ' + error.message)

    setShowForm(false)
    fetchData()
    alert(tipe === 'masuk' ? '✅ Pemasukan dicatat!' : '✅ Pengeluaran dicatat!')
  }

  async function hapus(id) {
    if (!confirm('Yakin hapus transaksi ini?')) return
    const { error } = await supabase.from('kas_masjid').delete().eq('id', id)
    if (error) alert('Gagal: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  const onlyDigits = (v) => v.replace(/\D/g, '')

  const bulanIni = new Date().toISOString().slice(0, 7)
  const masukBulanIni = list
    .filter((x) => x.tipe === 'masuk' && x.tanggal?.startsWith(bulanIni))
    .reduce((s, x) => s + Number(x.nominal || 0), 0)
  const keluarBulanIni = list
    .filter((x) => x.tipe === 'keluar' && x.tanggal?.startsWith(bulanIni))
    .reduce((s, x) => s + Number(x.nominal || 0), 0)

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🕌 Kas Masjid</h1>
        <p className="text-slate-500 text-sm">
          Kelola infaq, shodaqoh, & sisa pembulatan
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Memuat...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div
              className={`rounded-xl shadow p-5 text-white ${
                saldo < 0
                  ? 'bg-gradient-to-br from-red-600 to-red-700'
                  : 'bg-gradient-to-br from-blue-600 to-blue-700'
              }`}
            >
              <p className="text-xs uppercase opacity-80">
                {saldo < 0 ? '⚠️ SALDO MINUS' : '💰 Saldo Kas Masjid'}
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-2">
                Rp {saldo.toLocaleString('id-ID')}
              </p>
              <p className="text-xs opacity-70 mt-2">
                {saldo < 0 ? 'PERLU KOREKSI DATA' : 'Total dana tersedia'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 uppercase">Total Masuk</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-700 mt-1">
                Rp {totalMasuk.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Bulan ini: Rp {masukBulanIni.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 uppercase">Total Keluar</p>
              <p className="text-xl md:text-2xl font-bold text-red-600 mt-1">
                Rp {totalKeluar.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Bulan ini: Rp {keluarBulanIni.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {saldo < 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-1">
                ⚠️ PERHATIAN: Saldo Kas Masjid MINUS
              </p>
              <p className="text-xs text-red-700">
                Ada pengeluaran yang melebihi pemasukan. Periksa data dan hapus transaksi yang salah.
                Setelah validasi aktif, pengeluaran baru tidak bisa melebihi saldo.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => bukaForm('masuk')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium"
            >
              📥 Catat Pemasukan
            </button>
            <button
              onClick={() => bukaForm('keluar')}
              disabled={saldo <= 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium"
            >
              {saldo <= 0 ? '🚫 Saldo Habis' : '📤 Catat Pengeluaran'}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b">
              <h2 className="font-semibold text-slate-700 text-sm md:text-base">
                📋 Riwayat Kas ({list.length} transaksi)
              </h2>
            </div>

            {list.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Belum ada transaksi kas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-center">Tipe</th>
                      <th className="px-3 py-2">Sumber</th>
                      <th className="px-3 py-2">Keterangan</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {list.map((x) => (
                      <tr key={x.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {x.tanggal}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              x.tipe === 'masuk'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {x.tipe === 'masuk' ? '↓ Masuk' : '↑ Keluar'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 text-xs">
                          {x.sumber || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {x.keterangan || '-'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                            x.tipe === 'masuk' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {x.tipe === 'masuk' ? '+' : '-'} Rp{' '}
                          {Number(x.nominal || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => hapus(x.id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4 text-slate-800">
              {tipe === 'masuk' ? '📥 Catat Pemasukan' : '📤 Catat Pengeluaran'}
            </h2>

            {tipe === 'keluar' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-600">Saldo tersedia:</p>
                <p className="text-lg font-bold text-blue-700">
                  Rp {saldo.toLocaleString('id-ID')}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nominal (Rp) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.nominal}
                  onChange={(e) =>
                    setForm({ ...form, nominal: onlyDigits(e.target.value) })
                  }
                  className={inputClass}
                  placeholder="Contoh: 50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sumber
                </label>
                <input
                  type="text"
                  value={form.sumber}
                  onChange={(e) => setForm({ ...form, sumber: e.target.value })}
                  className={inputClass}
                  placeholder={
                    tipe === 'masuk' ? 'Contoh: Donasi Jumat' : 'Contoh: Operasional'
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Keterangan *
                </label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) =>
                    setForm({ ...form, keterangan: e.target.value })
                  }
                  className={inputClass}
                  placeholder={
                    tipe === 'masuk'
                      ? 'Contoh: Infaq dari jamaah'
                      : 'Contoh: Beli lampu masjid'
                  }
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white px-4 py-2 rounded-lg font-medium ${
                    tipe === 'masuk'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}