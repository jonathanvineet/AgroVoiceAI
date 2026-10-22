#!/usr/bin/env node
// Sends realistic NPK sensor readings to /api/soil-data, like the ESP8266 sketch does.
// Usage: node scripts/simulate-soil-sensor.mjs [baseUrl] [count] [intervalSeconds]
const base = process.argv[2] || 'http://localhost:3000'
const count = Number(process.argv[3] || 1)
const interval = Number(process.argv[4] || 5)

const jitter = (v, spread) => Math.round((v + (Math.random() - 0.5) * spread) * 10) / 10

for (let i = 0; i < count; i++) {
  const reading = {
    deviceId: 'SIMULATED-ESP8266',
    nitrogen: jitter(82, 10),
    phosphorus: jitter(46, 8),
    potassium: jitter(40, 8),
    temperature: jitter(24, 2),
    moisture: jitter(82, 4),
    ph: jitter(6.5, 0.4),
    ec: jitter(1450, 200)
  }
  const res = await fetch(`${base}/api/soil-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.SOIL_SENSOR_KEY ? { 'x-sensor-key': process.env.SOIL_SENSOR_KEY } : {})
    },
    body: JSON.stringify(reading)
  })
  console.log(res.status, JSON.stringify(reading))
  if (i < count - 1) await new Promise(r => setTimeout(r, interval * 1000))
}
