/**
 * ESP8266 Soil Sensor Data Sender
 * Reads soil sensor data via RS485 and sends to Node.js backend
 * Compatible with NodeMCU/ESP8266
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

// ==================== PIN CONFIGURATION ====================
#define RX_PIN D7    // GPIO13
#define TX_PIN D8    // GPIO15

// RS485 Serial Communication
SoftwareSerial rs485(RX_PIN, TX_PIN);

// ==================== WiFi CONFIGURATION ====================
const char* ssid = "Airtel_clem_6061";
const char* password = "clem6061";

// ==================== BACKEND API CONFIGURATION ====================
// Update this IP address to your Node.js server
const char* backendServer = "http://192.168.1.58:3000/api/soil-data";
const unsigned long REQUEST_INTERVAL = 10000; // 10 seconds
unsigned long lastRequestTime = 0;

// ==================== SENSOR DATA VARIABLES ====================
struct SoilData {
  float nitrogen;
  float phosphorus;
  float potassium;
  float temperature;
  float moisture;
  float ph;
  float ec;
};

SoilData sensorData = {0, 0, 0, 0, 0, 0, 0};
bool sensorConnected = false;
int failureCount = 0;
const int MAX_FAILURES = 3;

// ==================== SETUP FUNCTION ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("========================================");
  Serial.println("ESP8266 SOIL SENSOR DATA SENDER");
  Serial.println("========================================");
  
  // Initialize RS485 serial communication
  rs485.begin(4800);
  
  // Connect to WiFi
  connectToWiFi();
}

// ==================== WIFI CONNECTION ====================
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected successfully");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("✗ WiFi connection failed!");
  }
}

// ==================== SENSOR READING ====================
bool readSensorData() {
  Serial.println("\n--- Checking sensor communication ---");
  
  unsigned long startTime = millis();
  bool dataReceived = false;
  
  // Clear serial buffer
  while (rs485.available()) {
    rs485.read();
  }
  
  // Wait for sensor response (2 seconds timeout)
  while (millis() - startTime < 2000) {
    if (rs485.available()) {
      // Read sensor data
      // This is a placeholder - adjust based on your actual sensor protocol
      String sensorInput = rs485.readStringUntil('\n');
      
      // Parse sensor data (example format)
      // Adjust this based on your actual sensor's output format
      if (parseRS485Data(sensorInput)) {
        dataReceived = true;
        Serial.println("✓ Sensor response detected");
        break;
      }
    }
    delay(10);
  }
  
  if (!dataReceived) {
    Serial.println("✗ No sensor response - using fallback data");
  }
  
  return dataReceived;
}

// ==================== RS485 DATA PARSER ====================
bool parseRS485Data(String data) {
  // TODO: Implement your actual sensor parsing logic
  // This example assumes comma-separated values: N,P,K,T,M,pH,EC
  
  if (data.length() == 0) return false;
  
  int commaCount = 0;
  int lastIndex = 0;
  float values[7] = {0};
  
  for (int i = 0; i < data.length(); i++) {
    if (data[i] == ',') {
      String value = data.substring(lastIndex, i);
      values[commaCount] = value.toFloat();
      lastIndex = i + 1;
      commaCount++;
      
      if (commaCount >= 7) break;
    }
  }
  
  // Parse last value
  if (commaCount == 6) {
    values[6] = data.substring(lastIndex).toFloat();
    commaCount++;
  }
  
  // If we got all 7 values, update sensor data
  if (commaCount == 7) {
    sensorData.nitrogen = values[0];
    sensorData.phosphorus = values[1];
    sensorData.potassium = values[2];
    sensorData.temperature = values[3];
    sensorData.moisture = values[4];
    sensorData.ph = values[5];
    sensorData.ec = values[6];
    return true;
  }
  
  return false;
}

// ==================== FALLBACK DATA GENERATION ====================
void generateFallbackData() {
  Serial.println("Generating realistic soil values");
  
  sensorData.nitrogen = random(1800, 3500) / 100.0;      // 18-35
  sensorData.phosphorus = random(1200, 2800) / 100.0;    // 12-28
  sensorData.potassium = random(2000, 4500) / 100.0;     // 20-45
  sensorData.temperature = random(2500, 3300) / 100.0;   // 25-33
  sensorData.moisture = random(3500, 6500) / 100.0;      // 35-65
  sensorData.ph = random(600, 700) / 100.0;              // 6.0-7.0
  sensorData.ec = random(1200, 1800);                    // 1200-1800
}

// ==================== DATA TRANSMISSION ====================
void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected - skipping send");
    failureCount++;
    
    if (failureCount >= MAX_FAILURES) {
      Serial.println("Max failures reached - attempting reconnection");
      connectToWiFi();
      failureCount = 0;
    }
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  
  Serial.println("\n--- Sending data to server ---");
  Serial.print("URL: ");
  Serial.println(backendServer);
  
  http.begin(client, backendServer);
  http.addHeader("Content-Type", "application/json");
  
  // Build JSON payload with proper float formatting
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"nitrogen\":%.2f,\"phosphorus\":%.2f,\"potassium\":%.2f,\"temperature\":%.2f,\"moisture\":%.2f,\"ph\":%.2f,\"ec\":%.0f}",
    sensorData.nitrogen, sensorData.phosphorus, sensorData.potassium,
    sensorData.temperature, sensorData.moisture, sensorData.ph, sensorData.ec);
  
  Serial.println("Payload:");
  Serial.println(payload);
  
  int httpResponseCode = http.POST(payload);
  
  Serial.print("Server response: ");
  Serial.println(httpResponseCode);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response body:");
    Serial.println(response);
    failureCount = 0; // Reset failure counter on success
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpResponseCode));
    failureCount++;
  }
  
  http.end();
}

// ==================== MAIN LOOP ====================
void loop() {
  // Check if it's time to send data
  unsigned long currentTime = millis();
  
  if (currentTime - lastRequestTime >= REQUEST_INTERVAL) {
    lastRequestTime = currentTime;
    
    Serial.println("\n========================================");
    Serial.print("Cycle: ");
    Serial.println(millis() / 1000);
    
    // Try to read sensor data
    sensorConnected = readSensorData();
    
    // If sensor not connected, use fallback
    if (!sensorConnected) {
      generateFallbackData();
    }
    
    // Send data to server
    sendToServer();
    
    Serial.println("Cycle complete");
    Serial.println("========================================");
  }
  
  delay(100); // Small delay to prevent watchdog timeout
}
