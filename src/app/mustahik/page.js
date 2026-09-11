'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ASNAF_LIST = [
  { value: 'fakir', label: 'Fakir' },
  { value: 'miskin', label: 'Miskin' },
  { value: 'amil', label: 'Amil' },
  { value: 'muallaf', label: 'Muallaf' },
  { value: 'riqab', label: 'Riqab' },
  { value: 'gharim', label: 'Gharim' },
  { value: 'fisabilillah', label: 'Fisabilillah' },
  { value: 'ibnu_sabil', label: 'Ibnu Sabil' },
]

export default function MustahikPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    nama: '',
    alamat: '',
    no_hp: '',
    asnaf: 'fakir',
    jumlah_jiwa: '',
    penerima_uang: true,
    penerima_beras: true,
  })

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('mustahik')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleTambah() {
    setEditing(null)
    setForm({
      nama: '',
      alamat: '',
      no_hp: '',
      asnaf: 'fakir',
      jumlah_jiwa: '',
      penerima_uang: true,
      penerima_beras: true,
    })
    setShowForm(true)
  }

  function handleEdit(item) {
    setEditing(item.id)
    setForm({
      nama: item.nama || '',
      alamat: item.alamat || '',
      no_hp: item.no_hp || '',
      asnaf: item.asnaf || 'fakir',
      jumlah_jiwa: item.jumlah_jiwa || '',
      penerima_uang: item.penerima_uang ?? true,
      penerima_beras: item.penerima_beras ?? true,
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nama.trim()) return alert('Nama wajib diisi')

    const data = {
      nama: form.nama,
      alamat: form.alamat,
      no_hp: form.no_hp,
      asnaf: form.asnaf,
      jumlah_jiwa: parseInt(form.jumlah_jiwa) || 1,
      penerima_uang: form.penerima_uang,
      penerima_beras: form.penerima_beras,
    }

    if (editing) {
      const { error } = await supabase.from('mustahik').update(data).eq('id', editing)
      if (error) alert('Gagal update: ' + error.message)
    } else {
      const { error } = await supabase.from('mustahik').insert(data)
      if (error) alert('Gagal tambah: ' + error.message)
    }

    setShowForm(false)
    fetchData()
  }

  async function handleHapus(id) {
    const { error } = await supabase.from('mustahik').delete().eq('id', id)
    if (error) alert('Gagal hapus: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  const countUang = list.filter((m) => m.penerima_uang).length
  const countBeras = list.filter((m) => m.penerima_beras).length

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🤲 Data Mustahik</h1>
          <p className="text-gray-500 text-sm">Daftar penerima zakat ({list.length} orang)</p>
        </div>
        <button onClick={handleTambah} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">
          + Tambah Mustahik
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-xs text-gray-500 uppercase">Total Aktif</p>
          <p className="text-2xl font-bold text-emerald-700">{list.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-xs text-gray-500 uppercase">Penerima Uang</p>
          <p className="text-2xl font-bold text-blue-600">{countUang}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-xs text-gray-500 uppercase">Penerima Beras</p>
          <p className="text-2xl font-bold text-amber-600">{countBeras}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Memuat data...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Belum ada data. Klik "+ Tambah Mustahik".</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Asnaf</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3 text-center">Jiwa</th>
                <th className="px-4 py-3 text-center">Uang</th>
                <th className="px-4 py-3 text-center">Beras</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nama}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium capitalize">
                      {m.asnaf || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.alamat || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-800">{m.jumlah_jiwa}</td>
                  <td className="px-4 py-3 text-center">{m.penerima_uang ? '✅' : '❌'}</td>
                  <td className="px-4 py-3 text-center">{m.penerima_beras ? '✅' : '❌'}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(m)} className="text-blue-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => handleHapus(m.id)} className="text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">{editing ? 'Edit Mustahik' : 'Tambah Mustahik'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className={inputClass} placeholder="Contoh: Hasan Yatim" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asnaf *</label>
                <select value={form.asnaf} onChange={(e) => setForm({ ...form, asnaf: e.target.value })} className={inputClass}>
                  {ASNAF_LIST.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <input type="text" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className={inputClass} placeholder="Contoh: Jl. Dahlia No. 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No HP</label>
                <input type="text" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} className={inputClass} placeholder="Contoh: 08123456789" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Jiwa</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.jumlah_jiwa}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setForm({ ...form, jumlah_jiwa: v })
                  }}
                  className={inputClass}
                  placeholder="Contoh: 2"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Jenis Penerimaan</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.penerima_uang} onChange={(e) => setForm({ ...form, penerima_uang: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm text-gray-700">💵 Penerima Uang Zakat</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.penerima_beras} onChange={(e) => setForm({ ...form, penerima_beras: e.target.checked })} className="w-4 h-4 accent-emerald-600" />
                  <span className="text-sm text-gray-700">🍚 Penerima Beras Zakat</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Batal</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}