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
  // === CETAK LAPORAN MUZAKKI ===
async function handleCetakMuzakki() {
  if (muzakkiList.length === 0) {
    return alert('Tidak ada data muzakki di periode ini')
  }
  setProses(true)

  try {
    // ⭐ Ambil SEMUA penerimaan + semua jiwa, lalu filter di JavaScript
    // Ini lebih aman daripada .in(muzakkiIds) yang bisa kena limit
    const { data: penerimaanData, error: errP } = await supabase
      .from('penerimaan')
      .select('id, muzakki_id')

    if (errP) {
      alert('Gagal ambil penerimaan: ' + errP.message)
      setProses(false)
      return
    }

    const { data: jiwaData, error: errJ } = await supabase
      .from('penerimaan_jiwa')
      .select('*')
      .order('urutan')

    if (errJ) {
      alert('Gagal ambil jiwa: ' + errJ.message)
      setProses(false)
      return
    }

    console.log('Total penerimaan:', penerimaanData?.length)
    console.log('Total jiwa:', jiwaData?.length)

    // Map: penerimaan_id -> muzakki_id
    const mapPenerimaanToMuzakki = {}
    ;(penerimaanData || []).forEach((p) => {
      mapPenerimaanToMuzakki[p.id] = p.muzakki_id
    })

    // Set muzakki_id yang ada di periode ini
    const muzakkiIdsPeriode = new Set(muzakkiList.map((m) => m.id))

    // Group jiwa by muzakki_id (unique by nama)
    const jiwaMap = {}
    ;(jiwaData || []).forEach((j) => {
      const muzId = mapPenerimaanToMuzakki[j.penerimaan_id]
      if (!muzId) return
      if (!muzakkiIdsPeriode.has(muzId)) return // skip kalau di luar periode

      if (!jiwaMap[muzId]) jiwaMap[muzId] = []

      // Cek duplikat by nama
      const nama = (j.nama || '').trim().toLowerCase()
      const sudahAda = jiwaMap[muzId].some(
        (x) => (x.nama || '').trim().toLowerCase() === nama
      )

      if (!sudahAda) {
        jiwaMap[muzId].push(j)
      }
    })

    console.log('Jiwa map:', jiwaMap)

    cetakLaporanMuzakki(muzakkiList, jiwaMap, periode)
  } catch (err) {
    console.error('Error cetak:', err)
    alert('Gagal cetak: ' + err.message)
  }

  setProses(false)
}