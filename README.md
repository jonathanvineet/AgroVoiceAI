# AgroVoiceAI

AgroVoiceAI is an experimental, full-stack Next.js application that provides farmers with AI-driven assistance for crop management, pest identification, local weather, and market information. It uses Supabase for authentication and storage and integrates the Google GenAI (Gemini) SDK for AI features.

This README includes:
- Project overview
- Architecture and key files
- Environment variables and AI keys
- Local setup, testing, and deployment
- Gemini usage notes (models, streaming, image inputs)
- Troubleshooting and developer tips

---

## Quick links
- API routes: `app/api/*`
- Chat: `app/api/chat/route.ts`
- Image classification: `app/api/classify/route.ts`

---

## Features
- Chat-based agricultural Q&A (AI assistant)
- Pest identification via image upload (Gemini Vision)
- Onboarding flow storing user preferences and location
- Weather dashboard (OpenWeatherMap)
- Market data pages
- User profile settings and feedback

---

## Tech stack
- Next.js (App Router)
- React + TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS
- Jest for tests

---

## Important files & folders
- `app/actions.ts` — server actions and user helpers
- `app/api/*` — server API endpoints
- `components/Chat/*` — chat UI
- `components/Pest/*` — pest upload + result UI
- `lib/` — helpers (`supabase-client.ts`, `auth.ts`, `redis.ts`, etc.)

---

## Environment variables
Create a `.env` in the project root (do NOT commit secrets). Typical variables used:

Server (required):
- `GOOGLE_API_KEY` — Google GenAI / Gemini API key (server-only)
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — Supabase client keys
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key (server-only)

Optional / legacy:
- `DATABASE_URL` — for Prisma tooling (if used)
- `OPENWEATHERMAP_API_KEY` — for weather features

Notes:
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_API_KEY` out of client builds.
- The code expects a `profiles` table with snake_case columns (e.g., `user_district`, `page_shown`).

---

## Gemini (Google GenAI) integration notes
This repo uses the `@google/genai` SDK in server routes to access Gemini models for text and image understanding.

Key points:
- Use `GOOGLE_API_KEY` with the Generative AI API enabled in Google Cloud.
- Chat streaming: `client.models.generateContentStream({ model, contents })` and iterate chunks: `for await (const c of response) { c.text }`.
- Image inputs: Convert the uploaded file to base64 and send as `inlineData: { mimeType, data }` inside `contents`.
- The app enforces a 20 MB inline data limit for images. Adjust if you switch to external file upload APIs in GenAI.
- Model names used in code: examples include `gemini-2.5-flash` and `gemini-2.0-flash-exp`. Update model names if your account/region uses different model IDs.

Streaming & thinking:
- Gemini models support thinking configurations; be careful when changing temperature or other generation params with certain models (the repo uses defaults in most routes).

Cost & safety:
- Test with a restricted key in dev to avoid large costs. Monitor usage in Google Cloud.

---

## API route highlights & behavior

- `app/api/chat/route.ts`
  - Streams Gemini model output back to the client via a `ReadableStream`.
  - Saves completed chat payload to Redis: `chat:${id}` and `user:chat:${userId}` sorted set.

- `app/api/classify/route.ts`
  - Receives multipart `image`, validates type/size, converts to base64, and calls Gemini for vision analysis.
  - Expects JSON from the model (the route strips code fences before parsing).

Common pitfalls:
- `401 Unauthorized`: ensure `auth()`/`getCurrentUser()` returns session data and Supabase tokens are configured.
- `JSON parse error` from classify: Gemini can sometimes add formatting. The route attempts to normalize, but inspect `raw_response` in logs when parsing fails.
- `Model not available`: swap to a supported model name in your account/region.

---

## Local development
Prerequisites:
- Node.js 20.x
- pnpm (preferred) or npm

Install and run:
```bash
pnpm install
# or
npm install

# Start dev server
pnpm dev
# or
npm run dev
```
Open http://localhost:3000

---

## Tests & linting
Run Jest tests:
```bash
pnpm test
```

Run a linter or TypeScript build as needed:
```bash
pnpm build
```

---

## Deployment tips
- Provide Supabase and `GOOGLE_API_KEY` as environment variables in your host (Vercel, Netlify, etc.).
- Use Node 20 runtime.
- Keep service_role keys private and only in server env.

---

## Troubleshooting checklist
- Check env variables and ensure keys are present on the server.
- Confirm `profiles` table exists with expected snake_case columns.
- If streaming fails, verify model name & that `@google/genai` is installed and at a compatible version.
- For image classification errors, confirm the uploaded file type and size (the code limits inline images to ~20 MB).

---

## Contributing
Open issues or PRs on GitHub. For large changes, open an issue to discuss first.

---

If you want, I can also:
- Add `CONTRIBUTING.md` with dev conventions
- Add a `docs/` folder with API examples and architecture diagrams
- Create a `dev-setup.sh` bootstrap script

Tell me which of those you'd like next.

If you'd like, I can also:

- Add a `CONTRIBUTING.md` with development conventions
- Generate a smaller `docs/` folder with architecture diagrams and API examples
- Create a `dev-setup.sh` script to bootstrap a dev environment

Tell me which of those you'd like next.

