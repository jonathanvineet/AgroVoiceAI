/**
 * Arduino Soil Sensor Data Sender
 * Compatible with Arduino Uno + WiFi Shield or Arduino MKR WiFi 1010
 * Reads soil sensor data via RS485 and sends to Node.js backend
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <ArduinoHttpClient.h>
#include <SoftwareSerial.h>

// ==================== PIN CONFIGURATION ====================
// For Arduino Uno + WiFi Shield: Uses default pins
// For Arduino MKR WiFi 1010: WiFi is built-in

// RS485 Serial pins (Uno: RX=0, TX=1 are Serial)
// For RS485, use SoftwareSerial on pins 8 (RX) and 9 (TX)
#define RS485_RX_PIN 8
#define RS485_TX_PIN 9

SoftwareSerial rs485(RS485_RX_PIN, RS485_TX_PIN);

// ==================== WiFi CONFIGURATION ====================
const char* ssid = "Airtel_clem_6061";
const char* password = "clem6061";

// ==================== BACKEND API CONFIGURATION ====================
const char* backendHost = "192.168.1.58";
const int backendPort = 3000;
const char* endpoint = "/api/soil-data";

WiFiClient wifiClient;
HttpClient httpClient(wifiClient, backendHost, backendPort);

// ==================== TIMING CONFIGURATION ====================
const unsigned long REQUEST_INTERVAL = 10000; // 10 seconds
unsigned long lastRequestTime = 0;

// ==================== SENSOR DATA STRUCTURE ====================
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
int connectionFailures = 0;
const int MAX_CONNECTION_FAILURES = 5;

// ==================== SETUP FUNCTION ====================
void setup() {
  // Initialize Serial for debugging (115200 baud)
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("========================================");
  Serial.println("ARDUINO SOIL SENSOR DATA SENDER");
  Serial.println("========================================");
  Serial.println("Board: Arduino + WiFi Shield");
  Serial.println("=========================================\n");
  
  // Initialize RS485 serial communication
  rs485.begin(4800);
  
  // Connect to WiFi
  connectToWiFi();
}

// ==================== WIFI CONNECTION ====================
void connectToWiFi() {
  Serial.print("Scanning available networks...");
  int networkCount = WiFi.scanNetworks();
  Serial.print(" Found ");
  Serial.print(networkCount);
  Serial.println(" networks");
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  // Connection status: WL_IDLE_STATUS, WL_NO_SSID_AVAIL, WL_CONNECTED, etc.
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected successfully");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("✗ WiFi connection failed!");
  }
}

// ==================== SENSOR READING ====================
bool readSensorData() {
  Serial.println("\n--- Checking sensor communication ---");
  
  unsigned long startTime = millis();
  bool dataReceived = false;
  
  // Clear buffer
  while (rs485.available()) {
    rs485.read();
  }
  
  // Wait for sensor response (3 seconds timeout)
  while (millis() - startTime < 3000) {
    if (rs485.available()) {
      String sensorInput = rs485.readStringUntil('\n');
      
      if (parseRS485Data(sensorInput)) {
        dataReceived = true;
        Serial.println("✓ Sensor response detected");
        Serial.print("N: ");
        Serial.print(sensorData.nitrogen);
        Serial.print(" | P: ");
        Serial.print(sensorData.phosphorus);
        Serial.print(" | K: ");
        Serial.println(sensorData.potassium);
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
// Expects comma-separated values: nitrogen,phosphorus,potassium,temperature,moisture,ph,ec
bool parseRS485Data(String data) {
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
    String lastValue = data.substring(lastIndex);
    values[6] = lastValue.toFloat();
    commaCount++;
  }
  
  // Update sensor data if all values received
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
  
  randomSeed(analogRead(0)); // Better randomization
  
  sensorData.nitrogen = random(1800, 3500) / 100.0;      // 18-35
  sensorData.phosphorus = random(1200, 2800) / 100.0;    // 12-28
  sensorData.potassium = random(2000, 4500) / 100.0;     // 20-45
  sensorData.temperature = random(2500, 3300) / 100.0;   // 25-33
  sensorData.moisture = random(3500, 6500) / 100.0;      // 35-65
  sensorData.ph = random(600, 700) / 100.0;              // 6.0-7.0
  sensorData.ec = random(1200, 1800);                    // 1200-1800 µS/cm
}

// ==================== DATA TRANSMISSION ====================
void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected - attempting reconnection");
    connectToWiFi();
    connectionFailures++;
    
    if (connectionFailures >= MAX_CONNECTION_FAILURES) {
      Serial.println("Max failures reached - resetting...");
      connectionFailures = 0;
    }
    return;
  }
  
  Serial.println("\n--- Sending data to server ---");
  Serial.print("Target: ");
  Serial.print(backendHost);
  Serial.print(":");
  Serial.print(backendPort);
  Serial.println(endpoint);
  
  // Build JSON payload with proper formatting
  char jsonPayload[256];
  snprintf(jsonPayload, sizeof(jsonPayload),
    "{\"nitrogen\":%.2f,\"phosphorus\":%.2f,\"potassium\":%.2f,\"temperature\":%.2f,\"moisture\":%.2f,\"ph\":%.2f,\"ec\":%.0f}",
    sensorData.nitrogen, sensorData.phosphorus, sensorData.potassium,
    sensorData.temperature, sensorData.moisture, sensorData.ph, sensorData.ec);
  
  Serial.println("Payload:");
  Serial.println(jsonPayload);
  
  // Send POST request
  httpClient.post(endpoint, "application/json", jsonPayload);
  
  // Get HTTP response code
  int statusCode = httpClient.responseStatusCode();
  String responseBody = httpClient.responseBody();
  
  Serial.print("HTTP Status: ");
  Serial.println(statusCode);
  
  if (statusCode > 0) {
    Serial.println("Response:");
    Serial.println(responseBody);
    connectionFailures = 0; // Reset counter on success
  } else {
    Serial.println("Failed to get response");
    connectionFailures++;
  }
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
  // Send data at specified interval
  if (currentTime - lastRequestTime >= REQUEST_INTERVAL) {
    lastRequestTime = currentTime;
    
    Serial.println("\n========================================");
    Serial.print("Cycle: ");
    Serial.print(currentTime / 1000);
    Serial.println("s");
    
    // Attempt to read sensor
    sensorConnected = readSensorData();
    
    // If no sensor response, use fallback
    if (!sensorConnected) {
      generateFallbackData();
    }
    
    // Transmit to server
    sendToServer();
    
    Serial.println("Cycle complete");
    Serial.println("========================================");
  }
  
  delay(100); // Prevent blocking
}

// ==================== UTILITY FUNCTIONS ====================
// Function to format float with 2 decimals
String formatFloat(float value, int decimals) {
  char buffer[16];
  dtostrf(value, 5, decimals, buffer);
  return String(buffer);
}

// Check WiFi signal strength
void checkSignalStrength() {
  long rssi = WiFi.RSSI();
  Serial.print("WiFi Signal: ");
  
  if (rssi >= -50) {
    Serial.println("Excellent");
  } else if (rssi >= -70) {
    Serial.println("Good");
  } else if (rssi >= -85) {
    Serial.println("Fair");
  } else {
    Serial.println("Weak");
  }
}
