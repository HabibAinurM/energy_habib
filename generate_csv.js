/**
 * generate_csv.js
 * Jalankan dengan: node dataset_colab/generate_csv.js
 * Output: dataset_colab/data_energi.csv (8.640 baris interval 15 menit)
 */
const fs   = require('fs');
const path = require('path');

// ─── PROFIL BEBAN PER JAM (0.0 = rendah, 1.0 = puncak) ─────────
const PROFIL_BEBAN = {
  0: 0.15, 1: 0.12, 2: 0.10, 3: 0.10, 4: 0.12, 5: 0.20,
  6: 0.65, 7: 0.80, 8: 0.60, 9: 0.30, 10: 0.25, 11: 0.30,
  12: 0.40, 13: 0.35, 14: 0.25, 15: 0.30, 16: 0.45, 17: 0.70,
  18: 0.85, 19: 1.00, 20: 0.95, 21: 0.85, 22: 0.65, 23: 0.35,
};

// ─── Pseudo-random deterministik (seed 42) ──────────────────────
let seed = 42;
function seededRandom() {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff;
  return (seed >>> 0) / 0xffffffff;
}
function randBetween(min, max) {
  return min + seededRandom() * (max - min);
}

// ─── KONFIGURASI ─────────────────────────────────────────────────
const MULAI        = new Date('2025-02-01T00:00:00');
const JUMLAH_HARI  = 90;
const INTERVAL_MIN = 15;
const TOTAL_ROWS   = JUMLAH_HARI * (24 * 60 / INTERVAL_MIN); // 8.640

// ─── GENERATE BARIS DATA ─────────────────────────────────────────
const header = 'timestamp,avg_tegangan,avg_arus,avg_daya,max_daya,energi_kwh,avg_frekuensi,avg_pf';
const lines  = [header];

let currentTime = new Date(MULAI);

for (let i = 0; i < TOTAL_ROWS; i++) {
  const jam        = currentTime.getHours();
  const hariMinggu = currentTime.getDay(); // 0=Minggu, 6=Sabtu
  const bulan      = currentTime.getMonth() + 1;

  let profil = PROFIL_BEBAN[jam] ?? 0.3;

  // Akhir pekan (Sabtu=6, Minggu=0) lebih boros
  if (hariMinggu === 0 || hariMinggu === 6) profil *= 1.25;

  // Faktor musiman
  const faktorBln = bulan === 3 ? 1.10 : bulan === 4 ? 1.18 : 1.0;

  let avgDaya = (200 + profil * 1000) * faktorBln * randBetween(0.85, 1.15);
  let maxDaya = avgDaya * randBetween(1.4, 2.2);

  // Energi (kWh) = Daya (W) × 0.25 jam / 1000
  let energiKwh = (avgDaya * 0.25) / 1000;

  // Lonjakan sesekali (8% kemungkinan)
  if (seededRandom() < 0.08) {
    const spike = randBetween(1.3, 1.8);
    energiKwh *= spike;
    avgDaya   *= spike;
    maxDaya   *= randBetween(1.5, 2.0);
  }

  const avgTegangan  = randBetween(217.5, 228.0);
  const avgArus      = avgDaya / avgTegangan;
  const avgFrekuensi = randBetween(49.8, 50.2);
  const avgPf        = randBetween(0.82, 0.98);

  // Format timestamp: YYYY-MM-DD HH:MM:SS
  const ts = currentTime.toISOString().replace('T', ' ').slice(0, 19);

  lines.push([
    ts,
    avgTegangan.toFixed(2),
    avgArus.toFixed(4),
    avgDaya.toFixed(2),
    maxDaya.toFixed(2),
    energiKwh.toFixed(6),
    avgFrekuensi.toFixed(2),
    avgPf.toFixed(3),
  ].join(','));

  // Tambah 15 menit ke waktu berikutnya
  currentTime = new Date(currentTime.getTime() + INTERVAL_MIN * 60 * 1000);
}

// ─── SIMPAN FILE ─────────────────────────────────────────────────
const outputPath = path.join(__dirname, 'dataset_colab', 'data_energi.csv');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log('='.repeat(55));
console.log('✅ data_energi.csv berhasil dibuat!');
console.log(`   Total baris : ${lines.length - 1} interval`);
console.log(`   Rentang     : 2025-02-01 00:00 s.d. 2025-04-30 23:45`);
console.log(`   Format      : Interval 15 menit`);
console.log(`   Lokasi      : ${outputPath}`);
console.log('='.repeat(55));
