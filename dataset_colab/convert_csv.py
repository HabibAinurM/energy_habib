"""
Script konversi: data_energi.csv (harian) → data_energi.csv (interval 15 menit)
Menghasilkan 8.640 baris (90 hari x 96 interval/hari)
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

MULAI        = datetime(2025, 2, 1, 0, 0, 0)
JUMLAH_HARI  = 90
INTERVAL_MIN = 15
TOTAL_ROWS   = JUMLAH_HARI * (24 * 60 // INTERVAL_MIN)

PROFIL_BEBAN = {
    0: 0.15, 1: 0.12, 2: 0.10, 3: 0.10, 4: 0.12, 5: 0.20,
    6: 0.65, 7: 0.80, 8: 0.60, 9: 0.30, 10: 0.25, 11: 0.30,
    12: 0.40, 13: 0.35, 14: 0.25, 15: 0.30, 16: 0.45, 17: 0.70,
    18: 0.85, 19: 1.00, 20: 0.95, 21: 0.85, 22: 0.65, 23: 0.35,
}

rows = []
current_time = MULAI

for _ in range(TOTAL_ROWS):
    jam         = current_time.hour
    hari_minggu = current_time.weekday()
    bulan       = current_time.month

    profil      = PROFIL_BEBAN.get(jam, 0.3)
    if hari_minggu >= 5: profil *= 1.25
    faktor_bln  = {2: 1.0, 3: 1.10, 4: 1.18}.get(bulan, 1.0)
    avg_daya    = (200 + profil * 1000) * faktor_bln * random.uniform(0.85, 1.15)
    max_daya    = avg_daya * random.uniform(1.4, 2.2)
    energi_kwh  = (avg_daya * 0.25) / 1000

    if random.random() < 0.08:
        energi_kwh *= random.uniform(1.3, 1.8)
        avg_daya   *= random.uniform(1.3, 1.8)
        max_daya   *= random.uniform(1.5, 2.0)

    avg_tegangan  = random.uniform(217.5, 228.0)
    avg_arus      = avg_daya / avg_tegangan
    avg_frekuensi = random.uniform(49.8, 50.2)
    avg_pf        = random.uniform(0.82, 0.98)

    rows.append({
        'timestamp':     current_time.strftime('%Y-%m-%d %H:%M:%S'),
        'avg_tegangan':  round(avg_tegangan, 2),
        'avg_arus':      round(avg_arus, 4),
        'avg_daya':      round(avg_daya, 2),
        'max_daya':      round(max_daya, 2),
        'energi_kwh':    round(energi_kwh, 6),
        'avg_frekuensi': round(avg_frekuensi, 2),
        'avg_pf':        round(avg_pf, 3),
    })
    current_time += timedelta(minutes=INTERVAL_MIN)

df = pd.DataFrame(rows)
df.to_csv('data_energi.csv', index=False)
print(f"Selesai! {len(df):,} baris ditulis ke data_energi.csv")
print(df.head(5).to_string(index=False))
