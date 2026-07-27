/**
 * ============================================================
 *  MONITORING ENERGI LISTRIK — ESP32 + PZEM-004T (UI PREMIUM)
 * ============================================================
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include <WiFiClientSecure.h>

// ─── PIN ─────────────────────────────────────────────────────
#define PZEM_RX_PIN       16
#define PZEM_TX_PIN       17
#define LED_CONNECTED     26
#define LED_DISCONNECTED  33
#define BTN_RESET         0

LiquidCrystal_I2C lcd(0x27, 16, 2);
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
Preferences prefs;

// ─── DEFAULT CONFIG ──────────────────────────────────────────
#define DEFAULT_DEVICE_ID   "D1"

char g_deviceId[32];

// ─── KONFIGURASI INTERVAL ────────────────────────────────────
// LCD & pembacaan sensor : setiap 5 detik (real-time)
// Pengiriman ke server   : setiap 15 menit (ideal untuk LSTM dataset)
const unsigned long READ_INTERVAL_MS = 5000UL;         // 5 detik
const unsigned long SEND_INTERVAL_MS = 900000UL;       // 15 menit (900 detik)

// ─── AKUMULATOR DATA SENSOR ──────────────────────────────────
// Digunakan untuk menghitung rata-rata selama 15 menit
float acc_v  = 0;   // Akumulasi tegangan (Volt)
float acc_i  = 0;   // Akumulasi arus (Ampere)
float acc_p  = 0;   // Akumulasi daya (Watt)
float acc_f  = 0;   // Akumulasi frekuensi (Hz)
float acc_pf = 0;   // Akumulasi faktor daya
float max_p  = 0;   // Daya puncak selama interval (Watt)
float energy_start = 0; // Nilai energi kWh saat awal interval
bool  energy_initialized = false; // Flag apakah energy_start sudah diisi
int   sample_count = 0; // Jumlah sampel yang terkumpul

unsigned long lastReadTime = 0;  // Waktu terakhir baca sensor
unsigned long lastSendTime = 0;  // Waktu terakhir kirim ke server

// URL API Server
const char* g_apiUrl = "https://simon.tifpsdku.com/api/sensor-data";

WiFiManager wifiManager;
WiFiManagerParameter* param_deviceId;

// ================= UI PREMIUM =================
const char* custom_html = R"rawliteral(
<style>
* {
  box-sizing: border-box;
  font-family: 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  background: linear-gradient(135deg,#0f2027,#203a43,#2c5364);
  color: white;
  text-align: center;
}

/* HEADER */
.header {
  padding: 30px 20px 10px;
}
.header h1 { margin: 0; font-size: 24px; }
.header p { margin: 5px 0; font-size: 14px; color: #ccc; }

/* CARD */
.card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border-radius: 15px;
  padding: 20px;
  margin: 15px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

/* INPUT & SELECT */
select, input[type="text"], input[type="password"], input[type="number"] {
  width: 90%;
  padding: 12px;
  margin: 8px auto;
  border-radius: 10px;
  border: none;
  outline: none;
  display: block;
  font-size: 16px;
  text-align: center;
  font-family: inherit;
}
select {
  cursor: pointer;
  background: white;
  color: #333;
  appearance: none;
  -webkit-appearance: none;
}

/* BUTTON */
button, input[type="submit"], input[type="button"] {
  width: 90%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  margin-top: 15px;
  margin-left: auto;
  margin-right: auto;
  font-size: 16px;
  background: linear-gradient(45deg,#00c6ff,#0072ff);
  color: white;
  cursor: pointer;
  transition: 0.3s;
  display: block;
  font-weight: bold;
}
button:hover, input[type="submit"]:hover, input[type="button"]:hover {
  transform: scale(1.03);
  box-shadow: 0 5px 15px rgba(0,198,255,0.4);
}

/* FOOTER */
.footer {
  margin-top: 20px; margin-bottom: 20px; font-size: 12px; color: #aaa;
}

/* ANIMATION */
.fade { animation: fadeIn 1.2s ease; }
@keyframes fadeIn {
  from {opacity: 0; transform: translateY(10px);}
  to {opacity: 1; transform: translateY(0);}
}

/* Tweak WiFiManager original links to hide them nicely */
div.l { margin-bottom: 5px; }
</style>

<div class="header fade">
  <h1>⚡ Smart Energy Monitor</h1>
  <p>ESP32 + IoT Monitoring System</p>
</div>

<div class="card fade">
  <h3>🔧 Setup WiFi & Device</h3>
  <p>Pilih nama WiFi Anda dari pilihan di bawah ini, lalu masukkan Password dan Device ID.</p>
</div>

<script>
window.addEventListener('load', function() {
  var ssidInput = document.getElementById('ssid');
  if (ssidInput) {
    // Cari semua link WiFi bawaan WiFiManager
    var links = document.querySelectorAll('.l a[href="#p"], a[href="#p"]');
    
    var select = document.createElement('select');
    select.id = 'wifi-select';
    
    var optDef = document.createElement('option');
    optDef.value = '';
    optDef.innerHTML = '🔍 -- Pilih WiFi yang Tersedia --';
    select.appendChild(optDef);

    links.forEach(function(link) {
      var opt = document.createElement('option');
      opt.value = link.innerText || link.textContent;
      opt.innerHTML = '📶 ' + (link.innerText || link.textContent);
      select.appendChild(opt);
      
      // Sembunyikan elemen bawaan WiFiManager
      if (link.parentNode && link.parentNode.tagName === 'DIV') {
         link.parentNode.style.display = 'none';
      } else {
         link.style.display = 'none';
      }
    });

    var optOther = document.createElement('option');
    optOther.value = '__OTHER__';
    optOther.innerHTML = '➕ Ketik Manual (Hidden WiFi)';
    select.appendChild(optOther);

    select.onchange = function() {
      if (this.value === '__OTHER__') {
        ssidInput.style.display = 'block';
        ssidInput.value = '';
        ssidInput.placeholder = 'Ketik Nama WiFi Manual';
      } else {
        ssidInput.style.display = 'none';
        ssidInput.value = this.value;
      }
    };

    // Sisipkan dropdown sebelum kolom SSID
    ssidInput.parentNode.insertBefore(select, ssidInput);
    
    // Secara default, sembunyikan kolom input text SSID
    ssidInput.style.display = 'none';
  }
});
</script>

<div class="footer fade">
  © 2026 Habib IoT System
</div>
)rawliteral";

// ================= HELPER =================
void loadConfig() {
  prefs.begin("cfg", true);
  String did  = prefs.getString("deviceId",   DEFAULT_DEVICE_ID);
  prefs.end();

  did.toCharArray(g_deviceId,  sizeof(g_deviceId));
}

void saveConfig() {
  prefs.begin("cfg", false);
  prefs.putString("deviceId",   param_deviceId->getValue());
  prefs.end();
}

void setLed(bool status) {
  digitalWrite(LED_CONNECTED, status);
  digitalWrite(LED_DISCONNECTED, !status);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(LED_CONNECTED, OUTPUT);
  pinMode(LED_DISCONNECTED, OUTPUT);
  pinMode(BTN_RESET, INPUT_PULLUP);

  Wire.begin(21,22);
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0,0);
  lcd.print("Energy Monitor");
  lcd.setCursor(0,1);
  lcd.print("Starting...");
  delay(1500);

  loadConfig();

  param_deviceId   = new WiFiManagerParameter("id",   "Device ID",   g_deviceId,   30);

  wifiManager.addParameter(param_deviceId);

  // 🔥 UI CUSTOM
  wifiManager.setCustomHeadElement(custom_html);
  wifiManager.setTitle("⚡ Smart Energy Setup");

  wifiManager.setConfigPortalTimeout(180);

  bool res = wifiManager.autoConnect("EnergiMonitor-Setup");

  if(res){
    setLed(true);
    saveConfig();

    lcd.clear();
    lcd.print("WiFi Connected");
    lcd.setCursor(0,1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    lcd.clear();
    lcd.print("Offline Mode");
    setLed(false);
  }
}

// ─── FUNGSI KIRIM DATA AGREGAT KE SERVER ────────────────────
void sendAggregatedData(float avg_v, float avg_i, float avg_p,
                         float avg_f, float avg_pf,
                         float peak_p, float delta_e) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Tidak terhubung, data agregat dilewati.");
    return;
  }

  bool isHttps = String(g_apiUrl).startsWith("https");
  HTTPClient http;
  WiFiClient *client = nullptr;

  if (isHttps) {
    WiFiClientSecure *secureClient = new WiFiClientSecure;
    if (secureClient) {
      secureClient->setInsecure();
      client = secureClient;
    }
  } else {
    client = new WiFiClient;
  }

  if (client) {
    http.begin(*client, g_apiUrl);
    http.addHeader("Content-Type", "application/json");

    // Kirim nilai RATA-RATA interval 15 menit ke server
    // Nilai ini yang akan masuk ke database dan dipakai dataset LSTM
    StaticJsonDocument<300> doc;
    doc["tegangan"]   = avg_v;    // Rata-rata tegangan (V)
    doc["arus"]       = avg_i;    // Rata-rata arus (A)
    doc["daya"]       = avg_p;    // Rata-rata daya (W)
    doc["energi"]     = delta_e;  // Energi yang dikonsumsi dalam 15 menit ini (kWh)
    doc["frekuensi"]  = avg_f;    // Rata-rata frekuensi (Hz)
    doc["faktorDaya"] = avg_pf;   // Rata-rata faktor daya
    doc["maxDaya"]    = peak_p;   // Daya puncak dalam interval (W)
    doc["deviceId"]   = g_deviceId;
    doc["interval"]   = "15min";  // Flag penanda interval data

    String payload;
    serializeJson(doc, payload);

    Serial.println("\n[SEND-15MIN] Mengirim data agregat ke server...");
    Serial.printf("  Avg V: %.2f | Avg I: %.3f | Avg P: %.1f W\n", avg_v, avg_i, avg_p);
    Serial.printf("  Peak P: %.1f W | Delta E: %.5f kWh\n", peak_p, delta_e);

    int code = http.POST(payload);
    Serial.printf("[HTTP] Response Code: %d\n", code);

    if (code > 0) {
      Serial.println("[HTTP] ✅ Data berhasil dikirim!");
    } else {
      Serial.println("[HTTP] ❌ ERROR: " + http.errorToString(code));
    }
    
    http.end();
    delete client; // Mencegah memory leak!
  } else {
    Serial.println("[HTTP] ❌ ERROR: Gagal membuat WiFiClient");
  }
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  // ─── TOMBOL RESET WIFI ──────────────────────────────────────
  if (digitalRead(BTN_RESET) == LOW) {
    delay(3000);
    wifiManager.resetSettings();
    ESP.restart();
  }

  // ─── BACA SENSOR SETIAP 5 DETIK ─────────────────────────────
  // Hanya baca jika sudah lewat READ_INTERVAL_MS (5 detik)
  if (now - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = now;

    float v  = pzem.voltage();
    float i  = pzem.current();
    float p  = pzem.power();
    float e  = pzem.energy();  // Nilai kumulatif total kWh dari PZEM
    float f  = pzem.frequency();
    float pf = pzem.pf();

    // Lewati jika sensor error
    if (isnan(v) || isnan(i)) {
      lcd.setCursor(0, 0);
      lcd.print("Sensor Error   ");
      lcd.setCursor(0, 1);
      lcd.print("               ");
      return;
    }

    // ── TAMPILKAN NILAI REAL-TIME DI LCD ──────────────────────
    // LCD selalu menampilkan nilai terbaru setiap 5 detik
    lcd.setCursor(0, 0);
    lcd.printf("V:%.1f I:%.3f ", v, i);
    lcd.setCursor(0, 1);
    lcd.printf("P:%.0fW %ds    ",
      p,
      (int)((SEND_INTERVAL_MS - (now - lastSendTime)) / 1000)
    );
    // Baris bawah LCD juga menampilkan hitung mundur detik menuju pengiriman berikutnya

    // ── INISIALISASI ENERGY BASELINE (pertama kali atau setelah reset) ───
    if (!energy_initialized) {
      energy_start       = e;
      energy_initialized = true;
      Serial.printf("[INIT] Energy baseline diset: %.5f kWh\n", energy_start);
    }

    // ── AKUMULASI DATA UNTUK RATA-RATA 15 MENIT ──────────────
    acc_v  += v;
    acc_i  += i;
    acc_p  += p;
    acc_f  += (isnan(f)  ? 50.0 : f);
    acc_pf += (isnan(pf) ? 1.0  : pf);
    if (p > max_p) max_p = p;  // Catat daya puncak
    sample_count++;

    Serial.printf("[READ] Sampel #%d | V:%.1f I:%.3f P:%.1f E:%.5f\n",
      sample_count, v, i, p, e);
  }

  // ─── KIRIM DATA KE SERVER SETIAP 15 MENIT ───────────────────
  // Setelah 15 menit (900.000 ms), hitung rata-rata dan kirim ke server
  if (now - lastSendTime >= SEND_INTERVAL_MS && sample_count > 0) {
    lastSendTime = now;

    // Hitung nilai rata-rata dari semua sampel yang terkumpul
    float avg_v  = acc_v  / sample_count;
    float avg_i  = acc_i  / sample_count;
    float avg_p  = acc_p  / sample_count;
    float avg_f  = acc_f  / sample_count;
    float avg_pf = acc_pf / sample_count;

    // Hitung energi yang dikonsumsi dalam interval ini (delta kWh)
    float current_e = pzem.energy();
    float delta_e   = (current_e >= energy_start)
                      ? (current_e - energy_start)
                      : current_e; // Tangani jika PZEM di-reset
    energy_start = current_e; // Update baseline untuk interval berikutnya

    Serial.printf("\n[AGG] Interval selesai. %d sampel dikumpulkan.\n", sample_count);

    // Kirim data teragregasi ke server
    sendAggregatedData(avg_v, avg_i, avg_p, avg_f, avg_pf, max_p, delta_e);

    // ── RESET AKUMULATOR UNTUK INTERVAL BERIKUTNYA ──────────
    acc_v = acc_i = acc_p = acc_f = acc_pf = max_p = 0;
    sample_count = 0;
  }
}