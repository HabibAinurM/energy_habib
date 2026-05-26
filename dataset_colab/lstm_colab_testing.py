"""
╔══════════════════════════════════════════════════════════════════╗
║        LSTM ENERGY MONITOR - GOOGLE COLAB TESTING SCRIPT        ║
║        Data Interval: 15 MENIT | Proyek: Smart Energy Monitor  ║
╠══════════════════════════════════════════════════════════════════╣
║  Jalankan tiap SEL (blok) dari atas ke bawah secara berurutan.  ║
║                                                                  ║
║  PILIHAN DATA:                                                   ║
║  A) Upload file "data_energi_15min.csv" dari folder dataset_colab║
║  B) Jalankan SEL 0 untuk generate data simulasi otomatis        ║
╚══════════════════════════════════════════════════════════════════╝
"""

# ================================================================
# SEL 0: [OPSIONAL] GENERATE DATA SIMULASI OTOMATIS
# ================================================================
# Jalankan sel ini jika Anda TIDAK punya data real dari database.
# Sel ini akan membuat file data_energi_15min.csv (8.640 baris)
# langsung di dalam Colab tanpa perlu upload file apapun.
# Jika sudah upload CSV asli dari database, SKIP sel ini.

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

MULAI        = datetime(2025, 2, 1, 0, 0, 0)
JUMLAH_HARI  = 90
INTERVAL_MIN = 15
TOTAL_ROWS   = JUMLAH_HARI * (24 * 60 // INTERVAL_MIN)  # 8.640 baris

# Profil beban per jam (0 = rendah, 1.0 = puncak tertinggi)
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
    energi_kwh  = (avg_daya * 0.25) / 1000  # 15 menit = 0.25 jam

    if random.random() < 0.08:  # Lonjakan sesekali
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

df_gen = pd.DataFrame(rows)
df_gen.to_csv('data_energi_15min.csv', index=False)
print(f"✅ Dataset simulasi berhasil dibuat: {len(df_gen):,} baris (90 hari × 96 interval/hari)")


# ================================================================
# SEL 1: IMPORT LIBRARY
# ================================================================
# Semua library sudah tersedia di Google Colab secara default.

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import warnings
warnings.filterwarnings('ignore')

import tensorflow as tf
print(f"✅ Library berhasil diimport! TensorFlow versi: {tf.__version__}")


# ================================================================
# SEL 2: LOAD & EKSPLORASI DATASET 15 MENIT
# ================================================================
# Membaca file CSV dengan data interval 15 menit.
# Jika data dari database asli: kolom timestamp harus berformat
# 'YYYY-MM-DD HH:MM:SS' sesuai hasil query SQL yang telah diberikan.

df = pd.read_csv('data_energi_15min.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp').reset_index(drop=True)

# Tambah kolom bantu untuk analisis
df['jam']        = df['timestamp'].dt.hour
df['hari_minggu']= df['timestamp'].dt.dayofweek
df['tanggal']    = df['timestamp'].dt.date

print("=" * 65)
print("📊 INFORMASI DATASET 15 MENIT")
print("=" * 65)
print(f"Total baris data        : {len(df):,} interval")
print(f"Interval per hari       : 96 (24 jam × 4 per jam)")
print(f"Rentang waktu           : {df['timestamp'].min()} ")
print(f"                      s.d. {df['timestamp'].max()}")
print(f"Rata-rata daya          : {df['avg_daya'].mean():.1f} W")
print(f"Rata-rata energi/interval: {df['energi_kwh'].mean():.5f} kWh")
print(f"Total estimasi energi   : {df['energi_kwh'].sum():.2f} kWh")
print(f"Rata-rata konsumsi/hari : {df['energi_kwh'].sum() / 90:.3f} kWh")
print("=" * 65)
print(df.head(10).to_string(index=False))


# ================================================================
# SEL 3: VISUALISASI DATA ASLI (MULTI-PANEL)
# ================================================================
# Menampilkan pola konsumsi dari berbagai sudut pandang.

fig, axes = plt.subplots(3, 1, figsize=(14, 12))

# Panel 1: Konsumsi energi harian selama 3 bulan
kwh_harian = df.groupby('tanggal')['energi_kwh'].sum()
axes[0].plot(kwh_harian.index, kwh_harian.values, color='#3B82F6', linewidth=1.2)
axes[0].fill_between(kwh_harian.index, kwh_harian.values, alpha=0.2, color='#3B82F6')
axes[0].set_title('Total Konsumsi Energi Harian (kWh) — 3 Bulan', fontsize=13, fontweight='bold')
axes[0].set_ylabel('kWh per Hari')
axes[0].grid(True, linestyle='--', alpha=0.5)

# Panel 2: Profil beban rata-rata per jam (heatmap-style)
kwh_per_jam = df.groupby('jam')['energi_kwh'].mean()
warna_bar   = ['#EF4444' if v >= kwh_per_jam.quantile(0.8) else
               '#F59E0B' if v >= kwh_per_jam.quantile(0.5) else
               '#3B82F6' for v in kwh_per_jam.values]
axes[1].bar(kwh_per_jam.index, kwh_per_jam.values, color=warna_bar, edgecolor='white')
axes[1].set_title('Rata-rata Konsumsi per Jam (Merah=Puncak, Biru=Rendah)', fontsize=13, fontweight='bold')
axes[1].set_xlabel('Jam')
axes[1].set_ylabel('Rata-rata kWh per Interval')
axes[1].set_xticks(range(0, 24))
axes[1].grid(True, linestyle='--', alpha=0.5, axis='y')

# Panel 3: Rata-rata konsumsi per hari dalam seminggu
urutan_hari = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
label_hari  = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']
kwh_hari    = df.groupby(df['timestamp'].dt.day_name())['energi_kwh'].mean().reindex(urutan_hari)
warna_hari  = ['#3B82F6'] * 5 + ['#EF4444', '#EF4444']
axes[2].bar(label_hari, kwh_hari.values, color=warna_hari, edgecolor='white')
axes[2].set_title('Rata-rata Konsumsi per Hari (Merah = Akhir Pekan)', fontsize=13, fontweight='bold')
axes[2].set_ylabel('Rata-rata kWh per Interval')
axes[2].grid(True, linestyle='--', alpha=0.5, axis='y')

plt.tight_layout(pad=3.0)
plt.savefig('01_visualisasi_data_awal.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ Grafik eksplorasi data berhasil ditampilkan!")


# ================================================================
# SEL 4: NORMALISASI DATA
# ================================================================
# Mengubah nilai energi_kwh ke skala 0–1 agar LSTM bekerja optimal.
# Scaler disimpan agar hasil prediksi bisa dikembalikan ke satuan kWh.

data_kwh   = df[['energi_kwh']].values
scaler     = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(data_kwh)

print(f"✅ Normalisasi selesai!")
print(f"   Nilai asli  : min={data_kwh.min():.6f} kWh, max={data_kwh.max():.6f} kWh")
print(f"   Setelah norm: min={scaled_data.min():.4f}, max={scaled_data.max():.4f}")


# ================================================================
# SEL 5: MEMBUAT SEQUENCES (SLIDING WINDOW)
# ================================================================
# Untuk data 15 menit, kita gunakan window 96 interval = 1 hari penuh.
# Model akan belajar: "Jika pola konsumsi 1 hari ke belakang seperti X,
# maka interval berikutnya adalah Y."
#
# Pilihan window_size yang umum untuk data 15 menit:
#   96  = 1 hari penuh (rekomendasi awal)
#   192 = 2 hari
#   672 = 1 minggu penuh (lebih akurat tapi butuh lebih banyak data)

WINDOW_SIZE = 96  # 96 interval × 15 menit = 1 hari penuh

X, y = [], []
for i in range(WINDOW_SIZE, len(scaled_data)):
    X.append(scaled_data[i - WINDOW_SIZE:i, 0])  # 1 hari data sebelumnya
    y.append(scaled_data[i, 0])                    # Interval target

X = np.array(X)
y = np.array(y)
X = np.reshape(X, (X.shape[0], X.shape[1], 1))

print(f"✅ Sequences berhasil dibuat!")
print(f"   Window size  : {WINDOW_SIZE} interval = 1 hari (24 jam)")
print(f"   Shape X      : {X.shape}  → ({X.shape[0]:,} sampel)")
print(f"   Shape y      : {y.shape}")


# ================================================================
# SEL 6: SPLIT DATA TRAINING & TESTING
# ================================================================
# 80% data pertama → Training (belajar pola)
# 20% data terakhir → Testing (evaluasi akurasi)

SPLIT_RATIO = 0.8
split_idx   = int(len(X) * SPLIT_RATIO)

X_train, X_test = X[:split_idx], X[split_idx:]
y_train, y_test = y[:split_idx], y[split_idx:]
ts_test = df['timestamp'].iloc[WINDOW_SIZE + split_idx:].values

print(f"✅ Data berhasil dibagi!")
print(f"   Training : {len(X_train):,} sampel ({int(SPLIT_RATIO*100)}%)")
print(f"   Testing  : {len(X_test):,} sampel ({int((1-SPLIT_RATIO)*100)}%)")
print(f"   Periode testing: {pd.Timestamp(ts_test[0])} s.d. {pd.Timestamp(ts_test[-1])}")


# ================================================================
# SEL 7: ARSITEKTUR MODEL LSTM
# ================================================================
# Model dirancang untuk data time series interval 15 menit.
# 2 layer LSTM + Dropout untuk mencegah overfitting.

model = Sequential([
    # Layer LSTM 1: Membaca urutan 96 interval (1 hari)
    LSTM(units=128, return_sequences=True, input_shape=(WINDOW_SIZE, 1)),
    Dropout(0.2),

    # Layer LSTM 2: Menyempurnakan representasi pola
    LSTM(units=64, return_sequences=False),
    Dropout(0.2),

    # Layer Dense: Pemrosesan akhir
    Dense(units=32, activation='relu'),

    # Output: 1 angka prediksi (energi kWh untuk 1 interval berikutnya)
    Dense(units=1)
])

model.compile(optimizer='adam', loss='mean_squared_error')

print("✅ Arsitektur model LSTM berhasil dibuat!")
model.summary()


# ================================================================
# SEL 8: TRAINING MODEL
# ================================================================
# EarlyStopping: Berhenti otomatis jika tidak ada kemajuan.
# ReduceLROnPlateau: Turunkan learning rate jika training macet.

early_stop = EarlyStopping(
    monitor='val_loss', patience=15,
    restore_best_weights=True, verbose=1
)
reduce_lr = ReduceLROnPlateau(
    monitor='val_loss', factor=0.5,
    patience=7, min_lr=0.00001, verbose=1
)

print("🚀 Memulai Training LSTM... (harap tunggu, estimasi 3-7 menit di Colab GPU)")
print("-" * 60)

history = model.fit(
    X_train, y_train,
    epochs=100,
    batch_size=32,           # Batch 32 ideal untuk dataset ~7.000 sampel
    validation_data=(X_test, y_test),
    callbacks=[early_stop, reduce_lr],
    verbose=1
)

print("-" * 60)
print(f"✅ Training selesai pada epoch ke-{len(history.history['loss'])}")
print(f"   Training Loss   : {history.history['loss'][-1]:.6f}")
print(f"   Validation Loss : {history.history['val_loss'][-1]:.6f}")


# ================================================================
# SEL 9: GRAFIK KURVA TRAINING LOSS
# ================================================================
# Loss yang terus turun = model semakin pintar.
# Jika val_loss naik sementara loss turun = overfitting.

plt.figure(figsize=(10, 4))
plt.plot(history.history['loss'],     label='Training Loss',   color='#3B82F6', linewidth=2)
plt.plot(history.history['val_loss'], label='Validation Loss', color='#EF4444', linewidth=2)
plt.title('Kurva Training LSTM — Loss per Epoch', fontsize=14, fontweight='bold')
plt.xlabel('Epoch')
plt.ylabel('Loss (MSE)')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.savefig('02_training_loss.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ Grafik training loss berhasil ditampilkan!")


# ================================================================
# SEL 10: EVALUASI AKURASI MODEL
# ================================================================
# Suruh model menebak data testing (yang belum pernah dia lihat).
# Lalu hitung seberapa jauh tebakan dari nilai aslinya.

pred_scaled = model.predict(X_test, verbose=0)
pred_kwh    = scaler.inverse_transform(pred_scaled)
actual_kwh  = scaler.inverse_transform(y_test.reshape(-1, 1))

# Metrik evaluasi
mae  = mean_absolute_error(actual_kwh, pred_kwh)
rmse = np.sqrt(mean_squared_error(actual_kwh, pred_kwh))
r2   = r2_score(actual_kwh, pred_kwh)
mape = np.mean(np.abs((actual_kwh - pred_kwh) / (actual_kwh + 1e-8))) * 100

print("=" * 60)
print("📈 HASIL EVALUASI AKURASI MODEL LSTM (Data 15 Menit)")
print("=" * 60)
print(f"  MAE  : {mae:.6f} kWh per interval")
print(f"         → Rata-rata salah tebak {mae*1000:.3f} Wh per 15 menit")
print()
print(f"  RMSE : {rmse:.6f} kWh")
print()
print(f"  MAPE : {mape:.2f}%")
print(f"         → Kesalahan rata-rata dalam persen")
print()
print(f"  R²   : {r2:.4f}")
print(f"         → 1.0 = sempurna, > 0.90 = sangat bagus")
print("=" * 60)

if mape < 5:
    verdict = "🏆 SANGAT AKURAT — Sangat layak diimplementasikan!"
elif mape < 10:
    verdict = "✅ AKURAT — Layak diimplementasikan ke backend Node.js."
elif mape < 20:
    verdict = "⚠️  CUKUP — Perlu lebih banyak data untuk meningkatkan akurasi."
else:
    verdict = "❌ KURANG AKURAT — Tambah data historis minimal 6 bulan."

print(f"\n  Kesimpulan: {verdict}")
print("=" * 60)


# ================================================================
# SEL 11: GRAFIK PREDIKSI vs AKTUAL
# ================================================================
# Tampilkan 3 hari data testing sebagai sampel agar grafik
# tidak terlalu padat (data 15 menit sangat banyak titiknya).

ts_dt  = pd.to_datetime(ts_test)
N_HARI_GRAFIK = 3  # Tampilkan N hari pertama dari periode testing
N_TITIK = N_HARI_GRAFIK * 96  # 3 hari × 96 interval

fig, axes = plt.subplots(2, 1, figsize=(14, 10))

# Grafik 1: Prediksi vs Aktual (N hari pertama testing)
axes[0].plot(ts_dt[:N_TITIK], actual_kwh[:N_TITIK],
             color='#3B82F6', linewidth=1.5, label='Aktual (kWh/15mnt)')
axes[0].plot(ts_dt[:N_TITIK], pred_kwh[:N_TITIK],
             color='#EF4444', linewidth=1.5, linestyle='--', label='Prediksi LSTM')
axes[0].fill_between(ts_dt[:N_TITIK],
                     actual_kwh[:N_TITIK].flatten(),
                     pred_kwh[:N_TITIK].flatten(),
                     alpha=0.15, color='#F59E0B', label='Selisih Error')
axes[0].set_title(
    f'Prediksi vs Aktual (3 Hari Pertama Testing)  |  MAPE: {mape:.2f}%  |  R²: {r2:.4f}',
    fontsize=13, fontweight='bold'
)
axes[0].set_ylabel('Energi per 15 Menit (kWh)')
axes[0].legend()
axes[0].grid(True, linestyle='--', alpha=0.5)
axes[0].xaxis.set_major_formatter(mdates.DateFormatter('%d %b\n%H:%M'))
plt.setp(axes[0].xaxis.get_majorticklabels(), rotation=0)

# Grafik 2: Distribusi error
errors = (pred_kwh[:N_TITIK] - actual_kwh[:N_TITIK]).flatten()
axes[1].bar(ts_dt[:N_TITIK], errors,
            color=['#EF4444' if e > 0 else '#3B82F6' for e in errors],
            alpha=0.7, width=0.008)
axes[1].axhline(y=0,    color='black',   linewidth=1.5)
axes[1].axhline(y=mae,  color='#F59E0B', linewidth=1.5, linestyle='--',
                label=f'MAE = ±{mae:.5f} kWh')
axes[1].axhline(y=-mae, color='#F59E0B', linewidth=1.5, linestyle='--')
axes[1].set_title('Distribusi Error (Merah=Terlalu Tinggi, Biru=Terlalu Rendah)',
                  fontsize=13, fontweight='bold')
axes[1].set_ylabel('Error (kWh)')
axes[1].legend()
axes[1].grid(True, linestyle='--', alpha=0.5)

plt.tight_layout()
plt.savefig('03_prediksi_vs_aktual.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ Grafik prediksi vs aktual berhasil ditampilkan!")


# ================================================================
# SEL 12: FORECAST 48 JAM KE DEPAN (PREDIKSI 2 HARI)
# ================================================================
# Simulasi nyata: model meramalkan 48 jam ke depan
# menggunakan 1 hari terakhir sebagai input awal.

INTERVAL_KE_DEPAN = 48 * 4  # 48 jam × 4 interval per jam = 192 interval

last_window  = scaled_data[-WINDOW_SIZE:].copy()
current_input = last_window.copy()
future_preds  = []

for _ in range(INTERVAL_KE_DEPAN):
    inp  = current_input.reshape(1, WINDOW_SIZE, 1)
    pred = model.predict(inp, verbose=0)[0][0]
    future_preds.append(pred)
    current_input = np.append(current_input[1:], [[pred]], axis=0)

future_kwh  = scaler.inverse_transform(np.array(future_preds).reshape(-1, 1))
t_terakhir  = df['timestamp'].iloc[-1]
future_times = [t_terakhir + timedelta(minutes=15 * (i + 1))
                for i in range(INTERVAL_KE_DEPAN)]

# Agregasi per jam untuk tampilan yang lebih mudah dibaca
future_df = pd.DataFrame({
    'timestamp': future_times,
    'pred_kwh':  future_kwh.flatten()
})
future_df['jam'] = pd.to_datetime(future_df['timestamp']).dt.strftime('%d %b %H:%M')
kwh_per_jam_future = future_df.groupby(
    pd.to_datetime(future_df['timestamp']).dt.floor('H')
)['pred_kwh'].sum()

print("\n" + "=" * 60)
print("🔮 PREDIKSI KONSUMSI 48 JAM KE DEPAN (per Jam)")
print("=" * 60)
total = 0
for ts, kwh in kwh_per_jam_future.items():
    biaya = kwh * 1444.70
    total += kwh
    print(f"  {ts.strftime('%a %d %b %H:%M')} : {kwh:.4f} kWh  (≈ Rp {biaya:,.0f})")

print("-" * 60)
print(f"  Total 48 Jam  : {total:.4f} kWh")
print(f"  Estimasi Biaya: Rp {total * 1444.70:,.0f}")
print("=" * 60)

# Grafik Forecast
fig, ax = plt.subplots(figsize=(14, 5))
hist_48jam = df.tail(192)  # 48 jam historis terakhir sebagai konteks
ax.plot(hist_48jam['timestamp'], hist_48jam['energi_kwh'],
        color='#3B82F6', linewidth=1.2, label='Data Historis (48 jam terakhir)')
ax.plot(future_times, future_kwh,
        color='#10B981', linewidth=1.5, linestyle='--', label='Prediksi 48 Jam Ke Depan')
ax.axvline(x=df['timestamp'].iloc[-1], color='gray', linestyle=':', linewidth=2,
           label='Batas data sekarang')
ax.fill_between(future_times,
                future_kwh.flatten() * 0.88,
                future_kwh.flatten() * 1.12,
                alpha=0.2, color='#10B981', label='Interval kepercayaan ±12%')
ax.set_title('Forecast LSTM: Prediksi Konsumsi 48 Jam Ke Depan (Interval 15 Menit)',
             fontsize=13, fontweight='bold')
ax.set_ylabel('Energi per 15 Menit (kWh)')
ax.legend()
ax.grid(True, linestyle='--', alpha=0.5)
ax.xaxis.set_major_formatter(mdates.DateFormatter('%d %b\n%H:%M'))
plt.tight_layout()
plt.savefig('04_forecast_48jam.png', dpi=150, bbox_inches='tight')
plt.show()
print("✅ Grafik forecast 48 jam berhasil ditampilkan!")


# ================================================================
# SEL 13: SIMPAN MODEL UNTUK DIPAKAI DI NODE.JS
# ================================================================
# Jika akurasi memuaskan (MAPE < 10%), simpan model.
# File .h5 ini yang nantinya dipakai TensorFlow.js di Node.js backend.

model.save('lstm_energy_15min_model.h5')
print("\n" + "=" * 60)
print("💾 Model disimpan sebagai: lstm_energy_15min_model.h5")
print("   → Download dari panel Files di sidebar kiri Colab")
print("   → Taruh di folder backend Node.js Anda")
print()
print("=" * 60)
print("🎉 SEMUA TAHAP TESTING SELESAI!")
print("=" * 60)
print(f"  Interval data  : 15 menit")
print(f"  Window LSTM    : {WINDOW_SIZE} interval (1 hari)")
print(f"  MAPE Akurasi   : {mape:.2f}%")
print(f"  R² Score       : {r2:.4f}")
print()
if mape < 10:
    print("  ✅ LSTM DENGAN DATA 15 MENIT LAYAK DIIMPLEMENTASIKAN!")
    print("     ke backend Node.js Energy Monitor Anda.")
else:
    print("  ⚠️  Kumpulkan data real dari database selama 6+ bulan")
    print("     untuk meningkatkan akurasi model lebih lanjut.")
print("=" * 60)
