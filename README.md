<div align="center">
	<p>

	[![Open Source Love svg1](https://badges.frapsoft.com/os/v2/open-source.svg?v=103)](https://github.com/AntonyJudeShaman/)
	[![TypeScript](https://badges.frapsoft.com/typescript/love/typescript.svg?v=103)](https://github.com/ellerbrock/typescript-badges/)
	![Visitors](https://api.visitorbadge.io/api/visitors?path=AntonyJudeShaman/AgroVoiceAI&countColor=blue&style=flat)
	![GitHub last commit](https://img.shields.io/github/last-commit/AntonyJudeShaman/AgroVoiceAI?color=blue)
	![GitHub repo size](https://img.shields.io/github/repo-size/AntonyJudeShaman/AgroVoiceAI?color=blue)

	</p>
</div>

# AgroVoiceAI

AgroVoiceAI is an experimental, full-stack Next.js application that provides farmers with AI-driven assistance for crop management, pest identification, local weather, and market information. The project uses Supabase for authentication and data storage and integrates AI services for natural language responses.

**This README documents:**
- What the app does
- Key architecture and files
- Environment variables you must set
- Local setup and run steps
- Notes about Supabase profiles and common gotchas (onboarding)
- Troubleshooting and next steps

**Quick links:**
- Source: [README.md](README.md)
- Main API routes: `app/api/*` (moved from `app/[locale]/api/*` during migration)

## Features

- Chat-based agricultural Q&A (AI assistant)
- Onboarding flow that saves user preferences and location
- Weather dashboard (local weather per district)
- Market data pages (fruits/vegetables)
- Pest identification image upload
- User profile settings (name, username, image, phone, district, chatbot preferences)

## Tech stack

- Next.js (App Router)
- React + TypeScript
- Supabase (Auth + Postgres) with a `profiles` table
- Tailwind CSS for styling
- Prisma references present in env (legacy) — main data access is Supabase now
- Jest for tests

## Important architecture notes

- Authentication: Supabase Auth. The user profile details are stored in a custom `profiles` table (public.profiles) rather than `auth.users`.
- Column naming: Supabase table columns use snake_case (for example `page_shown`, `user_district`, `chatbot_preference`). Server-side code expects these names.
- API routes: During migration, API routes were moved from `app/[locale]/api/*` to `app/api/*` so they are not language-scoped. If you previously had 404s for `/api/chat`, check `app/api/chat/route.ts` exists.

## Profiles table (expected schema)

The app expects a `profiles` table with at least the following columns (snake_case):

- `id` (uuid) — primary key, matches `auth.users.id`
- `email` (text)
- `name` (text)
- `user_name` (text)
- `phone` (text)
- `age` (int)
- `user_district` (text)
- `gender` (text)
- `image` (text)
- `pest_image` (text)
- `chatbot_preference` (text)
- `page_shown` (boolean) — whether onboarding completed

RLS policies: The project uses Row Level Security (RLS) on `profiles`. If you see 401/403 errors, confirm your Supabase policy and that server-side admin client is used for updates where appropriate.

## Environment variables

Create a `.env` in the project root (example partial variables the project uses):

- `NEXT_PUBLIC_SUPABASE_URL` — public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (use for admin tasks only, keep secret)
- `OPENAI_API_KEY` or `GOOGLE_API_KEY` — AI provider keys (local/test keys may be used)
- `DATABASE_URL` — used by legacy Prisma tooling (MySQL in your `.env`), not required for Supabase runtime
- `NEXT_PUBLIC_PASSWORD`, `SALT`, and other keys used by services in the repo

Do NOT commit secrets. Use local dev `.env` and CI/CD secrets for deployments.

## Local development (recommended)

Prerequisites:

- Node.js 20.x (the project was migrated to Node 20)
- pnpm or npm

Install and run:

```bash
# from project root
pnpm install    # or npm install
nvm use 20      # ensure node 20
pnpm dev        # or npm run dev
```

Open http://localhost:3000.

## Running tests

The project uses Jest. Run:

```bash
pnpm test
```

## Key developer files

- `app/actions.ts` — server actions to fetch/update current user and update `page_shown`.
- `app/api/*` — API endpoints. After migration these live under `app/api` (not under `app/[locale]/api`).
- `components/Form/*` — onboarding forms and profile forms.
- `components/Chat/*` — chat UI components.
- `components/Miscellaneous/session-page-container.tsx` — component that gates pages based on `page_shown`.

## Common issues & troubleshooting

- Onboarding redirect loop: If after completing onboarding you are still redirected to `/onboarding/location`, ensure:
	- The `profiles` record has `page_shown: true` (snake_case). The code queries `page_shown`, not `pageShown`.
	- Server-side `getCurrentUser()` returns the `page_shown` property.
	- Some components (older files) may still check `pageShown` — search and replace with `page_shown`.

- 404 for `/api/chat` or other API routes: Confirm API files are in `app/api/*` and not under `app/[locale]/api/*`.

- Hydration errors (React): Typically caused by mismatched DOM structure (e.g., block elements inside `<p>`). Check console warnings and component markup.

- Supabase permission errors: Check RLS and whether your code uses the admin (service role) client for privileged updates.

## Weather API (OpenWeatherMap) — usage notes

This project calls OpenWeatherMap for weather data. During development the API route lives in `app/api/weather/route.ts`.

Important: OpenWeatherMap provides multiple products — the project uses the 5-day / 3-hour **forecast** API for the weather dashboard (returns a `list` array), and the Current Weather API for single-point current data. The UI in `components/Weather/*` expects the forecast API format (an object with a `list` array of forecast points).

Endpoints used:

- Forecast (5 day / 3 hour):
	`https://api.openweathermap.org/data/2.5/forecast?q={city name}&appid={API key}&units=metric`
- Current weather (single point):
	`https://api.openweathermap.org/data/2.5/weather?q={city name}&appid={API key}&units=metric`

Query parameters you may need:

- `q` — city name (or `city,cc`)
- `lat` and `lon` — preferred for accuracy; use the Geocoding API to convert city names to coordinates
- `appid` — your OpenWeatherMap API key (required)
- `units` — `metric` | `imperial` | `standard` (use `metric` for Celsius)
- `lang` — language for textual descriptions

Example forecast request:

```
https://api.openweathermap.org/data/2.5/forecast?q=Chennai&appid=YOUR_KEY&units=metric
```

Example current weather request:

```
https://api.openweathermap.org/data/2.5/weather?lat=13.09&lon=80.27&appid=YOUR_KEY&units=metric
```

Response shape (forecast): the forecast endpoint returns a top-level `list` array where each item includes fields like `dt`, `dt_txt`, `main` (temps/pressure/humidity), `weather` (array of weather conditions), `wind`, `clouds`, and `visibility`. The app groups `list` items by date and presents daily summaries.

Response shape (current): the current weather endpoint returns a single object with `coord`, `weather`, `main`, `wind`, `clouds`, `sys`, `name`, etc.

Troubleshooting tips:

- If you see `No forecast data available` — check the API route logs (`console.error`) and confirm `process.env.OPENWEATHERMAP_API_KEY` is set and valid.
- If the server returns an error like `city not found`, try encoding the location and/or use lat/lon coordinates from the Geocoding API.
- For development without a real API key, `app/api/weather/route.ts` returns mock forecast data when it detects a missing/dummy key.

Implementation notes in this repo:

- `app/api/weather/route.ts` calls OpenWeatherMap's forecast API and returns the JSON directly. It also includes a mock response for local development.
- `components/Weather/weather-home.tsx` expects the forecast `list` array and groups items by `dt_txt` date strings.
- Ensure the profile field used for location is `user_district` (snake_case) when passing the value to the weather API.

## Deployment tips

- Provide Supabase env vars (both anon and service_role) in your hosting provider (Vercel, Netlify, etc.).
- Use Node 20 runtime when deploying.
- Keep your `SUPABASE_SERVICE_ROLE_KEY` only in server-side env; never expose it to the browser.

## Migration notes (Prisma → Supabase)

- The repo contains legacy Prisma configuration (see `.env DATABASE_URL` comment). Primary runtime DB operations have been migrated to Supabase. If you maintain Prisma tooling, keep its `DATABASE_URL` configured separately for schema generation.

## Contributing

- Please open issues or pull requests on GitHub. Keep feature changes small and focused.

## Contact

- Maintainer: AntonyJudeShaman

---

If you'd like, I can also:

- Add a `CONTRIBUTING.md` with development conventions
- Generate a smaller `docs/` folder with architecture diagrams and API examples
- Create a `dev-setup.sh` script to bootstrap a dev environment

Tell me which of those you'd like next.

