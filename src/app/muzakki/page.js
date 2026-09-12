'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MuzakkiPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    nama: '',
    alamat: '',
    no_hp: '',
    jumlah_jiwa: '',
  })

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('muzakki')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert('Gagal ambil data: ' + error.message)
    } else {
      setList(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleTambah() {
    setEditing(null)
    setForm({ nama: '', alamat: '', no_hp: '', jumlah_jiwa: '' })
    setShowForm(true)
  }

  function handleEdit(item) {
    setEditing(item.id)
    setForm({
      nama: item.nama || '',
      alamat: item.alamat || '',
      no_hp: item.no_hp || '',
      jumlah_jiwa: item.jumlah_jiwa || '',
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
      jumlah_jiwa: parseInt(form.jumlah_jiwa) || 1,
    }

    if (editing) {
      const { error } = await supabase
        .from('muzakki')
        .update(data)
        .eq('id', editing)
      if (error) alert('Gagal update: ' + error.message)
    } else {
      const { error } = await supabase.from('muzakki').insert(data)
      if (error) alert('Gagal tambah: ' + error.message)
    }

    setShowForm(false)
    fetchData()
  }

  async function handleHapus(id) {
    const { error } = await supabase.from('muzakki').delete().eq('id', id)
    if (error) alert('Gagal hapus: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Data Muzakki</h1>
          <p className="text-gray-500 text-sm">
            Daftar pemberi zakat ({list.length} orang)
          </p>
        </div>
        <button
          onClick={handleTambah}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + Tambah Muzakki
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Memuat data...
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Belum ada data muzakki. Klik "+ Tambah Muzakki" untuk mulai.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">No HP</th>
                <th className="px-4 py-3 text-center">Jiwa</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{m.alamat || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{m.no_hp || '-'}</td>
                  <td className="px-4 py-3 text-center text-gray-800">
                    {m.jumlah_jiwa}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(m)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleHapus(m.id)}
                      className="text-red-600 hover:underline"
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editing ? 'Edit Muzakki' : 'Tambah Muzakki'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama *
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Ahmad Fauzi"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat
                </label>
                <input
                  type="text"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: Jl. Melati No. 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No HP
                </label>
                <input
                  type="text"
                  value={form.no_hp}
                  onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  className={inputClass}
                  placeholder="Contoh: 08123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Jiwa
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.jumlah_jiwa}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setForm({ ...form, jumlah_jiwa: v })
                  }}
                  className={inputClass}
                  placeholder="Contoh: 3"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
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