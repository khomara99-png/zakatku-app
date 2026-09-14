'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cetakBuktiPenerimaan } from '@/lib/pdf-helper'

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
  const [cetakLoading, setCetakLoading] = useState(null)
  const [form, setForm] = useState({
    muzakki_id: '',
    kategori: 'zakat_fitrah',
    jenis: 'uang',
    jumlah_jiwa: '',
    nominal: '',
    berat_kg: '',
    catatan: '',
    tanggal: new Date().toISOString().slice(0, 10),
  })
  const [jiwaList, setJiwaList] = useState([])
  const [preview, setPreview] = useState(null)

  async function fetchData() {
    setLoading(true)
    const [resPenerimaan, resMuzakki, resPengaturan] = await Promise.all([
      supabase
        .from('penerimaan')
        .select('*, muzakki:muzakki_id(nama, alamat, rt), detail:penerimaan_detail(*)')
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

  // === FUNGSI CETAK ===
  async function handleCetak(penerimaan) {
    setCetakLoading(penerimaan.id)
    try {
      const { data: jiwaData } = await supabase
        .from('penerimaan_jiwa')
        .select('*')
        .eq('penerimaan_id', penerimaan.id)
        .order('urutan')

      cetakBuktiPenerimaan({
        kode: penerimaan.kode,
        tanggal: penerimaan.tanggal,
        muzakki: penerimaan.muzakki,
        detail: penerimaan.detail || [],
        jiwa: jiwaData || [],
      })
    } catch (err) {
      alert('Gagal cetak: ' + err.message)
    }
    setCetakLoading(null)
  }

  const nishabUang = pengaturan.nishab_fitrah_uang || 45000
  const nishabBeras = pengaturan.nishab_fitrah_beras || 2.5
  const jiwa = parseInt(form.jumlah_jiwa) || 0

  const kewajibanUang = form.kategori === 'zakat_fitrah' ? nishabUang * jiwa : 0
  const kewajibanBeras = form.kategori === 'zakat_fitrah' ? nishabBeras * jiwa : 0

  // Sync jiwaList dengan jumlah jiwa
  useEffect(() => {
    const currentCount = jiwaList.length
    const targetCount = jiwa || 0

    if (targetCount === currentCount) return

    const muzakki = muzakkiList.find((m) => m.id === form.muzakki_id)

    if (targetCount > currentCount) {
      const baru = [...jiwaList]
      for (let i = currentCount; i < targetCount; i++) {
        baru.push({
          urutan: i + 1,
          nama: i === 0 ? muzakki?.nama || '' : '',
          is_kepala_keluarga: i === 0,
          alamat: muzakki?.alamat || '',
          rt: muzakki?.rt || '',
        })
      }
      setJiwaList(baru)
    } else {
      setJiwaList(jiwaList.slice(0, targetCount))
    }
  }, [jiwa, form.muzakki_id, muzakkiList])

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
      tanggal: new Date().toISOString().slice(0, 10),
    })
    setJiwaList([])
    setPreview(null)
    setShowForm(true)
  }

  function handleMuzakkiChange(id) {
    const m = muzakkiList.find((x) => x.id === id)
    const jumlah = m ? String(m.jumlah_jiwa) : ''
    setForm({
      ...form,
      muzakki_id: id,
      jumlah_jiwa: jumlah,
    })

    if (m) {
      const count = parseInt(m.jumlah_jiwa) || 0
      const baru = []
      for (let i = 0; i < count; i++) {
        baru.push({
          urutan: i + 1,
          nama: i === 0 ? m.nama : '',
          is_kepala_keluarga: i === 0,
          alamat: m.alamat || '',
          rt: m.rt || '',
        })
      }
      setJiwaList(baru)
    } else {
      setJiwaList([])
    }
  }

  function updateNamaJiwa(index, nama) {
    const baru = [...jiwaList]
    baru[index] = { ...baru[index], nama }
    setJiwaList(baru)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.muzakki_id) return alert('Pilih muzakki dulu')
    if (!form.tanggal) return alert('Tanggal wajib diisi')

    const jiwaSubmit = parseInt(form.jumlah_jiwa) || 1

    // === VALIDASI: SEMUA NAMA JIWA WAJIB DIISI ===
    for (let i = 0; i < jiwaSubmit; i++) {
      if (!jiwaList[i] || !jiwaList[i].nama || !jiwaList[i].nama.trim()) {
        return alert(
          `❌ Nama jiwa ke-${i + 1} wajib diisi!\n\n` +
          `Silakan isi nama semua anggota keluarga di bagian "Detail Jiwa".`
        )
      }
    }

    if (form.kategori === 'zakat_fitrah' && form.jenis === 'uang') {
      const kewajiban = nishabUang * jiwaSubmit
      const bayar = parseInt(form.nominal) || 0
      if (bayar <= 0) return alert('Nominal harus > 0')
      if (bayar < kewajiban) {
        return alert(
          `❌ PEMBAYARAN KURANG!\n\n` +
          `Kewajiban: Rp ${kewajiban.toLocaleString('id-ID')}\n` +
          `Dibayar: Rp ${bayar.toLocaleString('id-ID')}\n` +
          `Kurang: Rp ${(kewajiban - bayar).toLocaleString('id-ID')}`
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
          `Kurang: ${(kewajiban - bayar).toFixed(2)} kg`
        )
      }
    }

    const tanggalKode = form.tanggal.replace(/-/g, '')
    const rand = Math.floor(Math.random() * 9000) + 1000
    const kode = `ZK-IN-${tanggalKode}-${rand}`

    const { data: header, error: errH } = await supabase
      .from('penerimaan')
      .insert({
        kode,
        muzakki_id: form.muzakki_id,
        catatan: form.catatan || null,
        tanggal: form.tanggal,
      })
      .select()
      .single()

    if (errH) return alert('Gagal header: ' + errH.message)

    const muzakki = muzakkiList.find((x) => x.id === form.muzakki_id)
    const namaMuzakki = muzakki?.nama || 'Muzakki'

    // === SUSUN DATA JIWA ===
    const jiwaData = jiwaList.slice(0, jiwaSubmit).map((j) => ({
      penerimaan_id: header.id,
      urutan: j.urutan,
      nama: j.nama.trim(),
      is_kepala_keluarga: j.is_kepala_keluarga,
      alamat: j.alamat || null,
      rt: j.rt || null,
    }))

    // Debug log
    console.log('🔍 DEBUG jiwaData:', JSON.stringify(jiwaData, null, 2))

    // === INSERT KE penerimaan_jiwa ===
    const { error: errJiwa } = await supabase.from('penerimaan_jiwa').insert(jiwaData)
    if (errJiwa) {
      console.error('Gagal simpan jiwa:', errJiwa)
      alert(
        '⚠️ Gagal simpan detail jiwa!\n\n' +
        'Error: ' + errJiwa.message + '\n\n' +
        'Data penerimaan tetap tersimpan, tapi nama anggota TIDAK tersimpan.'
      )
    }

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
        tanggal: form.tanggal,
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

    await supabase.from('penerimaan_jiwa').delete().eq('penerimaan_id', id)

    const { error } = await supabase.from('penerimaan').delete().eq('id', id)
    if (error) alert('Gagal hapus: ' + error.message)
    fetchData()
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'

  const onlyDigits = (v) => v.replace(/\D/g, '')

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📥 Penerimaan Zakat</h1>
          <p className="text-slate-500 text-sm">Riwayat penerimaan ({list.length} transaksi)</p>
        </div>
        <button
          onClick={handleTambah}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
        >
          + Input Penerimaan
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">Belum ada transaksi penerimaan.</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Muzakki</th>
                  <th className="px-3 py-2">Rincian</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {list.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50 align-top">
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{p.tanggal || '-'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.kode}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{p.muzakki?.nama || '-'}</td>
                    <td className="px-3 py-2">
                      {(p.detail || []).map((d, i) => (
                        <div key={i} className="text-slate-700">
                          <span className="capitalize">{d.kategori.replace('_', ' ')}</span>
                          {d.jenis === 'uang' && d.nominal ? ` — Rp ${d.nominal.toLocaleString('id-ID')}` : ` — ${d.berat_kg} kg`}
                          {d.is_kelebihan && <span className="ml-1 text-xs text-amber-600">(kelebihan)</span>}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleCetak(p)}
                        disabled={cetakLoading === p.id}
                        className="text-emerald-700 hover:underline mr-2 disabled:opacity-50"
                        title="Cetak bukti PDF"
                      >
                        {cetakLoading === p.id ? '⏳' : '🖨️'} Cetak
                      </button>
                      <button onClick={() => handleHapus(p.id)} className="text-red-600 hover:underline">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Input Penerimaan Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Penerimaan *</label>
                <input
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Muzakki *</label>
                <select value={form.muzakki_id} onChange={(e) => handleMuzakkiChange(e.target.value)} className={inputClass} required>
                  <option value="">-- Pilih Muzakki --</option>
                  {muzakkiList.map((m) => (
                    <option key={m.id} value={m.id}>{m.nama} ({m.jumlah_jiwa} jiwa)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori *</label>
                <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={inputClass}>
                  {KATEGORI.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </div>

              {form.kategori === 'zakat_fitrah' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jenis *</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Jiwa</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.jumlah_jiwa}
                      onChange={(e) => setForm({ ...form, jumlah_jiwa: onlyDigits(e.target.value) })}
                      className={inputClass}
                      placeholder="Contoh: 3"
                    />
                  </div>

                  {form.muzakki_id && jiwa > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                        📋 Detail Jiwa ({jiwa} orang) — <span className="text-red-600 font-bold">WAJIB DIISI SEMUA</span>
                      </div>
                      <div className="divide-y max-h-64 overflow-y-auto">
                        {jiwaList.slice(0, jiwa).map((j, i) => (
                          <div key={i} className="p-3 bg-white">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-slate-500 mt-2 w-5">{i + 1}.</span>
                              <div className="flex-1 space-y-2">
                                <div>
                                  <label className="block text-xs text-slate-600 mb-1">
                                    Nama {j.is_kepala_keluarga ? '(Kepala Keluarga)' : `(Anggota ${i})`} *
                                  </label>
                                  <input
                                    type="text"
                                    value={j.nama}
                                    onChange={(e) => updateNamaJiwa(i, e.target.value)}
                                    disabled={j.is_kepala_keluarga}
                                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                                      j.is_kepala_keluarga
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                                    }`}
                                    placeholder={j.is_kepala_keluarga ? 'Otomatis dari data muzakki' : 'Ketik nama anggota'}
                                  />
                                </div>
                                <div className="text-xs text-slate-500">
                                  📍 {j.alamat || '-'} {j.rt ? `| RT ${j.rt}` : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {jiwa > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                      <p className="text-sm font-semibold text-amber-800 mb-1">📋 Kewajiban yang Harus Dibayar:</p>
                      {form.jenis === 'uang' ? (
                        <p className="text-lg font-bold text-amber-900">Rp {kewajibanUang.toLocaleString('id-ID')}</p>
                      ) : (
                        <p className="text-lg font-bold text-amber-900">{kewajibanBeras} kg</p>
                      )}
                      <p className="text-xs text-amber-700 mt-1">
                        {jiwa} jiwa × {form.jenis === 'uang' ? `Rp ${nishabUang.toLocaleString('id-ID')}` : `${nishabBeras} kg`}
                      </p>
                    </div>
                  )}

                  {form.jenis === 'uang' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Dibayar (Rp) *</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Berat Dibayar (kg) *</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Harta (Rp) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 50000000"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Zakat = 2.5% otomatis</p>
                </div>
              )}

              {form.kategori === 'fidyah' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Hari *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.jumlah_jiwa}
                    onChange={(e) => setForm({ ...form, jumlah_jiwa: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 7"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Rp 15.000/hari</p>
                </div>
              )}

              {form.kategori === 'infaq_shodaqoh' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.nominal}
                    onChange={(e) => setForm({ ...form, nominal: onlyDigits(e.target.value) })}
                    className={inputClass}
                    placeholder="Contoh: 50000"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">✨ Otomatis masuk ke Kas Masjid</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                <input type="text" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} className={inputClass} />
              </div>

              {preview && preview.items.length > 0 && (
                <div className={`border rounded-lg p-3 ${preview.error ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-sm font-semibold mb-2 ${preview.error ? 'text-red-800' : 'text-emerald-800'}`}>
                    {preview.error ? '⚠️ PERHATIAN — Pembayaran Kurang' : '💡 Rincian Otomatis:'}
                  </p>
                  {preview.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-700">
                      <span>{it.label}</span>
                      <span className="font-medium">{it.nominal ? `Rp ${it.nominal.toLocaleString('id-ID')}` : `${it.berat} kg`}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50">Batal</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}