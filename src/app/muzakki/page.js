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
    rt: '',
    no_hp: '',
    jumlah_jiwa: '',
  })

  // Modal riwayat jiwa
  const [showJiwa, setShowJiwa] = useState(false)
  const [jiwaMuzakki, setJiwaMuzakki] = useState(null)
  const [jiwaData, setJiwaData] = useState([])
  const [jiwaLoading, setJiwaLoading] = useState(false)

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

  // === BUKA MODAL RIWAYAT JIWA ===
  async function bukaJiwa(muzakki) {
    setJiwaMuzakki(muzakki)
    setShowJiwa(true)
    setJiwaLoading(true)
    setJiwaData([])

    try {
      // 1. Ambil semua penerimaan untuk muzakki ini
      const { data: penerimaanList, error: errP } = await supabase
        .from('penerimaan')
        .select('id, kode, tanggal, created_at')
        .eq('muzakki_id', muzakki.id)
        .order('created_at', { ascending: false })

      console.log('Penerimaan untuk muzakki', muzakki.nama, ':', penerimaanList?.length)

      if (errP) {
        console.error('Error ambil penerimaan:', errP)
        setJiwaLoading(false)
        return
      }

      if (!penerimaanList || penerimaanList.length === 0) {
        setJiwaData([])
        setJiwaLoading(false)
        return
      }

      // 2. Ambil semua jiwa untuk penerimaan-penerimaan itu
      const ids = penerimaanList.map((p) => p.id)

      const { data: jiwaList, error: errJ } = await supabase
        .from('penerimaan_jiwa')
        .select('*')
        .in('penerimaan_id', ids)
        .order('urutan')

      console.log('Total jiwa untuk muzakki ini:', jiwaList?.length)

      if (errJ) {
        console.error('Error ambil jiwa:', errJ)
      }

      // 3. Group per transaksi
      const grouped = penerimaanList.map((p) => ({
        ...p,
        jiwa: (jiwaList || []).filter((j) => j.penerimaan_id === p.id),
      }))

      console.log('Grouped data:', grouped)

      setJiwaData(grouped)
    } catch (err) {
      console.error('Error bukaJiwa:', err)
    }

    setJiwaLoading(false)
  }

  function handleTambah() {
    setEditing(null)
    setForm({ nama: '', alamat: '', rt: '', no_hp: '', jumlah_jiwa: '' })
    setShowForm(true)
  }

  function handleEdit(item) {
    setEditing(item.id)
    setForm({
      nama: item.nama || '',
      alamat: item.alamat || '',
      rt: item.rt || '',
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
      rt: form.rt || null,
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
    if (!confirm('Yakin hapus muzakki ini?')) return
    const { error } = await supabase.from('muzakki').delete().eq('id', id)
    if (error) alert('Gagal hapus: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  const onlyDigits = (v) => v.replace(/\D/g, '')

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👥 Data Muzakki</h1>
          <p className="text-slate-500 text-sm">
            Daftar pemberi zakat ({list.length} orang)
          </p>
        </div>
        <button
          onClick={handleTambah}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
        >
          + Tambah Muzakki
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Memuat data...
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Belum ada data muzakki. Klik "+ Tambah Muzakki" untuk mulai.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Alamat</th>
                  <th className="px-3 py-2 text-center">RT</th>
                  <th className="px-3 py-2">No HP</th>
                  <th className="px-3 py-2 text-center">Jiwa</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {list.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{m.nama}</td>
                    <td className="px-3 py-2 text-slate-600">{m.alamat || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                        {m.rt || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{m.no_hp || '-'}</td>
                    <td className="px-3 py-2 text-center">{m.jumlah_jiwa}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => bukaJiwa(m)}
                        className="text-emerald-600 hover:underline mr-2"
                        title="Lihat riwayat jiwa"
                      >
                        👨‍👩‍👧 Jiwa
                      </button>
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-blue-600 hover:underline mr-2"
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
        </div>
      )}

      {/* Modal Form Tambah/Edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4 text-slate-800">
              {editing ? 'Edit Muzakki' : 'Tambah Muzakki'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    RT
                  </label>
                  <input
                    type="text"
                    value={form.rt}
                    onChange={(e) => setForm({ ...form, rt: e.target.value })}
                    className={inputClass}
                    placeholder="001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jumlah Jiwa
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.jumlah_jiwa}
                  onChange={(e) =>
                    setForm({ ...form, jumlah_jiwa: onlyDigits(e.target.value) })
                  }
                  className={inputClass}
                  placeholder="Contoh: 3"
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Jiwa */}
      {showJiwa && jiwaMuzakki && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-lg md:text-xl font-bold text-slate-800">
                👨‍👩‍👧 Riwayat Jiwa: {jiwaMuzakki.nama}
              </h2>
              <p className="text-sm text-slate-500">
                📍 {jiwaMuzakki.alamat || '-'} | RT {jiwaMuzakki.rt || '-'}
              </p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {jiwaLoading ? (
                <div className="text-center text-slate-500 py-8">
                  Memuat riwayat...
                </div>
              ) : jiwaData.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p className="text-2xl mb-2">📭</p>
                  <p>Belum ada riwayat penerimaan untuk muzakki ini.</p>
                  <p className="text-xs mt-2 text-slate-400">
                    Riwayat akan muncul setelah ada transaksi penerimaan.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jiwaData.map((transaksi, idx) => (
                    <div
                      key={transaksi.id}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      <div className="bg-slate-100 px-4 py-2">
                        <p className="font-semibold text-slate-800 text-sm">
                          📅 Transaksi {jiwaData.length - idx}: {transaksi.kode}
                        </p>
                        <p className="text-xs text-slate-600">
                          Tanggal: {transaksi.tanggal}
                        </p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {transaksi.jiwa.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            (Data nama jiwa tidak tersimpan untuk transaksi ini)
                          </div>
                        ) : (
                          transaksi.jiwa.map((j, i) => (
                            <div
                              key={j.id}
                              className="px-4 py-2 flex items-center justify-between hover:bg-slate-50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500 w-6">
                                  {i + 1}.
                                </span>
                                <span className="text-sm font-medium text-slate-800">
                                  {j.nama}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {j.is_kepala_keluarga
                                  ? '👤 Kepala Keluarga'
                                  : '👥 Anggota'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t">
              <button
                onClick={() => setShowJiwa(false)}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}