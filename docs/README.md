# FRANKIE — Your Intelligent Training Engine

## Overview

FRANKIE (Fitness, Results, Analytics, Nutrition, Knowledge, Intelligent Engine) is a private, single-user intelligence system built exclusively for my husband (Frankie). It is not generic trainer software — it is a cognitive augmentation tool that automates intake processing, assessment interpretation, and program generation. It provides:
- Manage client profiles, onboarding intake forms, and progress logs
- Generate AI-powered meal plans and workout plans tailored to each client (via FRANKIE)
- Track session notes and view plan details in a printable/exportable format
- Visualize client stats and metabolic data (BMR/TDEE) from a central dashboard
- Weight trend area charts with delta tracking on the progress tab
- Macro breakdown donut ring chart (PieChart) on meal plan view
- SVG calorie ring (inspired by SparkyFitness) on client profile header showing daily target
- Emoji mood badges on session notes; dashboard client cards show weight/height stat chips

The app is a full-stack TypeScript project with a React frontend, Express backend, and PostgreSQL database accessed via Drizzle ORM. It uses OpenAI to generate personalized meal and workout plans based on client intake data and an exercise library loaded from local JSON assets. Every generated plan is attributed to FRANKIE, not a generic AI.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture
- **React (Vite)** SPA located in `client/src/`
- **Routing**: `wouter` for lightweight client-side routing; pages include Dashboard, Client Profile, Client Form, Meal Plan View, Workout Plan View
- **State/Data Fetching**: TanStack Query (`@tanstack/react-query`) for all API calls; a shared `apiRequest` helper in `client/src/lib/queryClient.ts`
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives, styled with Tailwind CSS and CSS custom properties for theming
- **Dark mode**: Supported via Tailwind's `darkMode: ["class"]` + CSS variables in `index.css`
- **Forms**: React Hook Form + Zod resolvers for all form validation; schemas are shared from `shared/schema.ts`

### Backend Architecture
- **Express 5** server (`server/index.ts`) serving both API routes and the Vite dev server (or static build in production)
- **API routes** registered in `server/routes.ts`; covers clients, intake, progress logs, meal plans, workout plans, and session notes
- **Storage layer** (`server/storage.ts`): An interface (`IStorage`) with a Drizzle-backed implementation; makes swapping storage easy
- **OpenAI integration** (`server/openai.ts`): Builds prompts using client + intake data and the exercise library asset, then calls OpenAI API to generate meal or workout plans as structured JSON
- **Build**: Custom `script/build.ts` uses Vite for client bundling and esbuild for server bundling; key deps (openai, drizzle, express, etc.) are bundled into the server output to reduce cold start time

### Data Storage
- **PostgreSQL** via Drizzle ORM; connection configured via `DATABASE_URL` env variable
- **Schema** defined in `shared/schema.ts` (shared between frontend and backend for type safety):
  - `clients` — core client info (name, email, DOB, weight, activity level, etc.)
  - `clientIntake` — detailed onboarding questionnaire (diet, goals, equipment, medical, etc.)
  - `progressLogs` — periodic weight/measurement logs
  - `mealPlans` / `workoutPlans` — AI-generated plans stored as JSONB
  - `sessionNotes` — trainer notes per session
  - `conversations` / `messages` — chat conversation storage (integrations scaffold)
- Schema uses `gen_random_uuid()` for all primary keys
- `drizzle-zod` generates Zod schemas from Drizzle tables for runtime validation

### Shared Code
- `shared/schema.ts` exports both Drizzle table definitions and Zod insert schemas, used directly in both API route validation and frontend form validation
- `shared/models/chat.ts` defines the conversations/messages tables separately (integration scaffold)

### Integration Utilities
- Scaffolded utilities exist in `server/integrations/` and `client/integrations/`:
  - **chat**: OpenAI chat conversation routes and DB storage
  - **audio**: Voice recording, PCM16 streaming playback, speech-to-text, TTS routes
  - **image**: Image generation via `gpt-image-1`
  - **batch**: Rate-limited, retrying batch processing utility for bulk AI tasks
- These are not wired into the main app routes by default — they are available for use if needed

### Auth
- No authentication is currently implemented. The app is designed for single-trainer use without login.

---

## External Dependencies

### AI / OpenAI
- **OpenAI SDK** used in `server/openai.ts` for generating meal and workout plans
- Configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables (AI Integrations endpoint)
- Exercise library JSON (`attached_assets/exercises_canonical_*.json`) is loaded at server start and injected into AI prompts as context

### Database
- **PostgreSQL** — required, provisioned via `DATABASE_URL` env variable
- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`, `drizzle-zod`) for schema definition, queries, and migrations
- **`pg`** Node.js driver with connection pooling

### UI Libraries
- **shadcn/ui** component library (New York style), with Radix UI primitives
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Recharts** for charts
- **react-day-picker** for calendar components
- **Embla Carousel** for carousels
- **Vaul** for drawer component

### Forms & Validation
- **React Hook Form** + **@hookform/resolvers**
- **Zod** for schema validation (shared between client and server)

### Other Notable Packages
- **wouter** — client-side routing
- **date-fns** — date utilities
- **nanoid** — ID generation
- **express-session** + **connect-pg-simple** — session middleware (available but not fully wired for auth)
- **memorystore** — in-memory session store fallback
- **passport** / **passport-local** — auth scaffolding (available, not active)
- **nodemailer** — email (available, not active)
- **stripe** — payments (available, not active)
- **xlsx** — Excel export (available, not active)
- **p-limit** / **p-retry** — batch concurrency/retry control