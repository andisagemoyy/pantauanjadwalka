PANTAUAN JADWAL KA JAKARTA KOTA (JAKK)
========================================

CARA MEMBUKA
1. Ekstrak seluruh isi ZIP ke satu folder.
2. Buka file index.html memakai Chrome, Edge, atau Firefox.
3. Website bekerja secara offline dan tidak membutuhkan instalasi.

FUNGSI
- Slide KA DATANG berwarna merah.
- Slide KA BERANGKAT berwarna hijau.
- Daftar otomatis mengikuti jam dan tanggal pada perangkat.
- Baris berkedip selama menit jadwal berlangsung.
- Setiap slide menampilkan 10 baris sekaligus dan seluruh jadwal dapat digulir.
- Kolom pencarian membawa daftar langsung ke nomor KA dan menampilkan jam tepatnya.
- Tombol Refresh menghapus pencarian dan mengembalikan daftar ke jadwal sekitar waktu sekarang.
- Slide dapat diganti melalui tab, tombol panah, keyboard panah, atau usapan layar.

CARA PENCARIAN DAN REFRESH
1. Buka slide KA DATANG atau KA BERANGKAT sesuai jadwal yang ingin dilihat.
2. Ketik nomor KA pada kolom pencarian, lalu tekan Enter atau tombol Cari.
3. Baris KA akan tampil di tengah daftar dengan tanda oranye dan jam tepatnya.
4. Setelah menggulir atau mencari jadwal lain, tekan Refresh agar daftar kembali
   ke posisi waktu perangkat saat ini.

DATA
- Sumber: DAFTAR JALUR JAKK GAPEKA (1).pdf
- Berlaku mulai: 1 Februari 2025
- 228 jadwal KA datang
- 226 jadwal KA berangkat
- Total: 454 jadwal

CATATAN PEMERIKSAAN
Halaman 1-14 diverifikasi melalui dua hasil pembacaan tabel yang sama persis.
Halaman 15 berupa hasil pindai dan enam baris terakhir diperiksa langsung dari gambar:
- Datang 23:27 / KA 1465
- Berangkat 23:30 / KA 1466
- Berangkat 23:35 / KA 1468
- Datang 23:37 / KA 6083
- Datang 23:42 / KA 1467
- Berangkat 23:50 / KA 1470

STRUKTUR FILE
- index.html           Tampilan utama
- style.css            Warna, tata letak, animasi, dan tampilan responsif
- app.js               Jam perangkat, pergantian slide, dan logika jadwal
- schedule-data.js     Seluruh nomor KA dan jam
- assets/kai-logo.png  Logo dari dokumen sumber

Untuk mengubah jadwal di kemudian hari, edit pasangan ["JAM", "NOMOR KA"]
pada schedule-data.js dan pertahankan urutan waktunya.
