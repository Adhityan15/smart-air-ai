#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// ✅ BLE LIBRARIES
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2);

// DHT
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// MQ Sensors
#define MQ135_PIN 34
#define MQ6_PIN 35

// Pulse Sensor
#define PULSE_PIN 32

// ✅ BLE VARIABLES
BLECharacteristic *pCharacteristic;

#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890ab"
#define CHARACTERISTIC_UUID "abcd1234-5678-1234-5678-abcdef123456"

void setup() {
  Serial.begin(115200);

  dht.begin();
  pinMode(PULSE_PIN, INPUT);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0,0);
  lcd.print("AI Health System");
  delay(2000);
  lcd.clear();

  // -------- BLE SETUP --------
  BLEDevice::init("AirCare_AI");

  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->start();

  Serial.println("BLE Started...");
}

void loop() {

  int air = analogRead(MQ135_PIN);
  int gas = analogRead(MQ6_PIN);
  int pulseValue = analogRead(PULSE_PIN);

  float hum = dht.readHumidity();
  float temp = dht.readTemperature();

  // -------- BPM ESTIMATION --------
  int bpm = map(pulseValue, 0, 4095, 60, 120);

  // -------- AIR QUALITY --------
  String airStatus, gasStatus, suggestion, health;

  if (air < 200) {
    airStatus = "GOOD";
    suggestion = "Fresh Air";
  } 
  else if (air < 400) {
    airStatus = "MOD";
    suggestion = "Open Windows";
  } 
  else if (air < 700) {
    airStatus = "POOR";
    suggestion = "Wear Mask";
  } 
  else {
    airStatus = "DANGER";
    suggestion = "Leave Area!";
  }

  // -------- GAS --------
  if (gas < 200) gasStatus = "SAFE";
  else if (gas < 400) gasStatus = "WARN";
  else gasStatus = "LEAK";

  // -------- HEALTH --------
  if (bpm < 60) health = "Low Pulse";
  else if (bpm < 100) health = "Normal";
  else health = "High Pulse!";

  // -------- JSON DATA --------
  String jsonData = "{";
  jsonData += "\"air\":" + String(air) + ",";
  jsonData += "\"air_status\":\"" + airStatus + "\",";
  jsonData += "\"gas\":" + String(gas) + ",";
  jsonData += "\"gas_status\":\"" + gasStatus + "\",";
  jsonData += "\"temperature\":" + String(temp) + ",";
  jsonData += "\"humidity\":" + String(hum) + ",";
  jsonData += "\"pulse\":" + String(bpm) + ",";
  jsonData += "\"health\":\"" + health + "\",";
  jsonData += "\"suggestion\":\"" + suggestion + "\"";
  jsonData += "}";

  // ✅ SERIAL (for debugging)
  Serial.println(jsonData);

  // ✅ BLE SEND
  pCharacteristic->setValue(jsonData.c_str());
  pCharacteristic->notify();

  // -------- LCD SCREEN 1 --------
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("AQ:");
  lcd.print(air);
  lcd.print(" ");
  lcd.print(airStatus);

  lcd.setCursor(0,1);
  lcd.print("Gas:");
  lcd.print(gas);
  lcd.print(" ");
  lcd.print(gasStatus);

  delay(3000);

  // -------- LCD SCREEN 2 --------
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("T:");
  lcd.print(temp);
  lcd.print(" H:");
  lcd.print(hum);

  lcd.setCursor(0,1);
  lcd.print(suggestion);

  delay(3000);

  // -------- LCD SCREEN 3 --------
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("Pulse:");
  lcd.print(bpm);

  lcd.setCursor(0,1);
  lcd.print(health);

  delay(3000);
}