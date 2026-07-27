# Smart Energy Monitor (IoT ESP32 + PZEM-004T)

Sistem Pemantauan Energi Listrik Cerdas berbasis Internet of Things (IoT) yang menggunakan mikrokontroler ESP32 dan sensor PZEM-004T. Proyek ini dilengkapi dengan antarmuka web modern (React) dan backend (Node.js) untuk memantau data kelistrikan secara *real-time* serta menyimpan riwayat penggunaan.

## 🚀 Fitur Utama

- **Pemantauan Real-Time**: Tegangan (V), Arus (A), Daya (W), Energi (kWh), Frekuensi (Hz), dan Power Factor (PF).
- **Dashboard Modern**: Dibangun menggunakan React dan Tailwind CSS untuk tampilan yang responsif dan elegan.
- **Grafik Interaktif**: Visualisasi data kelistrikan menggunakan Chart.js/Recharts.
- **Sistem Database**: Menyimpan riwayat data historis untuk keperluan analisis menggunakan MySQL.
- **Notifikasi/Akses Mudah**: Dilengkapi dengan WiFiManager (Captive Portal) dengan UI Premium pada ESP32 untuk pengaturan jaringan tanpa *hardcode*.
- **Docker Support**: Dilengkapi konfigurasi Docker Compose untuk *deployment* yang cepat.

## 🛠️ Tech Stack

**Hardware:**
- ESP32 Microcontroller
- PZEM-004T (V3.0) AC Energy Sensor
- LCD I2C 16x2 (opsional untuk *display* lokal)

**Software:**
- **Firmware**: Arduino IDE (C++)
- **Backend**: Node.js, Express.js, Sequelize (MySQL), WebSocket
- **Frontend**: React.js, Tailwind CSS, Axios
- **Database**: MySQL

## 📂 Struktur Direktori

- `/kode.ino` - Source code Arduino/Firmware untuk ESP32.
- `/frontend/` - Source code antarmuka web (React).
- `/backend/` - Source code server API (Node.js).
- `/energy_monitor(1).sql` - File *dump* database MySQL.
- `docker-compose.yml` & `Dockerfile` - File konfigurasi untuk menjalankan project menggunakan Docker.
- `start_backend.bat` & `start_frontend.bat` - Skrip *shortcut* Windows untuk menjalankan server lokal secara cepat.
- `/dataset_colab/` - Skrip/dataset untuk analisis lanjutan (seperti LSTM).

## ⚙️ Panduan Instalasi (Development)

### 1. Setup Database
1. Pastikan Anda memiliki server MySQL (misal: XAMPP).
2. Buat database baru (misalnya `energy_monitor`).
3. Import file `energy_monitor(1).sql` ke dalam database tersebut.

### 2. Menjalankan Backend
1. Masuk ke direktori backend: `cd backend`
2. Instal *dependencies*: `npm install`
3. Sesuaikan file `.env` dengan kredensial database Anda (jika belum ada, salin/buat file `.env` berdasarkan konfigurasi database).
4. Jalankan backend: `npm run dev` atau gunakan file `start_backend.bat` dari root.

### 3. Menjalankan Frontend
1. Masuk ke direktori frontend: `cd frontend`
2. Instal *dependencies*: `npm install`
3. Jalankan aplikasi frontend: `npm start` atau gunakan file `start_frontend.bat`.
4. Buka `http://localhost:3000` (atau port default React) di browser Anda.

### 4. Upload Firmware ke ESP32
1. Buka file `kode.ino` menggunakan Arduino IDE.
2. Pastikan library berikut sudah terinstal di Arduino IDE:
   - `WiFiManager`
   - `PZEM004Tv30`
   - `ArduinoJson`
   - `LiquidCrystal_I2C`
3. Sesuaikan URL API Server di variabel `g_apiUrl` jika backend Anda di-*host* di server lain (saat ini diset ke URL *production*).
4. *Compile* dan *Upload* kode ke board ESP32 Anda.
5. Saat ESP32 menyala pertama kali, hubungkan HP/Laptop Anda ke WiFi AP yang dipancarkan oleh ESP32 untuk mengatur koneksi internet.

## 🐳 Menjalankan dengan Docker (Opsional)

Jika Anda ingin menjalankan aplikasi secara praktis di dalam *container*:
1. Pastikan Docker dan Docker Compose sudah terinstal.
2. Jalankan perintah:
   ```bash
   docker-compose up -d --build
   ```
3. Docker akan mem-*build* dan menjalankan kontainer untuk Frontend, Backend, dan Database sekaligus.

---

