'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const KATEGORI = [
  { value: 'zakat_fitrah', label: '🌾 Zakat Fitrah' },
  { value: 'zakat_maal', label: '💎 Zakat Maal' },
  { value: 'fidyah', label: '🍚 Fidyah' },
  { value: 'infaq_shodaqoh', label: '🎁 Infaq/Shodaqoh' },
]

export default function PenerimaanPage() {
  const [list, setList] = useState([])
  const [muzakkiList, setMuzakkiList] = useState([])
  const [pengaturan, setPengaturan] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    muzakki_id: '',
    kategori: 'zakat_fitrah',
    jenis: 'uang',
    jumlah_jiwa: '',
    nominal: '',
    berat_kg: '',
    catatan: '',
  })
  const [preview, setPreview] = useState(null)

  async function fetchData() {
    setLoading(true)
    const [resPenerimaan, resMuzakki, resPengaturan] = await Promise.all([
      supabase
        .from('penerimaan')
        .select('*, muzakki:muzakki_id(nama), detail:penerimaan_detail(*)')
        .order('created_at', { ascending: false }),
      supabase.from('muzakki').select('*').order('nama'),
      supabase.from('pengaturan').select('*'),
    ])

    if (!resPenerimaan.error) setList(resPenerimaan.data || [])
    if (!resMuzakki.error) setMuzakkiList(resMuzakki.data || [])
    if (!resPengaturan.error) {
      const map = {}
      ;(resPengaturan.data || []).forEach((p) => (map[p.key] = Number(p.value)))
      setPengaturan(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Hitung kewajiban
  const nishabUang = pengaturan.nishab_fitrah_uang || 45000
  const nishabBeras = pengaturan.nishab_fitrah_beras || 2.5
  const jiwa = parseInt(form.jumlah_jiwa) || 0

  const kewajibanUang = form.kategori === 'zakat_fitrah' ? nishabUang * jiwa : 0
  const kewajibanBeras = form.kategori === 'zakat_fitrah' ? nishabBeras * jiwa : 0

  useEffect(() => {
    if (!form.muzakki_id) return setPreview(null)

    if (form.kategori === 'zakat_fitrah' && form.jenis === 'uang') {
      const bayar = parseInt(form.nominal) || 0
      if (bayar <= 0) return setPreview(null)
      if (bayar < kewajibanUang) {
        setPreview({
          items: [
            { label: '⚠️ KEWAJIBAN', nominal: kewajibanUang },
            { label: '❌ DIBAYAR (KURANG)', nominal: bayar },
            { label: '🔴 Selisih Kurang', nominal: kewajibanUang - bayar },
          ],
          error: true,
        })
      } else if (bayar === kewajibanUang) {
        setPreview({ items: [{ label: '✅ Zakat Fitrah (PAS)', nominal: kewajibanUang }] })
      } else {
        setPreview({
          items: [
            { label: '🌾 Zakat Fitrah', nominal: kewajibanUang },
            { label: '🎁 Infaq (kelebihan → Kas Masjid)', nominal: bayar - kewajibanUang },
          ],
        })
      }
    } else if (form.kategori === 'zakat_fitrah' && form.jenis === 'beras') {
      const bayar = parseFloat(form.berat_kg) || 0
      if (bayar <= 0) return setPreview(null)
      if (bayar < kewajibanBeras) {
        setPreview({
          items: [
            { label: '⚠️ KEWAJIBAN', berat: kewajibanBeras },
            { label: '❌ DIBAYAR (KURANG)', berat: bayar },
            { label: '🔴 Selisih Kurang', berat: kewajibanBeras - bayar },
          ],
          error: true,
        })
      } else if (bayar === kewajibanBeras) {
        setPreview({ items: [{ label: '✅ Zakat Fitrah (PAS)', berat: kewajibanBeras }] })
      } else {
        setPreview({
          items: [
            { label: '🌾 Zakat Fitrah', berat: kewajibanBeras },
            { label: '🎁 Infaq Beras', berat: bayar - kewajibanBeras },
          ],
        })
      }
    } else {
      setPreview(null)
    }
  }, [form, kewajibanUang, kewajibanBeras])

  function handleTambah() {
    setForm({
      muzakki_id: '',
      kategori: 'zakat_fitrah',
      jenis: 'uang',
      jumlah_jiwa: '',
      nominal: '',
      berat_kg: '',
      catatan: '',
    })
    setPreview(null)
    setShowForm(true)
  }

  function handleMuzakkiChange(id) {
    const m = muzakkiList.find((x) => x.id === id)
    setForm({ ...form, muzakki_id: id, jumlah_jiwa: m ? String(m.jumlah_jiwa) : '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.muzakki_id) return alert('Pilih muzakki dulu')

    const jiwaSubmit = parseInt(form.jumlah_jiwa) || 1

    if (form.kategori === 'zakat_fitrah' && form.jenis === 'uang') {
      const kewajiban = nishabUang * jiwaSubmit
      const bayar = parseInt(form.nominal) || 0
      if (bayar <= 0) return alert('Nominal harus > 0')
      if (bayar < kewajiban) {
        return alert(
          `❌ PEMBAYARAN KURANG!\n\n` +
          `Kewajiban: Rp ${kewajiban.toLocaleString('id-ID')}\n` +
          `Dibayar: Rp ${bayar.toLocaleString('id-ID')}\n` +
          `Kurang: Rp ${(kewajiban - bayar).toLocaleString('id-ID')}\n\n` +
          `Silakan periksa kembali nominal.`
        )
      }
    }

    if (form.kategori === 'zakat_fitrah' && form.jenis === 'beras') {
      const kewajiban = nishabBeras * jiwaSubmit
      const bayar = parseFloat(form.berat_kg) || 0
      if (bayar <= 0) return alert('Berat harus > 0')
      if (bayar < kewajiban) {
        return alert(
          `❌ PEMBAYARAN KURANG!\n\n` +
          `Kewajiban: ${kewajiban} kg\n` +
          `Dibayar: ${bayar} kg\n` +
          `Kurang: ${(kewajiban - bayar).toFixed(2)} kg\n\n` +
          `Silakan periksa kembali berat.`
        )
      }
    }

    const tanggal = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 9000) + 1000
    const kode = `ZK-IN-${tanggal}-${rand}`

    const { data: header, error: errH } = await supabase
      .from('penerimaan')
      .insert({
        kode,
        muzakki_id: form.muzakki_id,
        catatan: form.catatan || null,
      })
      .select()
      .single()

    if (errH) return alert('Gagal header: ' + errH.message)

    const muzakki = muzakkiList.find((x) => x.id === form.muzakki_id)
    const namaMuzakki = muzakki?.nama || 'Muzakki'

    const details = []
    let kelebihanUangUntukKas = 0

    if (form.kategori === 'zakat_fitrah' && form.jenis === 'uang') {
      const kewajiban = nishabUang * jiwaSubmit
      const bayar = parseInt(form.nominal) || 0
      if (bayar <= kewajiban) {
        details.push({ penerimaan_id: header.id, kategori: 'zakat_fitrah', jenis: 'uang', nominal: bayar })
      } else {
        const kelebihan = bayar - kewajiban
        details.push({ penerimaan_id: header.id, kategori: 'zakat_fitrah', jenis: 'uang', nominal: kewajiban })
        details.push({ penerimaan_id: header.id, kategori: 'infaq_shodaqoh', jenis: 'uang', nominal: kelebihan, is_kelebihan: true })
        kelebihanUangUntukKas = kelebihan
      }
    } else if (form.kategori === 'zakat_fitrah' && form.jenis === 'beras') {
      const kewajiban = nishabBeras * jiwaSubmit
      const bayar = parseFloat(form.berat_kg) || 0
      if (bayar <= kewajiban) {
        details.push({ penerimaan_id: header.id, kategori: 'zakat_fitrah', jenis: 'beras', berat_kg: bayar })
      } else {
        details.push({ penerimaan_id: header.id, kategori: 'zakat_fitrah', jenis: 'beras', berat_kg: kewajiban })
        details.push({ penerimaan_id: header.id, kategori: 'infaq_shodaqoh', jenis: 'beras', berat_kg: bayar - kewajiban, is_kelebihan: true })
      }
    } else if (form.kategori === 'zakat_maal') {
      const totalHarta = parseInt(form.nominal) || 0
      const persen = pengaturan.persen_zakat_maal || 2.5
      const zakat = Math.floor((totalHarta * persen) / 100)
      if (zakat <= 0) return alert('Total harta harus > 0')
      details.push({ penerimaan_id: header.id, kategori: 'zakat_maal', jenis: 'uang', nominal: zakat })
    } else if (form.kategori === 'fidyah') {
      const hari = jiwaSubmit
      const nilaiPerHari = pengaturan.nilai_fidyah_uang || 15000
      details.push({ penerimaan_id: header.id, kategori: 'fidyah', jenis: 'uang', nominal: hari * nilaiPerHari })
    } else if (form.kategori === 'infaq_shodaqoh') {
      const nominal = parseInt(form.nominal) || 0
      if (nominal <= 0) return alert('Nominal harus > 0')
      details.push({ penerimaan_id: header.id, kategori: 'infaq_shodaqoh', jenis: 'uang', nominal })
      kelebihanUangUntukKas = nominal
    }

    const { error: errD } = await supabase.from('penerimaan_detail').insert(details)
    if (errD) {
      alert('Gagal detail: ' + errD.message)
      await supabase.from('penerimaan').delete().eq('id', header.id)
      return
    }

    if (kelebihanUangUntukKas > 0) {
      await supabase.from('kas_masjid').insert({
        tipe: 'masuk',
        nominal: kelebihanUangUntukKas,
        sumber: 'infaq_kelebihan_zakat',
        keterangan: `Infaq dari ${namaMuzakki} (${kode})`,
        referensi_id: header.id,
        tanggal: new Date().toISOString().slice(0, 10),
      })
    }

    setShowForm(false)
    fetchData()
    alert('✅ Penerimaan berhasil disimpan!')
  }

  async function handleHapus(id) {
    const { data: relatedKas } = await supabase
      .from('kas_masjid')
      .select('id')
      .eq('referensi_id', id)

    if (relatedKas && relatedKas.length > 0) {
      await supabase.from('kas_masjid').delete().eq('referensi_id', id)
    }

    const { error } = await supabase.from('penerimaan').delete().eq('id', id)
    if (error) alert('Gagal hapus: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  const onlyDigits = (v) => v.replace(/\D/g, '')

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📥 Penerimaan Zakat</h1>
          <p className="text-gray-500 text-sm">Riwayat penerimaan ({list.length} transaksi)</p>
        </div>
        <button onClick={handleTambah} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">
          + Input Penerimaan
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">Belum ada transaksi penerimaan.</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Muzakki</th>
                <th className="px-4 py-3">Rincian</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {list.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.kode}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.muzakki?.nama || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {(p.detail || []).map((d, i) => (
                      <div key={i} className="text-gray-700">
                        <span className="capitalize">{d.kategori.replace('_', ' ')}</span>
                        {d.jenis === 'uang' && d.nominal ? ` — Rp ${d.nominal.toLocaleString('id-ID')}` : ` — ${d.berat_kg} kg`}
                        {d.is_kelebihan && <span className="ml-1 text-xs text-amber-600">(kelebihan)</span>}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleHapus(p.id)} className="text-red-600 hover:underline text-sm">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Input Penerimaan Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Muzakki *</label>
                <select value={form.muzakki_id} onChange={(e) => handleMuzakkiChange(e.target.value)} className={inputClass} required>
                  <option value="">-- Pilih Muzakki --</option>
                  {muzakkiList.map((m) => (
                    <option key={m.id} value={m.id}>{m.nama} ({m.jumlah_jiwa} jiwa)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={inputClass}>
                  {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>

              {form.kategori === 'zakat_fitrah' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.jenis === 'uang'} onChange={() => setForm({ ...form, jenis: 'uang' })} />
                        <span className="text-sm">💵 Uang</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.jenis === 'beras'} onChange={() => setForm({ ...form, jenis: 'beras' })} />
                        <span className="text-sm">🍚 Beras</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Jiwa</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.jumlah_jiwa}
                      onChange={(e) => setForm({ ...form, jumlah_jiwa: onlyDigits(e.target.value) })}
                      className={inputClass}
                      placeholder="Contoh: 3"
                    />
                  </div>

                  {jiwa > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-2">📋 Kewajiban yang Harus Dibayar:</p>
                      {form.jenis === 'uang' ? (
                        <p className="text-lg font-bold text-amber-900">
                          Rp {kewajibanUang.toLocaleString('id-ID')}
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-amber-900">
                          {kewajibanBeras} kg
                        </p>
                      )}
                      <p className="text-xs text-amber-700 mt-1">
                        {jiwa} jiwa × {form.jenis === 'uang' ? `Rp ${nishabUang.toLocaleString('id-ID')}` : `${nishabBeras} kg`}
                      </p>
                    </div>
                  )}

                  {form.jenis === 'uang' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Dibayar (Rp) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.nominal}
                        onChange={(e) => setForm({ ...form, nominal: onlyDigits(e.target.value) })}
                        className={inputClass}
                        placeholder="Contoh: 200000"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Berat Dibayar (kg) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.berat_kg}
                        onChange={(e) => setForm({ ...form, berat_kg: e.target.value.replace(/[^0-9.]/g, '') })}
                        className={inputClass}
                        placeholder="Contoh: 10"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {form.kategori === 'zakat_maal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Harta (Rp) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 50000000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Zakat = 2.5% otomatis</p>
                </div>
              )}

              {form.kategori === 'fidyah' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Hari *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.jumlah_jiwa}
                    onChange={(e) => setForm({ ...form, jumlah_jiwa: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 7"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Rp 15.000/hari</p>
                </div>
              )}

              {form.kategori === 'infaq_shodaqoh' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 50000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">✨ Otomatis masuk ke Kas Masjid</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input type="text" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className={inputClass} />
              </div>

              {preview && preview.items.length > 0 && (
                <div className={`border rounded-lg p-4 ${preview.error ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-sm font-semibold mb-2 ${preview.error ? 'text-red-800' : 'text-emerald-800'}`}>
                    {preview.error ? '⚠️ PERHATIAN — Pembayaran Kurang' : '💡 Rincian Otomatis:'}
                  </p>
                  {preview.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-700">
                      <span>{it.label}</span>
                      <span className="font-medium">{it.nominal ? `Rp ${it.nominal.toLocaleString('id-ID')}` : `${it.berat} kg`}</span>
                    </div>
                  ))}
                </div>
              )}

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