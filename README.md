# AgroVoiceAI

A bilingual (English / Tamil) farming assistant for Tamil Nadu farmers: AI chat, soil-sensor crop recommendation, pest identification from a photo, district weather and live market prices, all in one web app.

---

## The problem

Small and marginal farmers in Tamil Nadu make their biggest decisions (what to plant, when to spray, when to sell) with very little data:

- **No soil insight.** Lab soil tests take weeks, so farmers plant by habit and over-apply fertilizer.
- **Pests get diagnosed late.** An agriculture officer may cover dozens of villages. By the time a pest is identified, the damage is done.
- **Price blindness.** Farmers sell to middlemen without knowing that day's district market rate.
- **Language and literacy.** Most agri-information portals are English-only and text-heavy.

## What AgroVoiceAI solves

| Need | Feature | How it works |
|---|---|---|
| "What should I grow?" | **Soil Test**: an ESP8266 + NPK sensor posts readings, and the app recommends one of 22 crops | `arduino-sketches/`, `/api/soil-data`, `/api/crop-recommend` |
| "What is eating my crop?" | **Pest Identification**: upload or crop a photo to get the pest name, severity and treatment | Gemini Vision, `/api/classify` |
| "Any farming question" | **Voice/text chat** in English or Tamil, with saved chat history | Gemini, `/api/chat` |
| "Should I sell today?" | **Market**: today's vegetable and fruit prices per district, plus an **Insights** price-trend chart | Scraper `/api/scrape` with daily snapshots in `market_prices` |
| "Will it rain?" | **Weather**: 5-day district forecast | OpenWeatherMap `/api/weather` |

The app keeps working without internet or API keys:
- **Without Supabase**, it stores accounts, profiles, prices, soil readings and uploads as local JSON files in `.data/`.
- **Without a Gemini key**, chat answers come from a built-in agronomy knowledge base.
- **Without the ML server**, crop recommendation uses a built-in nearest-profile model.
- **Without network**, market prices are served from the last cached scrape.

---

## Run it

```bash
npm install
cp .env.example .env        # fill only what you have; everything is optional for a demo
npm run dev                 # http://localhost:3000
```

**Offline demo mode** (no cloud accounts at all):

```bash
DATA_BACKEND=local npm run dev
```

| Env var | Needed for | Without it |
|---|---|---|
| `GOOGLE_API_KEY` | Gemini chat + pest vision | Chat uses the offline assistant; pest ID shows a "needs key" message |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Cloud auth/DB/storage | Local `.data/` store |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Cloud chat history | Local `.data/kv.json` |
| `OPENWEATHERMAP_API_KEY` | Live forecast | Sample forecast |
| `SOIL_TEST_SERVER_URL` | External crop ML model | Built-in model |
| `SOIL_SENSOR_KEY` | Authenticating the ESP8266 | Sensor endpoint is open |

Supabase setup: `SUPABASE_TABLE_SETUP.md`, plus `supabase/migrations/*.sql` for the `soil_readings` and `pest_feedback` tables. The app falls back to local storage for those tables until the migration has been run.

---

## How to show the demo

Allow about 8 minutes. Before you present:

1. Run `npm run dev`. Use `DATA_BACKEND=local npm run dev` if the venue Wi-Fi is unreliable.
2. Create the demo account once: open `/sign-up` and register `demo@farm.in` / `demo123`.
3. Complete onboarding: set the name, pick the district **Chennai**, and add a preference such as "I grow paddy on 2 acres".
4. Load a soil reading. Either power on the ESP8266 sensor (see `SOIL_SENSOR_SETUP.md`), or run the simulator:
   ```bash
   node scripts/simulate-soil-sensor.mjs http://localhost:3000
   ```
5. Keep a leaf photo with a visible pest (aphids or leaf spot) on the laptop.
6. Open the Market page once while online. This caches prices in case the network drops later.

Live flow:

| # | Screen | What to do | What to say |
|---|---|---|---|
| 1 | Home `/en` | Toggle to **தமிழ்** (`/ta`) and back | "Built for Tamil-speaking farmers. Every screen is bilingual." |
| 2 | Sign in | Log in as `demo@farm.in` | "Accounts work on Supabase or fully offline." |
| 3 | **Soil Test** | The latest sensor reading appears (N, P, K, pH, moisture, temperature). Click **Get recommendation** | "The NPK sensor posts readings over Wi-Fi. We match them against 22 crop profiles." |
| 4 | Soil chat | Submit the **Have any question?** box empty, then ask "What fertilizer schedule?" | "The assistant explains how to grow the recommended crop." |
| 5 | **Pest Identification** | Upload the leaf photo, crop it, and submit. Then mark the result **Correct** and send feedback | "Gemini Vision returns the pest, severity and treatment. Farmer feedback is stored to improve accuracy." |
| 6 | **Chat** | Use the mic or type "How do I control stem borer in paddy?" | "Voice input, streamed answers and saved history in the sidebar." |
| 7 | **Market** | Show today's Chennai vegetable prices, then switch to fruits | "Live district rates, so farmers know a fair price before selling." |
| 8 | **Insights** tab | Pick Onion Big | "Every scrape stores a daily snapshot, which builds this price-trend chart." |
| 9 | **Weather** | Show the 5-day forecast | "Plan spraying and harvest around rain." |
| 10 | Settings | Change the district | "Personalisation drives the market and weather pages." |

**If something fails live:**
- No internet: market prices come from the cache, chat uses the offline assistant, and the forecast falls back to sample data.
- No soil reading: run the simulator again.
- Pest ID shows the "needs GOOGLE_API_KEY" message: explain that vision is the only cloud-only feature, and show a screenshot of a previous result.

---

## Presentation guide

Use 8–10 slides and spend about 1 minute per slide.

1. **Title.** AgroVoiceAI: AI farming assistant for Tamil Nadu. Show the team and guide.
2. **Problem.** The four pain points above. If you have them, cite district statistics (farm sizes, distress sales).
3. **Existing solutions and their gaps.** Lab soil tests are slow. Kisan call centres are voice-only, with no image or sensor data. Price portals are English-only.
4. **Our solution.** One app, five tools, bilingual, works offline.
5. **Architecture.** ESP8266 + NPK sensor → `/api/soil-data` → Next.js (App Router) → data layer (Supabase or local) → Gemini for chat and vision → scraper → OpenWeatherMap. Use one diagram.
6. **Hardware.** Photo of the sensor rig. Explain the RS485 NPK probe → ESP8266 → HTTPS POST path.
7. **Live demo.** Follow the flow above.
8. **Results.** Crop recommendation covers 22 crops. Pest feedback measures accuracy (count *Correct* against *Incorrect* in `pest_feedback`). Price history grows by one data point per item per day.
9. **Social impact and SDGs.** SDG 2 (Zero Hunger), SDG 12 (Responsible consumption: less fertilizer overuse), SDG 1 (No poverty: fair prices).
10. **Future work.** On-device pest model for offline vision, SMS/IVR channel, Uzhavar Sandhai integration, and more sensor types (soil moisture alerts).

Likely viva questions:
- *How does the crop recommendation work?* `lib/offline-agri.ts` holds 22 crop profiles from the public Crop Recommendation dataset. The app normalises N, P, K, temperature, humidity and pH, then picks the nearest profile. An external ML server can replace it through `SOIL_TEST_SERVER_URL`.
- *What if the farmer has no internet?* The data layer (`lib/data.ts`) falls back to local storage, and every external call has a cached or offline path.
- *Security?* The server takes the user id from the session cookie, never from the request body. Local passwords are hashed with scrypt, and session cookies are signed with HMAC. The sensor endpoint accepts an optional shared key.

---

## Code map

- `app/[locale]/*`: pages (`en`, `ta`)
- `app/api/*`: API routes
  - `auth/*`: sign up, sign in, logout, session (Supabase or local)
  - `user/*`: profile field updates (session-scoped)
  - `chat`, `soil-test-chat`: Gemini chat with offline fallback
  - `classify`: Gemini Vision pest identification
  - `soil-data`, `crop-recommend`: sensor ingest and crop recommendation
  - `scrape`, `scrape/fruits`, `get-market-prices`, `store-market-prices`: market prices and price history
  - `upload-image`, `upload-pest-image`, `uploads/[...path]`: image uploads
  - `pest-feedback`: stores whether the model's answer was correct
- `lib/backend.ts`: picks the `supabase` or `local` backend
- `lib/data.ts`: the only module that touches persistence
- `lib/local-auth.ts`, `lib/local-store.ts`: offline auth and JSON store
- `lib/redis.ts`: Upstash with a local fallback
- `lib/offline-agri.ts`: offline crop model and Q&A
- `arduino-sketches/`: ESP8266 / Arduino Wi-Fi sensor firmware
- `scripts/simulate-soil-sensor.mjs`: sensor simulator for demos

Tests: `npm test`. Type-check: `npm run type-check`.
