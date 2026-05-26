"""
========================================================
SCRIPT: generate_dataset.py
TUJUAN: Membuat dataset simulasi konsumsi energi dengan
        interval 15 MENIT selama 3 bulan yang realistis
        untuk testing model LSTM.

CARA PAKAI:
  Upload file ini ke Google Colab dan jalankan di SEL 0,
  atau jalankan di terminal lokal jika sudah ada Python.
  Script ini akan otomatis membuat file data_energi_15min.csv

OUTPUT:
  data_energi_15min.csv -> 8.640 baris data (90 hari x 96 interval/hari)

STRUKTUR KOLOM:
  timestamp     : Waktu interval (YYYY-MM-DD HH:MM:SS)
  avg_tegangan  : Rata-rata tegangan dalam interval (V)
  avg_arus      : Rata-rata arus dalam interval (A)
  avg_daya      : Rata-rata daya dalam interval (W)
  max_daya      : Daya puncak dalam interval (W)
  energi_kwh    : Energi dikonsumsi dalam interval ini (kWh)
  avg_frekuensi : Rata-rata frekuensi dalam interval (Hz)
  avg_pf        : Rata-rata power factor dalam interval
========================================================
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

# ─── KONFIGURASI ────────────────────────────────────────────
MULAI        = datetime(2025, 2, 1, 0, 0, 0)  # 1 Feb 2025, jam 00:00
JUMLAH_HARI  = 90                               # 3 bulan = 90 hari
INTERVAL_MIN = 15                               # Interval 15 menit
TOTAL_ROWS   = JUMLAH_HARI * (24 * 60 // INTERVAL_MIN)  # 90 x 96 = 8.640 baris

random.seed(42)
np.random.seed(42)

# ─── PROFIL BEBAN PER JAM (0–23) ─────────────────────────────
# Mendefinisikan berapa persen penggunaan daya relatif pada tiap jam.
# Ini mencerminkan kebiasaan pengguna rumah tangga pada umumnya.
PROFIL_BEBAN = {
    0:  0.15,   # Tengah malam (hampir tidak ada penggunaan)
    1:  0.12,
    2:  0.10,
    3:  0.10,
    4:  0.12,
    5:  0.20,   # Subuh (mulai ada aktivitas, menyalakan lampu)
    6:  0.65,   # Pagi (mandi air panas, sarapan, pompa air)
    7:  0.80,   # Pagi padat (puncak pagi)
    8:  0.60,   # Masih pagi, sebelum berangkat kerja
    9:  0.30,   # Penghuni mulai pergi
    10: 0.25,
    11: 0.30,
    12: 0.40,   # Tengah hari (kadang ada yang pulang makan)
    13: 0.35,
    14: 0.25,
    15: 0.30,
    16: 0.45,   # Sore, mulai pulang sekolah/kerja
    17: 0.70,   # Sore padat
    18: 0.85,   # Puncak sore (masak malam, lampu mulai nyala semua)
    19: 1.00,   # PUNCAK TERTINGGI (TV, AC, kipas, lampu, charger)
    20: 0.95,
    21: 0.85,
    22: 0.65,   # Mulai bersiap tidur
    23: 0.35,
}

# ─── FUNGSI GENERATE DATA PER INTERVAL ──────────────────────
def get_base_power(jam, hari_minggu, bulan):
    """
    Menghitung daya dasar (Watt) untuk satu interval 15 menit
    berdasarkan jam, hari dalam seminggu, dan bulan.
    """
    profil = PROFIL_BEBAN.get(jam, 0.3)

    # Penyesuaian akhir pekan (Sabtu=5, Minggu=6): lebih boros
    if hari_minggu >= 5:
        profil *= 1.25

    # Penyesuaian bulanan (Maret-April lebih panas → AC lebih sering)
    faktor_bulan = {2: 1.0, 3: 1.10, 4: 1.18}.get(bulan, 1.0)

    # Daya dasar rumah tangga: 200W idle s/d 1200W peak
    daya_base = 200 + (profil * 1000)
    daya_base *= faktor_bulan

    # Tambahkan noise acak ±15%
    noise = random.uniform(0.85, 1.15)
    return daya_base * noise


rows = []
current_time = MULAI
cumulative_kwh = 0.0  # Simulasi nilai kumulatif seperti PZEM-004T

for _ in range(TOTAL_ROWS):
    jam          = current_time.hour
    menit        = current_time.minute
    hari_minggu  = current_time.weekday()  # 0=Senin, 6=Minggu
    bulan        = current_time.month

    # Hitung rata-rata daya untuk interval ini (Watt)
    avg_daya = get_base_power(jam, hari_minggu, bulan)

    # Daya puncak: biasanya 1.5x - 2.5x dari rata-rata
    max_daya = avg_daya * random.uniform(1.4, 2.2)

    # Energi dalam 15 menit = Daya (W) × Waktu (jam) / 1000
    # 15 menit = 0.25 jam
    energi_kwh = (avg_daya * 0.25) / 1000

    # Simulasi lonjakan sesekali (8% kemungkinan per interval)
    if random.random() < 0.08:
        energi_kwh *= random.uniform(1.3, 1.8)
        avg_daya   *= random.uniform(1.3, 1.8)
        max_daya   *= random.uniform(1.5, 2.0)

    # Kumulatif kWh (seperti counter PZEM-004T)
    cumulative_kwh += energi_kwh

    # Simulasi data sensor
    avg_tegangan  = round(random.uniform(217.5, 228.0), 2)
    avg_arus      = round(avg_daya / avg_tegangan, 4)
    avg_frekuensi = round(random.uniform(49.8, 50.2), 2)
    avg_pf        = round(random.uniform(0.82, 0.98), 3)

    rows.append({
        'timestamp':      current_time.strftime('%Y-%m-%d %H:%M:%S'),
        'avg_tegangan':   round(avg_tegangan, 2),
        'avg_arus':       round(avg_arus, 4),
        'avg_daya':       round(avg_daya, 2),
        'max_daya':       round(max_daya, 2),
        'energi_kwh':     round(energi_kwh, 6),    # Energi dalam interval ini
        'avg_frekuensi':  avg_frekuensi,
        'avg_pf':         avg_pf,
    })

    # Maju ke interval berikutnya
    current_time += timedelta(minutes=INTERVAL_MIN)

# ─── SIMPAN KE CSV ───────────────────────────────────────────
df = pd.DataFrame(rows)
df.to_csv('data_energi_15min.csv', index=False)

# ─── RINGKASAN ───────────────────────────────────────────────
print("=" * 60)
print("✅ Dataset berhasil dibuat: data_energi_15min.csv")
print(f"   Total baris data   : {len(df):,} interval (90 hari × 96)")
print(f"   Rentang waktu      : {df['timestamp'].iloc[0]}")
print(f"                    s.d. {df['timestamp'].iloc[-1]}")
print(f"   Avg daya per inter : {df['avg_daya'].mean():.1f} W")
print(f"   Total energi sim   : {df['energi_kwh'].sum():.2f} kWh")
print(f"   Rata-rata kWh/hari : {df['energi_kwh'].sum() / JUMLAH_HARI:.3f} kWh")
print("=" * 60)
print("\n🔎 5 baris pertama:")
print(df.head(5).to_string(index=False))
print("\n🔎 5 baris terakhir:")
print(df.tail(5).to_string(index=False))
