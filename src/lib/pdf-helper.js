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

// === KOP MASJID (LOGO KIRI + TEKS CENTER DI SISI KANAN) ===
function gambarKop(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Logo kiri, ukuran 28x28
  try {
    doc.addImage(MASJID.logo, 'PNG', 14, 14, 28, 28)
  } catch (e) {
    console.warn('Logo tidak bisa dimuat:', e)
  }

  // Area teks di kanan logo — teks di-center di area ini
  const areaKiri = 48
  const areaKanan = pageWidth - 14
  const centerText = (areaKiri + areaKanan) / 2

  // Nama DKM
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(MASJID.nama1, centerText, 20, { align: 'center' })

  // Nurul Huda
  doc.setFontSize(16)
  doc.text(MASJID.nama2, centerText, 28, { align: 'center' })

  // Alamat (abu soft)
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(MASJID.alamat1, centerText, 34, { align: 'center' })
  doc.text(MASJID.alamat2, centerText, 38, { align: 'center' })
  doc.text(MASJID.alamat3, centerText, 42, { align: 'center' })

  // Garis embossed (abu terang + gelap)
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.8)
  doc.line(14, 47.3, pageWidth - 14, 47.3)

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(14, 47, pageWidth - 14, 47)

  // Reset warna teks
  doc.setTextColor(0, 0, 0)
}

// === TANDA TANGAN (CENTER, TANPA GARIS) ===
function gambarTandaTangan(doc, tanggal) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200

  // Tanggal kanan
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Cikarang, ${tanggalIndo(tanggal)}`, pageWidth - 40, y, {
    align: 'center',
  })

  const col1X = 60
  const col2X = pageWidth - 60
  const ttdY = y + 8

  // Amil Zakat (kiri)
  doc.setFontSize(10)
  doc.text('Amil Zakat,', col1X, ttdY, { align: 'center' })
  doc.text('(............................)', col1X, ttdY + 30, {
    align: 'center',
  })

  // Ketua DKM (kanan)
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
  doc.text('BUKTI PENERIMAAN ZAKAT', pageWidth / 2, 58, { align: 'center' })

  // Info bukti
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`No. Bukti: ${data.kode}`, 14, 68)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 73)

  // Info muzakki
  doc.setFont('helvetica', 'bold')
  doc.text('Muzakki:', 14, 82)

  doc.setFont('helvetica', 'normal')
  doc.text(`Nama    : ${data.muzakki?.nama || '-'}`, 14, 88)
  doc.text(`Alamat  : ${data.muzakki?.alamat || '-'}`, 14, 93)
  doc.text(`RT      : ${data.muzakki?.rt || '-'}`, 14, 98)

  // Detail jiwa
  let currentY = 106
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
  doc.text('BUKTI PENYALURAN ZAKAT', pageWidth / 2, 58, { align: 'center' })

  // Info bukti
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`No. Bukti: ${data.kode}`, 14, 68)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 73)
  doc.text(`Jenis    : ${data.jenis === 'uang' ? 'Uang' : 'Beras'}`, 14, 78)

  // Ringkasan
  const total = data.total_dibagikan || 0
  const perOrang = data.total_diterima_per_orang || 0
  const jumlah = data.jumlah_penerima || 0

  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan:', 14, 88)

  doc.setFont('helvetica', 'normal')
  const totalStr = data.jenis === 'uang' ? rp(total) : `${total.toFixed(3)} kg`
  const perStr =
    data.jenis === 'uang' ? rp(perOrang) : `${perOrang.toFixed(3)} kg`

  doc.text(`Total Dibagikan : ${totalStr}`, 14, 94)
  doc.text(`Per Orang       : ${perStr}`, 14, 99)
  doc.text(`Jumlah Penerima : ${jumlah} orang`, 14, 104)

  // Tabel daftar penerima
  autoTable(doc, {
    startY: 111,
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

  doc.save(`Bukti-Penyaluran-${data.kode}.pdf`)
}