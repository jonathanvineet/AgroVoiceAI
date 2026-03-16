# Soil Sensor Integration Guide

## Overview
This guide covers integrating your soil sensor data (via ESP8266/Arduino) with the AgroVoiceAI backend.

---

## Backend Setup

### Endpoint Location
- **Route**: `/api/soil-data`
- **URL**: `http://192.168.1.12:3000/api/soil-data`
- **Port**: 3000 (Next.js dev server)

### Accepted Data Format (POST)
```json
{
  "nitrogen": 24.50,
  "phosphorus": 18.30,
  "potassium": 35.20,
  "temperature": 28.50,
  "moisture": 55.40,
  "ph": 6.80,
  "ec": 1550.00
}
```

### Response Format
**Success (200)**:
```json
{
  "status": "success",
  "message": "Soil data received and processed",
  "data": {...},
  "timestamp": "2026-03-17T10:30:45.123Z"
}
```

**Error (400/500)**:
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

## ESP8266 Setup

### Requirements
- NodeMCU / ESP8266 board
- Arduino IDE with ESP8266 board support
- USB-to-Serial adapter

### Installation Steps

1. **Install Board Package** (Arduino IDE):
   - Go to: `Preferences → Additional Boards Manager URLs`
   - Add: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Tools → Board Manager → Search "esp8266" → Install

2. **Required Libraries**:
   - None required for basic version
   - Optional: `ArduinoJson` for advanced JSON handling

3. **Configuration**:
   - Open `ESP8266_SoilSensor.ino`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YOUR_SSID";
     const char* password = "YOUR_PASSWORD";
     ```
   - Update backend server IP:
     ```cpp
     const char* backendServer = "http://YOUR_IP:3000/api/soil-data";
     ```

4. **Board Settings**:
   - Board: NodeMCU 1.0 (ESP-12E Module)
   - Upload Speed: 115200
   - CPU Frequency: 80 MHz
   - Flash Size: 4M (1M SPIFFS)

5. **Upload**: Click Upload button or Ctrl+U

### RS485 Sensor Connection
```
ESP8266 Pin D7 (GPIO13) → RS485 RX
ESP8266 Pin D8 (GPIO15) → RS485 TX
GND → GND
```

### Pin Mapping Reference
```
D0 = GPIO16
D1 = GPIO5
D2 = GPIO4
D3 = GPIO0
D4 = GPIO2
D5 = GPIO14
D6 = GPIO12
D7 = GPIO13 ← RS485 RX
D8 = GPIO15 ← RS485 TX
```

---

## Arduino Setup

### Requirements
- Arduino Uno or Arduino MKR WiFi 1010
- WiFi Shield (for Uno) or built-in WiFi (for MKR)
- RS485 module
- USB cable

### Installation Steps

1. **For Arduino Uno + WiFi Shield**:
   - Install "WiFi" library (built-in)
   - Install "HttpClient" library via Library Manager
   - File → Examples → WiFi → WifiWebClient

2. **For Arduino MKR WiFi 1010**:
   - Install "Arduino MKRWIFI101" library
   - Install "HttpClient" library
   - Built-in WiFi (no shield needed)

3. **Configuration**:
   - Open `Arduino_WiFiShield_SoilSensor.ino`
   - Update WiFi credentials
   - Update backend IP address

4. **Arduino Uno Pin Configuration**:
   ```
   Pin 8 → RS485 RX (SoftwareSerial)
   Pin 9 → RS485 TX (SoftwareSerial)
   Pin 0 (RX) → Serial Monitor (for debugging)
   Pin 1 (TX) → Serial Monitor
   ```

5. **Arduino MKR Pin Configuration**:
   ```
   Pin 13 → RS485 RX (SoftwareSerial)
   Pin 14 → RS485 TX (SoftwareSerial)
   ```

6. **Upload**: Click Upload or Ctrl+U

---

## RS485 Sensor Protocol

### Expected Data Format (Comma-Separated)
The code expects RS485 data in this format:
```
nitrogen,phosphorus,potassium,temperature,moisture,ph,ec\n
```

Example:
```
25.30,18.50,35.20,28.45,55.30,6.75,1550.00\n
```

### Values Range
| Parameter | Min | Max | Unit |
|-----------|-----|-----|------|
| Nitrogen | 18 | 35 | mg/kg |
| Phosphorus | 12 | 28 | mg/kg |
| Potassium | 20 | 45 | mg/kg |
| Temperature | 25 | 33 | °C |
| Moisture | 35 | 65 | % |
| pH | 6.0 | 7.0 | - |
| EC | 1200 | 1800 | µS/cm |

### Customizing the Parser
Edit the `parseRS485Data()` function if your sensor uses a different protocol:
- Binary format: Extract bytes and convert to floats
- Different delimiter: Change from comma to your delimiter
- Different order: Rearrange the value assignments

---

## Troubleshooting

### ESP8266 Issues

**JSON Corruption in Serial Output**:
- ✅ **Fixed**: Using `String(float, 2)` instead of direct concatenation
- Use `String(value, decimals)` for proper float formatting

**No Sensor Response**:
- Check RS485 wiring
- Verify baud rate (4800)
- Check sensor power supply
- Use fallback data: Device will auto-generate test data

**WiFi Connection Fails**:
- Verify SSID and password
- Check WiFi signal strength
- Restart ESP8266 (press Reset button)
- Check DHCP is enabled on router

**Can't Connect to Backend**:
- Verify IP address: `192.168.1.12:3000`
- Ping device from ESP: `ping 192.168.1.12`
- Check backend is running: `npm run dev`
- Verify firewall allows port 3000

### Arduino Issues

**Serial Port Not Detected**:
- Install CH340 drivers (if using compatible board)
- Try different USB port
- Check USB cable (should be data cable, not charging-only)

**Upload Fails**:
- Select correct board type
- Select correct COM port
- Check FTDI drivers (for shields)

**No WiFi Connection**:
- Verify WiFi Shield is properly inserted (for Uno)
- Check antenna connection
- Restart Arduino board

---

## Integration with AgroVoiceAI

### Storing Data in Database
Modify `/api/soil-data/route.ts` to save data:

```typescript
import { prisma } from '@/lib/db';

// In POST handler:
const savedData = await prisma.soilTest.create({
  data: {
    nitrogen: body.nitrogen,
    phosphorus: body.phosphorus,
    potassium: body.potassium,
    temperature: body.temperature,
    moisture: body.moisture,
    ph: body.ph,
    ec: body.ec,
    userId: user.id, // From auth
    timestamp: new Date(),
  },
});
```

### Connecting to Frontend
Create a component to display latest soil readings:

```typescript
// components/Soil/soil-readings.tsx
async function getSoilReadings(userId: string) {
  const readings = await prisma.soilTest.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 10,
  });
  return readings;
}
```

### Adding to Schema (Prisma)
```prisma
model SoilTest {
  id           String   @id @default(cuid())
  userId       String
  nitrogen     Float
  phosphorus   Float
  potassium    Float
  temperature  Float
  moisture     Float
  ph           Float
  ec           Float
  timestamp    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
}
```

---

## Testing

### Test with cURL
```bash
# Test from terminal
curl -X POST http://192.168.1.12:3000/api/soil-data \
  -H "Content-Type: application/json" \
  -d '{"nitrogen":25,"phosphorus":18,"potassium":35,"temperature":28,"moisture":55,"ph":6.8,"ec":1550}'
```

### Test with Postman
1. Create new POST request
2. URL: `http://192.168.1.12:3000/api/soil-data`
3. Body (raw JSON):
```json
{
  "nitrogen": 25.50,
  "phosphorus": 18.30,
  "potassium": 35.20,
  "temperature": 28.45,
  "moisture": 55.40,
  "ph": 6.80,
  "ec": 1550.00
}
```
4. Click Send

### Monitor ESP8266 Serial Output
1. Arduino IDE → Tools → Serial Monitor
2. Baud Rate: 115200
3. Watch the output for data being sent

---

## Network Configuration

### Determining Your IP Address

**On ESP8266**:
- Printed in Serial Monitor after WiFi connection
- Format: `192.168.x.x`

**On Linux/Mac**:
```bash
# Find local IP
ifconfig | grep inet

# Test connectivity
ping 192.168.1.12
```

**On Windows**:
```bash
ipconfig
# Look for IPv4 Address
```

### Port Configuration
- **Next.js Dev Server**: Port 3000 (default)
- **Production**: May use port 80 or 443
- **Firewall**: Ensure port 3000 is open for local network

---

## Security Considerations

### For Production:
1. Use HTTPS instead of HTTP
2. Add authentication token to sensor requests
3. Validate sensor data range
4. Rate limit API endpoint
5. Store sensitive WiFi credentials in EEPROM/LittleFS (not hardcoded)

### Example with Token:
```cpp
// ESP8266
http.addHeader("Authorization", "Bearer YOUR_TOKEN");

// Backend validation
const token = request.headers.get('authorization');
if (!token) return NextResponse.json({...}, {status: 401});
```

---

## File Locations
- ESP8266 Code: `arduino-sketches/ESP8266_SoilSensor.ino`
- Arduino Code: `arduino-sketches/Arduino_WiFiShield_SoilSensor.ino`
- Backend API: `app/api/soil-data/route.ts`

---

## Support
For issues:
1. Check Serial Monitor output
2. Verify network connectivity
3. Test endpoint with cURL
4. Check Next.js server logs
