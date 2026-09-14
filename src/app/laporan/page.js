'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cetakLaporanMuzakki, cetakLaporanMustahik } from '@/lib/pdf-helper'

export default function LaporanPage() {
  const [loading, setLoading] = useState(true)
  const [proses, setProses] = useState(false)
  const [muzakkiList, setMuzakkiList] = useState([])
  const [mustahikList, setMustahikList] = useState([])

  // Filter periode — default: awal bulan s/d hari ini
  const today = new Date().toISOString().slice(0, 10)
  const awalBulan = new Date()
  awalBulan.setDate(1)
  const defaultDari = awalBulan.toISOString().slice(0, 10)

  const [periode, setPeriode] = useState({
    dari: defaultDari,
    sampai: today,
  })

  async function fetchData() {
    setLoading(true)

    // Ambil muzakki sesuai periode (berdasarkan created_at)
    let qMuzakki = supabase.from('muzakki').select('*').order('nama')

    if (periode.dari) {
      qMuzakki = qMuzakki.gte('created_at', periode.dari + 'T00:00:00')
    }
    if (periode.sampai) {
      qMuzakki = qMuzakki.lte('created_at', periode.sampai + 'T23:59:59')
    }

    // Ambil mustahik sesuai periode
    let qMustahik = supabase
      .from('mustahik')
      .select('*')
      .eq('aktif', true)
      .order('nama')

    if (periode.dari) {
      qMustahik = qMustahik.gte('created_at', periode.dari + 'T00:00:00')
    }
    if (periode.sampai) {
      qMustahik = qMustahik.lte('created_at', periode.sampai + 'T23:59:59')
    }

    const [resMuzakki, resMustahik] = await Promise.all([qMuzakki, qMustahik])

    if (!resMuzakki.error) setMuzakkiList(resMuzakki.data || [])
    if (!resMustahik.error) setMustahikList(resMustahik.data || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === CETAK LAPORAN MUZAKKI ===
  async function handleCetakMuzakki() {
    if (muzakkiList.length === 0) {
      return alert('Tidak ada data muzakki di periode ini')
    }
    setProses(true)

    try {
      // Ambil semua nama jiwa dari penerimaan_jiwa
      // Group by muzakki_id (via penerimaan), hapus duplikat nama
      const muzakkiIds = muzakkiList.map((m) => m.id)

      const { data: penerimaanData } = await supabase
        .from('penerimaan')
        .select('id, muzakki_id')
        .in('muzakki_id', muzakkiIds)

      const penerimaanIds = (penerimaanData || []).map((p) => p.id)

      const { data: jiwaData } = await supabase
        .from('penerimaan_jiwa')
        .select('*')
        .in('penerimaan_id', penerimaanIds)
        .order('urutan')

      // Map: muzakki_id -> list jiwa (unique by nama)
      const jiwaMap = {}
      const mapPenerimaanToMuzakki = {}
      ;(penerimaanData || []).forEach((p) => {
        mapPenerimaanToMuzakki[p.id] = p.muzakki_id
      })

      ;(jiwaData || []).forEach((j) => {
        const muzId = mapPenerimaanToMuzakki[j.penerimaan_id]
        if (!muzId) return

        if (!jiwaMap[muzId]) jiwaMap[muzId] = []
        // Cek duplikat by nama
        const sudahAda = jiwaMap[muzId].some(
          (x) => x.nama.toLowerCase() === (j.nama || '').toLowerCase()
        )
        if (!sudahAda) {
          jiwaMap[muzId].push(j)
        }
      })

      cetakLaporanMuzakki(muzakkiList, jiwaMap, periode)
    } catch (err) {
      alert('Gagal cetak: ' + err.message)
    }

    setProses(false)
  }

  // === CETAK LAPORAN MUSTAHIK ===
  function handleCetakMustahik() {
    if (mustahikList.length === 0) {
      return alert('Tidak ada data mustahik di periode ini')
    }

    setProses(true)
    try {
      cetakLaporanMustahik(mustahikList, periode)
    } catch (err) {
      alert('Gagal cetak: ' + err.message)
    }
    setProses(false)
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📄 Laporan</h1>
        <p className="text-slate-500 text-sm">
          Cetak laporan daftar muzakki & mustahik dalam format PDF
        </p>
      </div>

      {/* Filter Periode */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Filter Periode</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={periode.dari}
              onChange={(e) => setPeriode({ ...periode, dari: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={periode.sampai}
              onChange={(e) => setPeriode({ ...periode, sampai: e.target.value })}
              className={inputClass}
            />
          </div>
          <button
            onClick={fetchData}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            🔍 Terapkan Filter
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Data difilter berdasarkan tanggal pendaftaran (created_at).
          Kosongkan tanggal untuk melihat semua data.
        </p>
      </div>

      {/* Statistik */}
      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Memuat...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-5 text-center">
              <p className="text-xs text-slate-500 uppercase">👥 Muzakki</p>
              <p className="text-3xl font-bold text-emerald-700 mt-2">
                {muzakkiList.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">orang</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 text-center">
              <p className="text-xs text-slate-500 uppercase">🤲 Mustahik</p>
              <p className="text-3xl font-bold text-amber-700 mt-2">
                {mustahikList.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">orang</p>
            </div>
          </div>

          {/* Tombol Cetak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-slate-800 mb-2">
                📄 Laporan Muzakki
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Daftar semua muzakki + nama anggota keluarga (unique, tanpa
                duplikat)
              </p>
              <button
                onClick={handleCetakMuzakki}
                disabled={proses || muzakkiList.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium"
              >
                {proses ? 'Memproses...' : `🖨️ Cetak Laporan Muzakki (${muzakkiList.length})`}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-slate-800 mb-2">
                📄 Laporan Mustahik
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Daftar semua mustahik aktif (No | Nama | Alamat)
              </p>
              <button
                onClick={handleCetakMustahik}
                disabled={proses || mustahikList.length === 0}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium"
              >
                {proses ? 'Memproses...' : `🖨️ Cetak Laporan Mustahik (${mustahikList.length})`}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}