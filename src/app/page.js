'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const ASNAF_COLORS = [
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    muzakki: 0,
    mustahik: 0,
    zakatMasuk: 0,
    zakatKeluar: 0,
    kasMasjid: 0,
    berasMasuk: 0,
  })
  const [breakdownUang, setBreakdownUang] = useState({
    fitrah: 0,
    maal: 0,
    fidyah: 0,
    infaq: 0,
  })
  const [breakdownBeras, setBreakdownBeras] = useState({
    fitrah: 0,
    maal: 0,
    fidyah: 0,
    infaq: 0,
  })
  const [hariIni, setHariIni] = useState({
    muzakki: 0,
    uang: 0,
    beras: 0,
    fitrah: 0,
    maal: 0,
    fidyah: 0,
    infaq: 0,
  })
  const [trenData, setTrenData] = useState([])
  const [asnafData, setAsnafData] = useState([])

  async function fetchData() {
    setLoading(true)

    // 1. Statistik dasar
    const [resMuzakki, resMustahik, resPenerimaanUang, resPenyaluranUang, resKas] =
      await Promise.all([
        supabase.from('muzakki').select('id'),
        supabase.from('mustahik').select('id').eq('aktif', true),
        supabase
          .from('penerimaan_detail')
          .select('nominal, kategori')
          .eq('jenis', 'uang'),
        supabase.from('penyaluran').select('total_dibagikan').eq('jenis', 'uang'),
        supabase.from('kas_masjid').select('tipe, nominal'),
      ])

    // Total uang zakat masuk (fitrah + maal + fidyah) - TIDAK termasuk infaq
    const totalMasuk = (resPenerimaanUang.data || [])
      .filter((x) => ['zakat_fitrah', 'zakat_maal', 'fidyah'].includes(x.kategori))
      .reduce((s, x) => s + Number(x.nominal || 0), 0)

    const totalKeluar = (resPenyaluranUang.data || []).reduce(
      (s, x) => s + Number(x.total_dibagikan || 0),
      0
    )
    const saldoKas = (resKas.data || []).reduce(
      (s, x) => s + (x.tipe === 'masuk' ? Number(x.nominal) : -Number(x.nominal)),
      0
    )

    // 2. Breakdown uang
    const bUang = { fitrah: 0, maal: 0, fidyah: 0, infaq: 0 }
    ;(resPenerimaanUang.data || []).forEach((x) => {
      if (x.kategori === 'zakat_fitrah') bUang.fitrah += Number(x.nominal || 0)
      else if (x.kategori === 'zakat_maal') bUang.maal += Number(x.nominal || 0)
      else if (x.kategori === 'fidyah') bUang.fidyah += Number(x.nominal || 0)
      else if (x.kategori === 'infaq_shodaqoh') bUang.infaq += Number(x.nominal || 0)
    })
    setBreakdownUang(bUang)

    // 3. Total beras masuk + breakdown
    const { data: pBeras } = await supabase
      .from('penerimaan_detail')
      .select('berat_kg, kategori')
      .eq('jenis', 'beras')

    const bBeras = { fitrah: 0, maal: 0, fidyah: 0, infaq: 0 }
    ;(pBeras || []).forEach((x) => {
      if (x.kategori === 'zakat_fitrah') bBeras.fitrah += Number(x.berat_kg || 0)
      else if (x.kategori === 'zakat_maal') bBeras.maal += Number(x.berat_kg || 0)
      else if (x.kategori === 'fidyah') bBeras.fidyah += Number(x.berat_kg || 0)
      else if (x.kategori === 'infaq_shodaqoh') bBeras.infaq += Number(x.berat_kg || 0)
    })
    setBreakdownBeras(bBeras)

    const totalBeras = bBeras.fitrah + bBeras.maal + bBeras.fidyah + bBeras.infaq

    setStats({
      muzakki: (resMuzakki.data || []).length,
      mustahik: (resMustahik.data || []).length,
      zakatMasuk: totalMasuk,
      zakatKeluar: totalKeluar,
      kasMasjid: saldoKas,
      berasMasuk: totalBeras,
    })

    // 4. Penerimaan Hari Ini (berdasarkan kolom tanggal = hari ini)
    const today = new Date().toISOString().slice(0, 10)

    const { data: todayPenerimaan } = await supabase
      .from('penerimaan')
      .select('id, muzakki_id, detail:penerimaan_detail(*)')
      .eq('tanggal', today)

    const totalMuzakkiHariIni = new Set(
      (todayPenerimaan || []).map((p) => p.muzakki_id).filter(Boolean)
    ).size

    let totalUangHariIni = 0
    let totalBerasHariIni = 0
    let fitrahHariIni = 0
    let maalHariIni = 0
    let fidyahHariIni = 0
    let infaqHariIni = 0

    ;(todayPenerimaan || []).forEach((p) => {
      ;(p.detail || []).forEach((d) => {
        const nominal = Number(d.nominal || 0)
        const berat = Number(d.berat_kg || 0)

        if (d.jenis === 'uang') {
          if (d.kategori !== 'infaq_shodaqoh') totalUangHariIni += nominal
        } else {
          totalBerasHariIni += berat
        }

        if (d.kategori === 'zakat_fitrah') {
          if (d.jenis === 'uang') fitrahHariIni += nominal
        } else if (d.kategori === 'zakat_maal') {
          maalHariIni += nominal
        } else if (d.kategori === 'fidyah') {
          fidyahHariIni += nominal
        } else if (d.kategori === 'infaq_shodaqoh') {
          if (d.jenis === 'uang') infaqHariIni += nominal
        }
      })
    })

    setHariIni({
      muzakki: totalMuzakkiHariIni,
      uang: totalUangHariIni,
      beras: totalBerasHariIni,
      fitrah: fitrahHariIni,
      maal: maalHariIni,
      fidyah: fidyahHariIni,
      infaq: infaqHariIni,
    })

    // 5. Tren 30 hari
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: trenPenerimaan } = await supabase
      .from('penerimaan_detail')
      .select('nominal, berat_kg, jenis, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const byDate = {}
    ;(trenPenerimaan || []).forEach((p) => {
      const tgl = p.created_at ? p.created_at.slice(0, 10) : ''
      if (!byDate[tgl]) byDate[tgl] = { tanggal: tgl, uang: 0, beras: 0 }
      if (p.jenis === 'uang') byDate[tgl].uang += Number(p.nominal || 0)
      if (p.jenis === 'beras') byDate[tgl].beras += Number(p.berat_kg || 0)
    })

    const trenArr = Object.values(byDate)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .map((x) => ({ ...x, tglShort: x.tanggal.slice(5) }))

    setTrenData(trenArr)

    // 6. Asnaf
    const { data: mustahikList } = await supabase
      .from('mustahik')
      .select('asnaf')
      .eq('aktif', true)

    const byAsnaf = {}
    ;(mustahikList || []).forEach((m) => {
      const a = m.asnaf || 'lainnya'
      byAsnaf[a] = (byAsnaf[a] || 0) + 1
    })

    const asnafArr = Object.entries(byAsnaf)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    setAsnafData(asnafArr)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
          Memuat dashboard...
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🏠 Dashboard</h1>
        <p className="text-slate-500 text-sm">Ringkasan sistem ZakatKu</p>
      </div>

      {/* Kartu Statistik Utama */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500 uppercase">👥 Muzakki</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.muzakki}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500 uppercase">🤲 Mustahik</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.mustahik}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500 uppercase">📥 Zakat Masuk</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            Rp {stats.zakatMasuk.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500 uppercase">📤 Zakat Keluar</p>
          <p className="text-lg font-bold text-red-600 mt-1">
            Rp {stats.zakatKeluar.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-slate-500 uppercase">🕌 Kas Masjid</p>
          <p className="text-lg font-bold text-blue-700 mt-1">
            Rp {stats.kasMasjid.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Breakdown Zakat Masuk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">📥 Rincian Zakat Masuk (Uang)</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">🌾 Zakat Fitrah</span>
              <span className="font-medium text-slate-800">
                Rp {breakdownUang.fitrah.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">💎 Zakat Maal</span>
              <span className="font-medium text-slate-800">
                Rp {breakdownUang.maal.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">🍚 Fidyah</span>
              <span className="font-medium text-slate-800">
                Rp {breakdownUang.fidyah.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-slate-600">🎁 Infaq Uang</span>
              <span className="font-medium text-blue-700">
                Rp {breakdownUang.infaq.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">🍚 Total Beras Masuk</h2>
            <span className="text-2xl font-bold text-amber-700">
              {stats.berasMasuk.toFixed(3)} kg
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">🌾 Zakat Fitrah</span>
              <span className="font-medium text-slate-800">
                {breakdownBeras.fitrah.toFixed(3)} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">💎 Zakat Maal</span>
              <span className="font-medium text-slate-800">
                {breakdownBeras.maal.toFixed(3)} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">🍚 Fidyah</span>
              <span className="font-medium text-slate-800">
                {breakdownBeras.fidyah.toFixed(3)} kg
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-slate-600">🎁 Infaq Beras</span>
              <span className="font-medium text-blue-700">
                {breakdownBeras.infaq.toFixed(3)} kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section Hari Ini */}
      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">📅 Penerimaan Hari Ini</h2>
          <span className="text-sm text-slate-500">{today}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">👥 Muzakki</p>
            <p className="text-xl font-bold text-emerald-700">{hariIni.muzakki}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">💵 Total Uang</p>
            <p className="text-lg font-bold text-emerald-700">
              Rp {hariIni.uang.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">🍚 Total Beras</p>
            <p className="text-lg font-bold text-amber-700">
              {hariIni.beras.toFixed(3)} kg
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">🎁 Infaq Uang</p>
            <p className="text-lg font-bold text-blue-700">
              Rp {hariIni.infaq.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">🌾 Fitrah (Uang)</p>
            <p className="text-base font-bold text-slate-800">
              Rp {hariIni.fitrah.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">💎 Maal (Uang)</p>
            <p className="text-base font-bold text-slate-800">
              Rp {hariIni.maal.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 uppercase">🍚 Fidyah (Uang)</p>
            <p className="text-base font-bold text-slate-800">
              Rp {hariIni.fidyah.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {hariIni.muzakki === 0 && (
          <p className="text-xs text-slate-400 text-center mt-3">
            Belum ada penerimaan hari ini
          </p>
        )}
      </div>

      {/* Grafik Tren & Asnaf */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-5 md:col-span-2">
          <h2 className="font-semibold text-slate-700 mb-4">
            📊 Tren Penerimaan 30 Hari Terakhir
          </h2>
          {trenData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data penerimaan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="tglShort" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'uang'
                      ? `Rp ${Number(value).toLocaleString('id-ID')}`
                      : `${value} kg`
                  }
                />
                <Bar dataKey="uang" fill="#10B981" name="Uang" />
                <Bar dataKey="beras" fill="#F59E0B" name="Beras" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-slate-700 mb-4">🥧 Komposisi Asnaf</h2>
          {asnafData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Belum ada data mustahik
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={asnafData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {asnafData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={ASNAF_COLORS[index % ASNAF_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </main>
  )
}