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
  })
  const [trenData, setTrenData] = useState([])
  const [asnafData, setAsnafData] = useState([])
  const [transaksiTerbaru, setTransaksiTerbaru] = useState([])

  async function fetchData() {
    setLoading(true)

    const [resMuzakki, resMustahik, resPenerimaanUang, resPenyaluranUang, resKas] =
      await Promise.all([
        supabase.from('muzakki').select('id'),
        supabase.from('mustahik').select('id').eq('aktif', true),
        supabase
          .from('penerimaan_detail')
          .select('nominal')
          .eq('jenis', 'uang')
          .in('kategori', ['zakat_fitrah', 'zakat_maal', 'fidyah']),
        supabase.from('penyaluran').select('total_dibagikan').eq('jenis', 'uang'),
        supabase.from('kas_masjid').select('tipe, nominal'),
      ])

    const totalMasuk = (resPenerimaanUang.data || []).reduce(
      (s, x) => s + Number(x.nominal || 0),
      0
    )
    const totalKeluar = (resPenyaluranUang.data || []).reduce(
      (s, x) => s + Number(x.total_dibagikan || 0),
      0
    )
    const saldoKas = (resKas.data || []).reduce(
      (s, x) => s + (x.tipe === 'masuk' ? Number(x.nominal) : -Number(x.nominal)),
      0
    )

    setStats({
      muzakki: (resMuzakki.data || []).length,
      mustahik: (resMustahik.data || []).length,
      zakatMasuk: totalMasuk,
      zakatKeluar: totalKeluar,
      kasMasjid: saldoKas,
    })

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

    const { data: recent } = await supabase
      .from('penerimaan')
      .select('*, muzakki:muzakki_id(nama), detail:penerimaan_detail(*)')
      .order('created_at', { ascending: false })
      .limit(5)

    setTransaksiTerbaru(recent || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Memuat dashboard...
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏠 Dashboard</h1>
        <p className="text-gray-500 text-sm">Ringkasan sistem ZakatKu</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">👥 Muzakki</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.muzakki}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">🤲 Mustahik</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.mustahik}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">📥 Zakat Masuk</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            Rp {stats.zakatMasuk.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">📤 Zakat Keluar</p>
          <p className="text-lg font-bold text-red-600 mt-1">
            Rp {stats.zakatKeluar.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">🕌 Kas Masjid</p>
          <p className="text-lg font-bold text-blue-700 mt-1">
            Rp {stats.kasMasjid.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5 md:col-span-2">
          <h2 className="font-semibold text-gray-700 mb-4">
            📊 Tren Penerimaan 30 Hari Terakhir
          </h2>
          {trenData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
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
          <h2 className="font-semibold text-gray-700 mb-4">🥧 Komposisi Asnaf</h2>
          {asnafData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
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

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-700">🕐 Transaksi Terbaru</h2>
        </div>
        {transaksiTerbaru.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Belum ada transaksi
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Kode</th>
                <th className="px-4 py-2">Muzakki</th>
                <th className="px-4 py-2">Rincian</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {transaksiTerbaru.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 align-top">
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">
                    {t.kode}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {t.muzakki?.nama || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {(t.detail || []).map((d, i) => (
                      <div key={i} className="text-gray-700">
                        <span className="capitalize">
                          {d.kategori.replace('_', ' ')}
                        </span>
                        {d.jenis === 'uang' && d.nominal
                          ? ` — Rp ${d.nominal.toLocaleString('id-ID')}`
                          : ` — ${d.berat_kg} kg`}
                        {d.is_kelebihan && (
                          <span className="ml-1 text-xs text-amber-600">
                            (kelebihan)
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}