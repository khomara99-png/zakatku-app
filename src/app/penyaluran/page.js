'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PenyaluranPage() {
  const [uangSiap, setUangSiap] = useState(0)
  const [berasSiap, setBerasSiap] = useState(0)
  const [kasMasjid, setKasMasjid] = useState(0)
  const [penerimaUang, setPenerimaUang] = useState([])
  const [penerimaBeras, setPenerimaBeras] = useState([])
  const [totalPenerimaUang, setTotalPenerimaUang] = useState(0)
  const [totalPenerimaBeras, setTotalPenerimaBeras] = useState(0)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [proses, setProses] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewJenis, setPreviewJenis] = useState('uang')

  async function fetchData() {
    setLoading(true)

    const { data: pUang } = await supabase
      .from('penerimaan_detail')
      .select('nominal, kategori, jenis')
      .eq('jenis', 'uang')
      .in('kategori', ['zakat_fitrah', 'zakat_maal', 'fidyah'])
    const totalUangMasuk = (pUang || []).reduce((s, x) => s + (x.nominal || 0), 0)

    const { data: sUang } = await supabase
      .from('penyaluran')
      .select('total_dibagikan')
      .eq('jenis', 'uang')
    const totalUangKeluar = (sUang || []).reduce((s, x) => s + (x.total_dibagikan || 0), 0)

    const { data: pBeras } = await supabase
      .from('penerimaan_detail')
      .select('berat_kg, jenis')
      .eq('jenis', 'beras')
    const totalBerasMasuk = (pBeras || []).reduce((s, x) => s + (x.berat_kg || 0), 0)

    const { data: sBeras } = await supabase
      .from('penyaluran')
      .select('total_dibagikan')
      .eq('jenis', 'beras')
    const totalBerasKeluar = (sBeras || []).reduce((s, x) => s + (x.total_dibagikan || 0), 0)

    const { data: kas } = await supabase.from('kas_masjid').select('tipe, nominal')
    const saldoKas = (kas || []).reduce((s, x) => s + (x.tipe === 'masuk' ? x.nominal : -x.nominal), 0)

    const { data: allMus } = await supabase
      .from('mustahik')
      .select('id, penerima_uang, penerima_beras, sudah_dapat_uang, sudah_dapat_beras')
      .eq('aktif', true)

    const totalPU = (allMus || []).filter((m) => m.penerima_uang).length
    const totalPB = (allMus || []).filter((m) => m.penerima_beras).length

    const { data: musU } = await supabase
      .from('mustahik')
      .select('id, nama, asnaf, alamat')
      .eq('aktif', true)
      .eq('penerima_uang', true)
      .eq('sudah_dapat_uang', false)
      .order('nama')

    const { data: musB } = await supabase
      .from('mustahik')
      .select('id, nama, asnaf, alamat')
      .eq('aktif', true)
      .eq('penerima_beras', true)
      .eq('sudah_dapat_beras', false)
      .order('nama')

    setUangSiap(totalUangMasuk - totalUangKeluar)
    setBerasSiap(totalBerasMasuk - totalBerasKeluar)
    setKasMasjid(saldoKas)
    setPenerimaUang(musU || [])
    setPenerimaBeras(musB || [])
    setTotalPenerimaUang(totalPU)
    setTotalPenerimaBeras(totalPB)

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

  const perOrangUang =
    penerimaUang.length > 0
      ? Math.floor(uangSiap / penerimaUang.length / 100) * 100
      : 0
  const sisaUang = uangSiap - perOrangUang * penerimaUang.length

  const perOrangBeras =
    penerimaBeras.length > 0
      ? Math.floor((berasSiap / penerimaBeras.length) * 1000) / 1000
      : 0
  const sisaBeras = berasSiap - perOrangBeras * penerimaBeras.length

  function bukaPreview(jenis) {
    if (jenis === 'uang' && uangSiap <= 0) return alert('Tidak ada uang siap disalurkan')
    if (jenis === 'uang' && penerimaUang.length === 0)
      return alert('Semua mustahik sudah dapat uang. Klik "Reset Giliran" kalau mau ulang.')
    if (jenis === 'beras' && berasSiap <= 0) return alert('Tidak ada beras siap disalurkan')
    if (jenis === 'beras' && penerimaBeras.length === 0)
      return alert('Semua mustahik sudah dapat beras. Klik "Reset Giliran" kalau mau ulang.')
    setPreviewJenis(jenis)
    setShowPreview(true)
  }

  async function eksekusiPenyaluran() {
    setProses(true)
    if (previewJenis === 'uang') {
      await eksekusiUang()
    } else {
      await eksekusiBeras()
    }
    setProses(false)
    setShowPreview(false)
    fetchData()
  }

  async function eksekusiUang() {
    const totalDibagikan = perOrangUang * penerimaUang.length
    const kode = 'ZK-OUT-' + Date.now()

    const { data: header, error: errH } = await supabase
      .from('penyaluran')
      .insert({
        kode,
        jenis: 'uang',
        total_dibagikan: totalDibagikan,
        total_diterima_per_orang: perOrangUang,
        sisa_pembulatan: sisaUang,
        jumlah_penerima: penerimaUang.length,
      })
      .select()
      .single()

    if (errH) return alert('Gagal header: ' + errH.message)

    const details = penerimaUang.map((m) => ({
      penyaluran_id: header.id,
      mustahik_id: m.id,
      nilai_diterima: perOrangUang,
    }))

    const { error: errD } = await supabase.from('penyaluran_detail').insert(details)
    if (errD) {
      await supabase.from('penyaluran').delete().eq('id', header.id)
      return alert('Gagal detail: ' + errD.message)
    }

    const ids = penerimaUang.map((m) => m.id)
    await supabase
      .from('mustahik')
      .update({ sudah_dapat_uang: true })
      .in('id', ids)

    if (sisaUang > 0) {
      await supabase.from('kas_masjid').insert({
        tipe: 'masuk',
        nominal: sisaUang,
        sumber: 'sisa_pembulatan',
        keterangan: 'Sisa pembulatan penyaluran uang zakat',
        referensi_id: header.id,
      })
    }

    alert('✅ Penyaluran uang berhasil!')
  }

  async function eksekusiBeras() {
    const totalDibagikan = perOrangBeras * penerimaBeras.length
    const kode = 'ZK-OUT-' + Date.now()

    const { data: header, error: errH } = await supabase
      .from('penyaluran')
      .insert({
        kode,
        jenis: 'beras',
        total_dibagikan: totalDibagikan,
        total_diterima_per_orang: perOrangBeras,
        sisa_pembulatan: 0,
        jumlah_penerima: penerimaBeras.length,
      })
      .select()
      .single()

    if (errH) return alert('Gagal header: ' + errH.message)

    const details = penerimaBeras.map((m) => ({
      penyaluran_id: header.id,
      mustahik_id: m.id,
      nilai_diterima: perOrangBeras,
    }))

    const { error: errD } = await supabase.from('penyaluran_detail').insert(details)
    if (errD) {
      await supabase.from('penyaluran').delete().eq('id', header.id)
      return alert('Gagal detail: ' + errD.message)
    }

    const ids = penerimaBeras.map((m) => m.id)
    await supabase
      .from('mustahik')
      .update({ sudah_dapat_beras: true })
      .in('id', ids)

    alert('✅ Penyaluran beras berhasil!')
  }

  async function resetGiliran() {
    if (!confirm('Reset giliran? Semua mustahik akan dianggap BELUM pernah dapat.')) return
    await supabase
      .from('mustahik')
      .update({ sudah_dapat_uang: false, sudah_dapat_beras: false })
      .neq('id', '00000000-0000-0000-0000-000000000000')
    alert('✅ Giliran direset!')
    fetchData()
  }

  async function hapusPenyaluran(id) {
    if (!confirm('Yakin hapus riwayat penyaluran ini?')) return
    const { error } = await supabase.from('penyaluran').delete().eq('id', id)
    if (error) alert('Gagal: ' + error.message)
    fetchData()
  }

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📤 Penyaluran Zakat</h1>
          <p className="text-slate-500 text-sm">Bagi zakat ke mustahik yang berhak</p>
        </div>
        <button
          onClick={resetGiliran}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          🔄 Reset Giliran
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">Memuat...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 uppercase">💵 Uang Siap Salur</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                Rp {uangSiap.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Belum dapat: {penerimaUang.length} / {totalPenerimaUang} orang
              </p>
              <p className="text-xs text-slate-500">
                Per orang: Rp {perOrangUang.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 uppercase">🍚 Beras Siap Salur</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {berasSiap.toFixed(3)} kg
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Belum dapat: {penerimaBeras.length} / {totalPenerimaBeras} orang
              </p>
              <p className="text-xs text-slate-500">
                Per orang: {perOrangBeras.toFixed(3)} kg
              </p>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <p className="text-xs text-slate-500 uppercase">🕌 Kas Masjid</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                Rp {kasMasjid.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Dari infaq & sisa pembulatan
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => bukaPreview('uang')}
              disabled={proses || uangSiap <= 0 || penerimaUang.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium"
            >
              {proses ? 'Memproses...' : `💵 Salurkan Uang (Rp ${perOrangUang.toLocaleString('id-ID')}/orang)`}
            </button>

            <button
              onClick={() => bukaPreview('beras')}
              disabled={proses || berasSiap <= 0 || penerimaBeras.length === 0}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-medium"
            >
              {proses ? 'Memproses...' : `🍚 Salurkan Beras (${perOrangBeras.toFixed(3)} kg/orang)`}
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b">
              <h2 className="font-semibold text-slate-700 text-sm md:text-base">Riwayat Penyaluran</h2>
            </div>
            {riwayat.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Belum ada penyaluran.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Kode</th>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Jenis</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-center">Per Orang</th>
                      <th className="px-3 py-2 text-center">Penerima</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {riwayat.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.kode}</td>
                        <td className="px-3 py-2 text-slate-700">{r.tanggal}</td>
                        <td className="px-3 py-2 capitalize text-slate-700">{r.jenis}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {r.jenis === 'uang'
                            ? `Rp ${(r.total_dibagikan || 0).toLocaleString('id-ID')}`
                            : `${(r.total_dibagikan || 0).toFixed(3)} kg`}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">
                          {r.jenis === 'uang'
                            ? `Rp ${(r.total_diterima_per_orang || 0).toLocaleString('id-ID')}`
                            : `${(r.total_diterima_per_orang || 0).toFixed(3)} kg`}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700">{r.jumlah_penerima}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
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
              </div>
            )}
          </div>
        </>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg md:text-xl font-bold text-slate-800">
                {previewJenis === 'uang' ? '💵 Konfirmasi Penyaluran Uang' : '🍚 Konfirmasi Penyaluran Beras'}
              </h2>
              <p className="text-sm text-slate-500">
                Periksa daftar penerima sebelum eksekusi
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 uppercase">Total Dibagikan</p>
                  <p className="text-base md:text-lg font-bold text-emerald-700">
                    {previewJenis === 'uang'
                      ? `Rp ${(perOrangUang * penerimaUang.length).toLocaleString('id-ID')}`
                      : `${(perOrangBeras * penerimaBeras.length).toFixed(3)} kg`}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 uppercase">Per Orang</p>
                  <p className="text-base md:text-lg font-bold text-blue-700">
                    {previewJenis === 'uang'
                      ? `Rp ${perOrangUang.toLocaleString('id-ID')}`
                      : `${perOrangBeras.toFixed(3)} kg`}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 uppercase">Jumlah Penerima</p>
                  <p className="text-base md:text-lg font-bold text-slate-800">
                    {previewJenis === 'uang' ? penerimaUang.length : penerimaBeras.length} orang
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 uppercase">
                    {previewJenis === 'uang' ? 'Sisa → Kas' : 'Sisa Pembulatan'}
                  </p>
                  <p className="text-base md:text-lg font-bold text-amber-700">
                    {previewJenis === 'uang'
                      ? `Rp ${sisaUang.toLocaleString('id-ID')}`
                      : `${sisaBeras.toFixed(3)} kg`}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  📋 Daftar Penerima ({(previewJenis === 'uang' ? penerimaUang : penerimaBeras).length} orang)
                </div>
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-center w-12">No</th>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">Asnaf</th>
                        <th className="px-3 py-2 text-right">Diterima</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {(previewJenis === 'uang' ? penerimaUang : penerimaBeras).map((m, i) => (
                        <tr key={m.id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{m.nama}</td>
                          <td className="px-3 py-2 capitalize text-slate-600">{m.asnaf || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium text-emerald-700 whitespace-nowrap">
                            {previewJenis === 'uang'
                              ? `Rp ${perOrangUang.toLocaleString('id-ID')}`
                              : `${perOrangBeras.toFixed(3)} kg`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  disabled={proses}
                  className="flex-1 border border-slate-300 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={eksekusiPenyaluran}
                  disabled={proses}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-lg font-medium"
                >
                  {proses ? 'Memproses...' : '✅ Salurkan Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}