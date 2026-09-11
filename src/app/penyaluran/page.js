'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PenyaluranPage() {
  const [uangSiap, setUangSiap] = useState(0)
  const [berasSiap, setBerasSiap] = useState(0)
  const [kasMasjid, setKasMasjid] = useState(0)
  const [jumlahUang, setJumlahUang] = useState(0)
  const [jumlahBeras, setJumlahBeras] = useState(0)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [proses, setProses] = useState(false)

  async function fetchData() {
    setLoading(true)

    // 1. Total uang zakat (fitrah + maal + fidyah) yang sudah masuk
    const { data: pUang } = await supabase
      .from('penerimaan_detail')
      .select('nominal, kategori, jenis')
      .eq('jenis', 'uang')
      .in('kategori', ['zakat_fitrah', 'zakat_maal', 'fidyah'])

    const totalUangMasuk = (pUang || []).reduce((s, x) => s + (x.nominal || 0), 0)

    // 2. Total uang yang sudah disalurkan
    const { data: sUang } = await supabase
      .from('penyaluran')
      .select('total_dibagikan')
      .eq('jenis', 'uang')

    const totalUangKeluar = (sUang || []).reduce((s, x) => s + (x.total_dibagikan || 0), 0)

    // 3. Total beras (fitrah+maal+fidyah+infaq beras)
    const { data: pBeras } = await supabase
      .from('penerimaan_detail')
      .select('berat_kg, jenis')
      .eq('jenis', 'beras')

    const totalBerasMasuk = (pBeras || []).reduce((s, x) => s + (x.berat_kg || 0), 0)

    // 4. Total beras disalurkan
    const { data: sBeras } = await supabase
      .from('penyaluran')
      .select('total_dibagikan')
      .eq('jenis', 'beras')

    const totalBerasKeluar = (sBeras || []).reduce((s, x) => s + (x.total_dibagikan || 0), 0)

    // 5. Kas masjid
    const { data: kas } = await supabase.from('kas_masjid').select('tipe, nominal')
    const saldoKas = (kas || []).reduce((s, x) => s + (x.tipe === 'masuk' ? x.nominal : -x.nominal), 0)

    // 6. Jumlah mustahik aktif per flag
    const { data: musU } = await supabase
      .from('mustahik')
      .select('id')
      .eq('aktif', true)
      .eq('penerima_uang', true)

    const { data: musB } = await supabase
      .from('mustahik')
      .select('id')
      .eq('aktif', true)
      .eq('penerima_beras', true)

    setUangSiap(totalUangMasuk - totalUangKeluar)
    setBerasSiap(totalBerasMasuk - totalBerasKeluar)
    setKasMasjid(saldoKas)
    setJumlahUang((musU || []).length)
    setJumlahBeras((musB || []).length)

    // 7. Riwayat penyaluran
    const { data: riw } = await supabase
      .from('penyaluran')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    setRiwayat(riw || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function eksekusiUang() {
    if (uangSiap <= 0) return alert('Tidak ada uang siap disalurkan')
    if (jumlahUang <= 0) return alert('Tidak ada mustahik penerima uang')

    // Hitung per orang (bulat ke bawah ke ratusan)
    const perOrang = Math.floor(uangSiap / jumlahUang / 100) * 100
    if (perOrang <= 0) return alert('Saldo terlalu kecil untuk dibagikan')

    const totalDibagikan = perOrang * jumlahUang
    const sisa = uangSiap - totalDibagikan

    if (!confirm(`Salurkan Rp ${totalDibagikan.toLocaleString('id-ID')} ke ${jumlahUang} orang?\n(Rp ${perOrang.toLocaleString('id-ID')}/orang, sisa Rp ${sisa.toLocaleString('id-ID')} → kas masjid)`)) return

    setProses(true)

    const kode = `ZK-OUT-${Date.now()}`

    const { data: header, error: errH } = await supabase
      .from('penyaluran')
      .insert({
        kode,
        jenis: 'uang',
        total_dibagikan: totalDibagikan,
        total_diterima_per_orang: perOrang,
        sisa_pembulatan: sisa,
        jumlah_penerima: jumlahUang,
      })
      .select()
      .single()

    if (errH) {
      setProses(false)
      return alert('Gagal header: ' + errH.message)
    }

    // Ambil semua mustahik penerima uang
    const { data: penerima } = await supabase
      .from('mustahik')
      .select('id')
      .eq('aktif', true)
      .eq('penerima_uang', true)

    const details = (penerima || []).map((m) => ({
      penyaluran_id: header.id,
      mustahik_id: m.id,
      nilai_diterima: perOrang,
    }))

    const { error: errD } = await supabase.from('penyaluran_detail').insert(details)
    if (errD) {
      await supabase.from('penyaluran').delete().eq('id', header.id)
      setProses(false)
      return alert('Gagal detail: ' + errD.message)
    }

    // Sisa pembulatan masuk kas masjid
    if (sisa > 0) {
      await supabase.from('kas_masjid').insert({
        tipe: 'masuk',
        nominal: sisa,
        sumber: 'sisa_pembulatan',
        keterangan: 'Sisa pembulatan penyaluran uang zakat',
        referensi_id: header.id,
      })
    }

    setProses(false)
    alert('✅ Penyaluran uang berhasil!')
    fetchData()
  }

  async function eksekusiBeras() {
    if (berasSiap <= 0) return alert('Tidak ada beras siap disalurkan')
    if (jumlahBeras <= 0) return alert('Tidak ada mustahik penerima beras')

    const perOrang = Math.floor((berasSiap / jumlahBeras) * 1000) / 1000
    if (perOrang <= 0) return alert('Saldo terlalu kecil')

    const totalDibagikan = perOrang * jumlahBeras
    const sisa = berasSiap - totalDibagikan

    if (!confirm(`Salurkan ${totalDibagikan.toFixed(3)} kg ke ${jumlahBeras} orang?\n(${perOrang.toFixed(3)} kg/orang, sisa ${sisa.toFixed(3)} kg)`)) return

    setProses(true)

    const kode = `ZK-OUT-${Date.now()}`

    const { data: header, error: errH } = await supabase
      .from('penyaluran')
      .insert({
        kode,
        jenis: 'beras',
        total_dibagikan: totalDibagikan,
        total_diterima_per_orang: perOrang,
        sisa_pembulatan: 0,
        jumlah_penerima: jumlahBeras,
      })
      .select()
      .single()

    if (errH) {
      setProses(false)
      return alert('Gagal header: ' + errH.message)
    }

    const { data: penerima } = await supabase
      .from('mustahik')
      .select('id')
      .eq('aktif', true)
      .eq('penerima_beras', true)

    const details = (penerima || []).map((m) => ({
      penyaluran_id: header.id,
      mustahik_id: m.id,
      nilai_diterima: perOrang,
    }))

    const { error: errD } = await supabase.from('penyaluran_detail').insert(details)
    if (errD) {
      await supabase.from('penyaluran').delete().eq('id', header.id)
      setProses(false)
      return alert('Gagal detail: ' + errD.message)
    }

    setProses(false)
    alert('✅ Penyaluran beras berhasil!')
    fetchData()
  }

  async function hapusPenyaluran(id) {
    if (!confirm('Yakin hapus riwayat penyaluran ini?')) return
    const { error } = await supabase.from('penyaluran').delete().eq('id', id)
    if (error) alert('Gagal: ' + error.message)
    fetchData()
  }

  const perOrangUang = jumlahUang > 0 ? Math.floor(uangSiap / jumlahUang / 100) * 100 : 0
  const perOrangBeras = jumlahBeras > 0 ? Math.floor((berasSiap / jumlahBeras) * 1000) / 1000 : 0

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📤 Penyaluran Zakat</h1>
        <p className="text-gray-500 text-sm">Bagi zakat ke mustahik yang berhak</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Memuat...</div>
      ) : (
        <>
          {/* Kartu Saldo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 uppercase">💵 Uang Siap Salur</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                Rp {uangSiap.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Penerima: {jumlahUang} orang
              </p>
              <p className="text-xs text-gray-500">
                Per orang: Rp {perOrangUang.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 uppercase">🍚 Beras Siap Salur</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {berasSiap.toFixed(3)} kg
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Penerima: {jumlahBeras} orang
              </p>
              <p className="text-xs text-gray-500">
                Per orang: {perOrangBeras.toFixed(3)} kg
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-gray-500 uppercase">🕌 Kas Masjid</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                Rp {kasMasjid.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Dari infaq & sisa pembulatan
              </p>
            </div>
          </div>

          {/* Tombol Eksekusi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={eksekusiUang}
              disabled={proses || uangSiap <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium text-lg"
            >
              {proses ? 'Memproses...' : `💵 Salurkan Uang (Rp ${perOrangUang.toLocaleString('id-ID')}/orang)`}
            </button>

            <button
              onClick={eksekusiBeras}
              disabled={proses || berasSiap <= 0}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium text-lg"
            >
              {proses ? 'Memproses...' : `🍚 Salurkan Beras (${perOrangBeras.toFixed(3)} kg/orang)`}
            </button>
          </div>

          {/* Riwayat */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700">Riwayat Penyaluran</h2>
            </div>
            {riwayat.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Belum ada penyaluran.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2">Kode</th>
                    <th className="px-4 py-2">Tanggal</th>
                    <th className="px-4 py-2">Jenis</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Per Orang</th>
                    <th className="px-4 py-2 text-center">Penerima</th>
                    <th className="px-4 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{r.kode}</td>
                      <td className="px-4 py-2 text-gray-600">{r.tanggal}</td>
                      <td className="px-4 py-2 capitalize">{r.jenis}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {r.jenis === 'uang'
                          ? `Rp ${(r.total_dibagikan || 0).toLocaleString('id-ID')}`
                          : `${(r.total_dibagikan || 0).toFixed(3)} kg`}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.jenis === 'uang'
                          ? `Rp ${(r.total_diterima_per_orang || 0).toLocaleString('id-ID')}`
                          : `${(r.total_diterima_per_orang || 0).toFixed(3)} kg`}
                      </td>
                      <td className="px-4 py-2 text-center">{r.jumlah_penerima}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => hapusPenyaluran(r.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  )
}