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

function gambarKop(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()

  try {
    doc.addImage(MASJID.logo, 'PNG', 14, 10, 24, 24)
  } catch (e) {
    console.warn('Logo tidak bisa dimuat:', e)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(MASJID.nama1, 42, 17)

  doc.setFontSize(18)
  doc.text(MASJID.nama2, 42, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(MASJID.alamat1, 42, 31)
  doc.text(MASJID.alamat2, 42, 35)
  doc.text(MASJID.alamat3, 42, 39)

  doc.setLineWidth(0.5)
  doc.line(14, 42, pageWidth - 14, 42)
}

// ==================
// BUKTI PENERIMAAN
// ==================
export function cetakBuktiPenerimaan(data) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  gambarKop(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('BUKTI PENERIMAAN ZAKAT', pageWidth / 2, 52, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`No. Bukti: ${data.kode}`, 14, 62)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 67)

  doc.setFont('helvetica', 'bold')
  doc.text('Muzakki:', 14, 76)

  doc.setFont('helvetica', 'normal')
  doc.text(`Nama    : ${data.muzakki?.nama || '-'}`, 14, 82)
  doc.text(`Alamat  : ${data.muzakki?.alamat || '-'}`, 14, 87)
  doc.text(`RT      : ${data.muzakki?.rt || '-'}`, 14, 92)

  let currentY = 100
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

  doc.setFont('helvetica', 'bold')
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

  const ttdY = currentY + 20
  const ttdLeft = 40
  const ttdRight = pageWidth - 60

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Cikarang, ${tanggalIndo(data.tanggal)}`, ttdRight, ttdY - 5)

  doc.text('Amil Zakat,', ttdLeft, ttdY)
  doc.text('Ketua DKM,', ttdRight, ttdY)

  doc.setLineWidth(0.3)
  doc.line(ttdLeft - 5, ttdY + 25, ttdLeft + 35, ttdY + 25)
  doc.line(ttdRight - 5, ttdY + 25, ttdRight + 35, ttdY + 25)

  doc.setFontSize(9)
  doc.text('(............................)', ttdLeft, ttdY + 30)
  doc.text('(............................)', ttdRight, ttdY + 30)

  doc.setFontSize(8)
  doc.setTextColor(128)
  doc.text(
    'Bukti ini sah sebagai tanda terima zakat. Simpan sebagai arsip.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  )

  // ⭐ AUTO DOWNLOAD — cara paling ampuh
  doc.save(`Bukti-Penerimaan-${data.kode}.pdf`)
}

// ==================
// BUKTI PENYALURAN
// ==================
export function cetakBuktiPenyaluran(data, daftarPenerima) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  gambarKop(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('BUKTI PENYALURAN ZAKAT', pageWidth / 2, 52, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`No. Bukti: ${data.kode}`, 14, 62)
  doc.text(`Tanggal  : ${tanggalIndo(data.tanggal)}`, 14, 67)
  doc.text(`Jenis    : ${data.jenis === 'uang' ? 'Uang' : 'Beras'}`, 14, 72)

  const total = data.total_dibagikan || 0
  const perOrang = data.total_diterima_per_orang || 0
  const jumlah = data.jumlah_penerima || 0

  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan:', 14, 82)

  doc.setFont('helvetica', 'normal')
  const totalStr = data.jenis === 'uang' ? rp(total) : `${total.toFixed(3)} kg`
  const perStr =
    data.jenis === 'uang' ? rp(perOrang) : `${perOrang.toFixed(3)} kg`

  doc.text(`Total Dibagikan : ${totalStr}`, 14, 88)
  doc.text(`Per Orang       : ${perStr}`, 14, 93)
  doc.text(`Jumlah Penerima : ${jumlah} orang`, 14, 98)

  autoTable(doc, {
    startY: 105,
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

  const ttdY = doc.lastAutoTable.finalY + 15
  const ttdLeft = 40
  const ttdRight = pageWidth - 60

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Cikarang, ${tanggalIndo(data.tanggal)}`, ttdRight, ttdY - 5)

  doc.text('Amil Zakat,', ttdLeft, ttdY)
  doc.text('Ketua DKM,', ttdRight, ttdY)

  doc.setLineWidth(0.3)
  doc.line(ttdLeft - 5, ttdY + 25, ttdLeft + 35, ttdY + 25)
  doc.line(ttdRight - 5, ttdY + 25, ttdRight + 35, ttdY + 25)

  doc.setFontSize(9)
  doc.text('(............................)', ttdLeft, ttdY + 30)
  doc.text('(............................)', ttdRight, ttdY + 30)

  doc.setFontSize(8)
  doc.setTextColor(128)
  doc.text(
    'Bukti ini sah sebagai tanda terima penyaluran zakat. Simpan sebagai arsip.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  )

  // ⭐ AUTO DOWNLOAD
  doc.save(`Bukti-Penyaluran-${data.kode}.pdf`)
}