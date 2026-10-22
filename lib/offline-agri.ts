/**
 * Offline agronomy helpers used when Gemini / the soil ML server are not
 * configured or unreachable, so every screen still works in a demo.
 */

// Mean N, P, K, temperature (°C), humidity (%), pH per crop from the public
// "Crop Recommendation" dataset. Keys match `cropInEnglish` in config/constants.
const CROP_PROFILES: Record<number, [number, number, number, number, number, number]> = {
  1: [80, 48, 40, 23.7, 82, 6.4], // Rice
  2: [78, 48, 20, 22.4, 65, 6.2], // Maize
  3: [78, 47, 40, 25.0, 80, 6.7], // Jute
  4: [118, 46, 20, 24.0, 80, 6.9], // Cotton
  5: [22, 17, 31, 27.4, 95, 6.0], // Coconut
  6: [50, 59, 50, 33.7, 92, 6.7], // Papaya
  7: [20, 17, 10, 22.8, 92, 7.0], // Orange
  8: [21, 134, 200, 22.6, 92, 5.9], // Apple
  9: [100, 18, 50, 28.7, 92, 6.4], // Muskmelon
  10: [99, 17, 50, 25.6, 85, 6.5], // Watermelon
  11: [23, 132, 200, 23.9, 82, 6.0], // Grapes
  12: [20, 27, 30, 31.2, 50, 5.8], // Mango
  13: [100, 82, 50, 27.4, 80, 6.0], // Banana
  14: [19, 19, 40, 21.8, 90, 6.4], // Pomegranate
  15: [19, 68, 19, 24.5, 65, 6.9], // Lentil
  16: [40, 67, 19, 30.0, 65, 7.1], // Blackgram
  17: [21, 47, 20, 28.5, 85, 6.7], // Mungbean
  18: [21, 48, 20, 28.2, 53, 6.8], // Mothbeans
  19: [21, 68, 20, 27.7, 48, 5.8], // Pigeonpeas
  20: [21, 67, 20, 20.1, 22, 5.7], // Kidneybeans
  21: [40, 68, 80, 18.9, 17, 7.3], // Chickpea
  22: [101, 29, 30, 25.5, 58, 6.8] // Coffee
}
// Rough spread of each feature, used to normalise distances.
const SCALE = [37, 33, 51, 5, 22, 0.8]

export type SoilInput = {
  N?: number
  P?: number
  K?: number
  nitrogen?: number
  phosphorus?: number
  potassium?: number
  temperature?: number
  humidity?: number
  moisture?: number
  ph?: number
}

/** Nearest-profile crop recommendation. Returns the crop id (1-22). */
export function recommendCrop(input: SoilInput): number {
  const x = [
    Number(input.N ?? input.nitrogen ?? 0),
    Number(input.P ?? input.phosphorus ?? 0),
    Number(input.K ?? input.potassium ?? 0),
    Number(input.temperature ?? 27),
    Number(input.humidity ?? input.moisture ?? 70),
    Number(input.ph ?? 6.5)
  ]
  let best = 1
  let bestDist = Infinity
  for (const [id, profile] of Object.entries(CROP_PROFILES)) {
    const d = profile.reduce((sum, v, i) => sum + ((x[i] - v) / SCALE[i]) ** 2, 0)
    if (d < bestDist) {
      bestDist = d
      best = Number(id)
    }
  }
  return best
}

const TOPICS: { keys: RegExp; answer: string }[] = [
  {
    keys: /pest|insect|aphid|worm|bug|பூச்சி/i,
    answer:
      '**Integrated pest management**\n\n1. Inspect the underside of leaves twice a week.\n2. Spray 5 ml neem oil + 1 ml soap per litre of water every 7–10 days.\n3. Use yellow sticky traps for whitefly/aphids and pheromone traps for fruit borers.\n4. Remove and burn badly infested plants.\n5. Use chemical pesticides only as a last resort and follow the label dose. Upload a photo in **Pest Identification** for a specific diagnosis.'
  },
  {
    keys: /fertili[sz]er|npk|urea|manure|nutrient|உரம்/i,
    answer:
      '**Fertilizer guidance**\n\n- Get a soil test first (see **Soil Test**).\n- Apply 5–10 t/acre farmyard manure before ploughing.\n- Typical paddy dose in Tamil Nadu: 120:40:40 kg N:P:K per hectare, with N split into 3 doses.\n- Apply fertilizer early morning or evening and irrigate lightly afterwards.\n- Avoid excess urea; it encourages pests and lodging.'
  },
  {
    keys: /water|irrigat|drip|rain|தண்ணீர்|பாசனம்/i,
    answer:
      '**Irrigation tips**\n\n- Drip irrigation saves 40–60% water for vegetables, banana and sugarcane (subsidy available under PMKSY).\n- Irrigate at critical stages: flowering and grain filling.\n- For paddy, alternate wetting and drying (AWD) saves ~25% water without yield loss.\n- Mulch to keep moisture in the soil.'
  },
  {
    keys: /soil|ph|acid|alkaline|மண்/i,
    answer:
      '**Soil health**\n\n- Ideal pH for most crops: 6.0–7.5.\n- Acidic soil (pH < 6): apply agricultural lime.\n- Alkaline soil (pH > 8): apply gypsum and organic matter.\n- Grow green manure (daincha, sunhemp) and incorporate before flowering.\n- Test soil every 2 years; free Soil Health Cards are issued by the agriculture department.'
  },
  {
    keys: /rice|paddy|நெல்/i,
    answer:
      '**Paddy**\n\n- Seasons in TN: Kuruvai (Jun–Sep), Samba (Aug–Jan), Thaladi (Oct–Feb).\n- Popular varieties: CO 51, ADT 45, BPT 5204.\n- Transplant 20–25 day old seedlings at 2–3 per hill.\n- Watch for stem borer, leaf folder and blast; drain the field for blast control.'
  },
  {
    keys: /weather|monsoon|temperature|climate|வானிலை/i,
    answer:
      '**Weather-based planning**\n\nCheck the **Weather** page for your district forecast. Avoid spraying when rain is expected within 6 hours, delay fertilizer before heavy rain, and harvest mature crops before forecast storms.'
  },
  {
    keys: /price|market|sell|mandi|விலை|சந்தை/i,
    answer:
      '**Selling your produce**\n\nSee today’s district prices on the **Market** page and price trends in **Insights**. Compare with eNAM and Uzhavar Sandhai rates, grade and clean produce before selling, and store in a cool shaded place to avoid distress sales.'
  },
  {
    keys: /scheme|subsidy|loan|insurance|pm.?kisan|திட்ட/i,
    answer:
      '**Government support**\n\n- PM-KISAN: ₹6,000/year income support.\n- PMFBY: crop insurance at 2% (kharif) / 1.5% (rabi) premium.\n- Kisan Credit Card: crop loans at concessional interest.\n- PMKSY: up to 100% subsidy on drip for small/marginal farmers in TN.\nVisit your block agriculture office or the TNAGRISNET portal to apply.'
  }
]

const CROP_NAMES = [
  'Rice', 'Maize', 'Jute', 'Cotton', 'Coconut', 'Papaya', 'Orange', 'Apple', 'Muskmelon',
  'Watermelon', 'Grapes', 'Mango', 'Banana', 'Pomegranate', 'Lentil', 'Blackgram', 'Mungbean',
  'Mothbeans', 'Pigeonpeas', 'Kidneybeans', 'Chickpea', 'Coffee'
]

function cropGuide(question: string): string | null {
  const idx = CROP_NAMES.findIndex(c => new RegExp(`\\b${c}\\b`, 'i').test(question))
  if (idx < 0 || !/grow|cultivat|how|recommend/i.test(question)) return null
  const [n, p, k, t, h, ph] = CROP_PROFILES[idx + 1]
  return `**Growing ${CROP_NAMES[idx]}**\n\n| Condition | Ideal |\n|---|---|\n| Nitrogen (N) | ~${n} kg/ha |\n| Phosphorus (P) | ~${p} kg/ha |\n| Potassium (K) | ~${k} kg/ha |\n| Temperature | ~${t} °C |\n| Humidity | ~${h}% |\n| Soil pH | ~${ph} |\n\n1. Prepare land with 2–3 ploughings and add 5–10 t/acre farmyard manure.\n2. Apply P and K fully as basal dose; split N into 2–3 doses.\n3. Irrigate at sowing, flowering and fruit/grain set; avoid waterlogging.\n4. Weed at 20 and 40 days after sowing.\n5. Scout weekly for pests and use neem-based sprays first.\n\nContact your block agriculture officer for district-specific varieties.`
}

/** Short, practical answer for common farming questions. */
export function offlineAnswer(question: string): string {
  const guide = cropGuide(question)
  if (guide) return `${guide}\n\n_Answered by AgroVoiceAI offline assistant._`
  const hit = TOPICS.find(t => t.keys.test(question))
  const body =
    hit?.answer ??
    'I can help with pests, fertilizer, irrigation, soil health, paddy cultivation, weather planning, market prices and government schemes. Ask about any of these, or use the Soil Test, Pest Identification, Weather and Market pages.'
  return `${body}\n\n_Answered by AgroVoiceAI offline assistant._`
}
