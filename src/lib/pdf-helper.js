// === KOP MASJID (LOGO KIRI + TEKS LEBIH BESAR) ===
function gambarKop(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Logo kiri, ukuran 30x30 (sedikit lebih besar)
  try {
    doc.addImage(MASJID.logo, 'PNG', 14, 12, 30, 30)
  } catch (e) {
    console.warn('Logo tidak bisa dimuat:', e)
  }

  // Area teks — lebih lebar, mulai lebih dekat ke logo
  const areaKiri = 48
  const areaKanan = pageWidth - 14
  const centerText = (areaKiri + areaKanan) / 2

  // Nama DKM — font diperbesar (11 → 13)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(MASJID.nama1, centerText, 20, { align: 'center' })

  // Nurul Huda — font diperbesar (16 → 20)
  doc.setFontSize(20)
  doc.text(MASJID.nama2, centerText, 29, { align: 'center' })

  // Alamat — font diperbesar (8 → 9.5)
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(MASJID.alamat1, centerText, 36, { align: 'center' })
  doc.text(MASJID.alamat2, centerText, 40.5, { align: 'center' })
  doc.text(MASJID.alamat3, centerText, 45, { align: 'center' })

  // Garis embossed (abu terang + gelap)
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.8)
  doc.line(14, 50.3, pageWidth - 14, 50.3)

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(14, 50, pageWidth - 14, 50)

  // Reset warna teks
  doc.setTextColor(0, 0, 0)
}