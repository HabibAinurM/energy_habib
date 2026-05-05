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
#define DEFAULT_SERVER_IP   "192.168.1.4"
#define DEFAULT_SERVER_PORT "3006"
#define DEFAULT_DEVICE_ID   "pzem-001"

char g_serverIp[40];
char g_serverPort[8];
char g_deviceId[32];

// URL dibangun otomatis dari IP + Port
char g_apiUrl[128];
void buildApiUrl() {
  snprintf(g_apiUrl, sizeof(g_apiUrl),
           "http://%s:%s/api/sensor-data",
           g_serverIp, g_serverPort);
}

WiFiManager wifiManager;
WiFiManagerParameter* param_serverIp;
WiFiManagerParameter* param_serverPort;
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
  padding: 30px 20px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
}

.header p {
  margin: 5px 0;
  font-size: 14px;
  color: #ccc;
}

/* CARD */
.card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  border-radius: 15px;
  padding: 20px;
  margin: 15px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3);
}

/* INPUT */
input {
  width: 90%;
  padding: 12px;
  margin: 8px;
  border-radius: 10px;
  border: none;
  outline: none;
}

/* BUTTON */
button {
  width: 90%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  margin-top: 10px;
  font-size: 16px;
  background: linear-gradient(45deg,#00c6ff,#0072ff);
  color: white;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  transform: scale(1.03);
}

/* FOOTER */
.footer {
  margin-top: 20px;
  font-size: 12px;
  color: #aaa;
}

/* ANIMATION */
.fade {
  animation: fadeIn 1.2s ease;
}

@keyframes fadeIn {
  from {opacity: 0; transform: translateY(10px);}
  to {opacity: 1; transform: translateY(0);}
}
</style>

<div class="header fade">
  <h1>⚡ Smart Energy Monitor</h1>
  <p>ESP32 + IoT Monitoring System</p>
</div>

<div class="card fade">
  <h3>🔧 Setup WiFi & Server</h3>
  <p>Silakan hubungkan perangkat ke WiFi dan masukkan konfigurasi server.</p>
</div>

<div class="footer fade">
  © 2026 Habib IoT System
</div>
)rawliteral";

// ================= HELPER =================
void loadConfig() {
  prefs.begin("cfg", true);
  String ip   = prefs.getString("serverIp",   DEFAULT_SERVER_IP);
  String port = prefs.getString("serverPort", DEFAULT_SERVER_PORT);
  String did  = prefs.getString("deviceId",   DEFAULT_DEVICE_ID);
  prefs.end();

  ip.toCharArray(g_serverIp,   sizeof(g_serverIp));
  port.toCharArray(g_serverPort, sizeof(g_serverPort));
  did.toCharArray(g_deviceId,  sizeof(g_deviceId));
  buildApiUrl();
}

void saveConfig() {
  prefs.begin("cfg", false);
  prefs.putString("serverIp",   param_serverIp->getValue());
  prefs.putString("serverPort", param_serverPort->getValue());
  prefs.putString("deviceId",   param_deviceId->getValue());
  prefs.end();

  // Rebuild URL setelah simpan
  strncpy(g_serverIp,   param_serverIp->getValue(),   sizeof(g_serverIp)-1);
  strncpy(g_serverPort, param_serverPort->getValue(), sizeof(g_serverPort)-1);
  buildApiUrl();
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

  param_serverIp   = new WiFiManagerParameter("ip",   "Server IP",   g_serverIp,   38);
  param_serverPort = new WiFiManagerParameter("port", "Server Port", g_serverPort,  6);
  param_deviceId   = new WiFiManagerParameter("id",   "Device ID",   g_deviceId,   30);

  wifiManager.addParameter(param_serverIp);
  wifiManager.addParameter(param_serverPort);
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

// ================= LOOP =================
void loop() {

  if(digitalRead(BTN_RESET)==LOW){
    delay(3000);
    wifiManager.resetSettings();
    ESP.restart();
  }

  float v = pzem.voltage();
  float i = pzem.current();
  float p = pzem.power();
  float e = pzem.energy();
  float f = pzem.frequency();
  float pf = pzem.pf();

  if(isnan(v)){
    lcd.setCursor(0,0);
    lcd.print("Sensor Error   ");
    return;
  }

  lcd.setCursor(0,0);
  lcd.printf("V:%.1f I:%.2f",v,i);

  lcd.setCursor(0,1);
  lcd.printf("P:%.0f E:%.2f",p,e);

  if(WiFi.status()==WL_CONNECTED){
    HTTPClient http;
    http.begin(g_apiUrl);
    http.addHeader("Content-Type","application/json");

    StaticJsonDocument<256> doc;
    doc["tegangan"]=v;
    doc["arus"]=i;
    doc["daya"]=p;
    doc["energi"]=e;
    doc["frekuensi"]=f;
    doc["faktorDaya"]=pf;
    doc["deviceId"]=g_deviceId;

    String payload;
    serializeJson(doc, payload);

    Serial.println("[HTTP] Mengirim ke: " + String(g_apiUrl));
    Serial.println("[HTTP] Payload: " + payload);

    int code = http.POST(payload);
    Serial.print("[HTTP] Response Code: ");
    Serial.println(code);

    if(code > 0){
      String resp = http.getString();
      Serial.println("[HTTP] Response: " + resp);
    } else {
      Serial.println("[HTTP] ERROR - Cek IP/Port server!");
    }

    http.end();
  } else {
    Serial.println("[WiFi] Tidak terhubung!");
  }

  delay(5000);
}