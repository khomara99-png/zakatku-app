'use client'

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ===== KONFIGURASI MASJID =====
const MASJID = {
  nama1: 'DEWAN KEMAKMURAN MASJID (DKM)',
  nama2: 'NURUL HUDA',
  alamat1: 'Sekretariat: Perum Telaga Harapan Block G RW.11',
  alamat2: 'Desa Telaga Murni, Kec. Cikarang Barat',
  alamat3: 'Kabupaten Bekasi, Kode Pos 17530',
  logo: '/logo-masjid.png',
}

function rp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function tanggalIndo(tgl) {
  if (!tgl) return '-'
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const d = new Date(tgl)
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
}

// === KOP MASJID (CENTERED + GARIS EMBOSSED) ===
function gambarKop(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const centerX = pageWidth / 2

  // Logo di tengah atas
  try {
    doc.addImage(MASJID.logo, 'PNG', centerX - 12, 10, 24, 24)
  } catch (e) {
    console.warn('Logo tidak bisa dimuat:', e)
  }

  // Nama masjid (center) — warna hitam soft, bukan hitam pekat
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(MASJID.nama1, centerX, 40, { align: 'center' })

  doc.setFontSize(18)
  doc.text(MASJID.nama2, centerX, 48, { align: 'center' })

  // Alamat (center) — warna abu soft (embossed look)
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(MASJID.alamat1, centerX, 54, { align: 'center' })
  doc.text(MASJID.alamat2, centerX, 58, { align: 'center' })
  doc.text(MASJID.alamat3, centerX, 62, { align: 'center' })

  // === GARIS EMBOSSED (abu soft, kesan timbul) ===
  // Garis bayangan (lebih gelap di bawah)
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.8)
  doc.line(14, 66.3, pageWidth - 14, 66.3)

  // Garis utama (terang di atas, kesan embossed)
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(14, 66, pageWidth - 14, 66)

  // Reset warna teks ke hitam untuk konten berikutnya
  doc.setTextColor(0, 0, 0)
}

// === TANDA TANGAN (CENTERED, TANPA GARIS) ===
function gambarTandaTangan(doc, tanggal) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200

  // Tanggal di kanan
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Cikarang, ${tanggalIndo(tanggal)}`, pageWidth - 40, y, {
    align: 'center',
  })

  // Posisi tanda tangan — 2 kolom
  const col1X = 60
  const col2X = pageWidth - 60
  const ttdY = y + 8

  // === AMIL ZAKAT (kiri) ===
  doc.setFontSize(10)
  doc.text('Amil Zakat,', col1X, ttdY, { align: 'center' })

  // Ruang tanda tangan (kosong untuk ttd manual)
  // Tanpa garis — hanya spasi

  // Nama terang (titik-titik) — di bawah ruang ttd
  doc.setFontSize(10)
  doc.text('(............................)', col1X, ttdY + 30, {
    align: 'center',
  })

  // === KETUA DKM (kanan) ===
  doc.text('Ketua DKM,', col2X, ttdY, { align: 'center' })
  doc.text('(............................)', col2X, ttdY + 30, {
    align: 'center',
  })
}

// ==================
// BUKTI PENERIMAAN
// ==================
export function cetakBuktiPenerimaan(data) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  gambarKop(doc)

  // Judul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(40, 40, 40)
  doc.text('BUKTI PENERIMAAN ZAKAT', pageWidth / 2, 76, { align: 'center' })

  // Info bukti
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`No. Bukti: ${data.kode}`, 14, 86)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 91)

  // Info muzakki
  doc.setFont('helvetica', 'bold')
  doc.text('Muzakki:', 14, 100)

  doc.setFont('helvetica', 'normal')
  doc.text(`Nama    : ${data.muzakki?.nama || '-'}`, 14, 106)
  doc.text(`Alamat  : ${data.muzakki?.alamat || '-'}`, 14, 111)
  doc.text(`RT      : ${data.muzakki?.rt || '-'}`, 14, 116)

  // Detail jiwa
  let currentY = 124
  if (data.jiwa && data.jiwa.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Detail Jiwa (${data.jiwa.length} orang):`, 14, currentY)

    autoTable(doc, {
      startY: currentY + 3,
      head: [['No', 'Nama', 'Status']],
      body: data.jiwa.map((j, i) => [
        i + 1,
        j.nama || '-',
        j.is_kepala_keluarga ? 'Kepala Keluarga' : 'Anggota',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        2: { cellWidth: 45 },
      },
      margin: { left: 14, right: 14 },
    })

    currentY = doc.lastAutoTable.finalY + 8
  }

  // Rincian zakat
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Rincian Zakat:', 14, currentY)

  const detail = data.detail || []
  const total = detail.reduce((s, d) => {
    if (d.jenis === 'uang') return s + Number(d.nominal || 0)
    return s
  }, 0)

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Kategori', 'Jenis', 'Jumlah']],
    body: detail.map((d) => [
      d.kategori
        ? d.kategori.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '-',
      d.jenis === 'uang' ? 'Uang' : 'Beras',
      d.jenis === 'uang' ? rp(d.nominal) : `${d.berat_kg} kg`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  })

  currentY = doc.lastAutoTable.finalY + 5

  if (total > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`TOTAL DITERIMA: ${rp(total)}`, pageWidth - 14, currentY, {
      align: 'right',
    })
  }

  // Tanda tangan
  gambarTandaTangan(doc, data.tanggal)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Bukti ini sah sebagai tanda terima zakat. Simpan sebagai arsip.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  )

  // Auto download
  doc.save(`Bukti-Penerimaan-${data.kode}.pdf`)
}

// ==================
// BUKTI PENYALURAN
// ==================
export function cetakBuktiPenyaluran(data, daftarPenerima) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  gambarKop(doc)

  // Judul
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(40, 40, 40)
  doc.text('BUKTI PENYALURAN ZAKAT', pageWidth / 2, 76, { align: 'center' })

  // Info bukti
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`No. Bukti: ${data.kode}`, 14, 86)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 91)
  doc.text(`Jenis    : ${data.jenis === 'uang' ? 'Uang' : 'Beras'}`, 14, 96)

  // Ringkasan
  const total = data.total_dibagikan || 0
  const perOrang = data.total_diterima_per_orang || 0
  const jumlah = data.jumlah_penerima || 0

  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan:', 14, 106)

  doc.setFont('helvetica', 'normal')
  const totalStr = data.jenis === 'uang' ? rp(total) : `${total.toFixed(3)} kg`
  const perStr =
    data.jenis === 'uang' ? rp(perOrang) : `${perOrang.toFixed(3)} kg`

  doc.text(`Total Dibagikan : ${totalStr}`, 14, 112)
  doc.text(`Per Orang       : ${perStr}`, 14, 117)
  doc.text(`Jumlah Penerima : ${jumlah} orang`, 14, 122)

  // Tabel daftar penerima
  autoTable(doc, {
    startY: 129,
    head: [['No', 'Nama Penerima', 'Asnaf', 'Diterima']],
    body: (daftarPenerima || []).map((m, i) => [
      i + 1,
      m.nama || '-',
      m.asnaf || '-',
      data.jenis === 'uang' ? rp(perOrang) : `${perOrang.toFixed(3)} kg`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      2: { cellWidth: 40 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  })

  // Tanda tangan
  gambarTandaTangan(doc, data.tanggal)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Bukti ini sah sebagai tanda terima penyaluran zakat. Simpan sebagai arsip.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  )

  // Auto download
  doc.save(`Bukti-Penyaluran-${data.kode}.pdf`)
}