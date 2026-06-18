# AI Resume Tailor

AI Resume Tailor is a full-stack resume builder that helps users tailor resumes and cover letters to specific job descriptions using Google Gemini. It includes authenticated user accounts, download history, base profile management, selectable resume templates, and an admin dashboard for user oversight, template management, and activity analytics.

## Features

### Resume Builder
- Paste a base resume and job description, then generate a tailored resume with AI
- Choose a resume template (`classic`, `modern`, or `compact`) before generating or on the preview page
- Edit generated content in a structured editor (experience, skills, education, profile)
- Generate cover letters and application Q&A responses
- Export tailored resumes as DOCX (with optional zip packaging) using the selected template layout
- Save multiple named base profiles for reuse

### User Accounts
- Email/password authentication via Supabase Auth
- Per-user resume generation and download tracking
- Download history with date and company filters
- Monthly activity charts on the History page
- Optional Gemini API key stored in browser Settings (overrides `.env`)

### Admin Dashboard
- User management with search, sort, and approval state (`approved` / `rejected`)
- Role management (`user` / `admin`)
- Analytics for resume builds and downloads
- Combined monthly chart (builds vs downloads, different colors)
- Per-user totals: generated resumes, downloads, base profiles
- **Resume template management**
  - Create, edit, activate/deactivate, and delete templates
  - Assign each template to a layout key: `classic`, `modern`, or `compact`
  - Store template metadata in Supabase (`source_type`, `source_filename`, `preview_url`, `template_schema`)
  - Preview thumbnails with click-to-enlarge full-size view
  - Seeded templates: **Classic** (single-column, skills before experience) and **Modern** (profile → experience → education → skills)

Non-admin users who open `/admin` are redirected to `/builder` automatically.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Routing | React Router |
| Auth & Database | Supabase (PostgreSQL + Row Level Security) |
| AI | Google Gemini API (`@google/genai`) |
| Export | `docx`, JSZip |
| Testing | Playwright |

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- A **Supabase** project ([supabase.com](https://supabase.com))
- A **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey))

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/longman0512/ai-resume-builder.git
cd ai-resume-builder
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Supabase (required for auth and persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini (required for AI generation)
GEMINI_API_KEY=your-gemini-api-key
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `GEMINI_API_KEY` | Yes* | Default Gemini key for the app |

\* Users can override this in **Settings** with a key stored in the browser.

### 3. Set up the database

Run the SQL files in the Supabase SQL Editor:

1. **`supabase-schema.sql`** — full schema (fresh project or idempotent re-run)
2. **`supabase-admin-panel.sql`** — admin extras if upgrading an existing database (`status`, `resume_generations`, `downloads_count`, `resume_templates`)

If template features are missing, run section **7** in `supabase-admin-panel.sql` (creates `resume_templates`, RLS policies, and seeds Classic/Modern/Compact). Then refresh the schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```

### 4. Create an admin user

After signing up in the app, promote your account in Supabase:

```sql
UPDATE public.profiles
SET role = 'admin',
    status = 'approved'
WHERE email = 'your-email@example.com';
```

Sign out and sign back in to access `/admin`.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Type-check with TypeScript |
| `npx playwright test` | Run end-to-end tests |

## Project Structure

```
ai-resume-builder/
├── src/
│   ├── pages/           # Route pages (Builder, History, Admin, Profile, Settings)
│   ├── components/      # UI components, resume sections, AdminTemplateManager
│   ├── contexts/        # Auth context (Supabase session + profile)
│   ├── hooks/           # Data hooks (downloads, profiles, templates, generation, export)
│   ├── lib/             # Supabase client, DOCX export, utilities
│   ├── services/        # Gemini AI service
│   └── types/           # Shared TypeScript types
├── public/templates/        # Template preview SVG assets
├── supabase-schema.sql      # Main database schema
├── supabase-admin-panel.sql # Admin/analytics/template migration
├── tests/                   # Playwright tests
└── .github/workflows/       # CI (Playwright)
```

## How Activity Is Tracked

| User action | Database effect |
| --- | --- |
| **Generate** resume | `profiles.resumes_built` +1, row in `resume_generations` |
| **Download** resume | Row in `resume_downloads`, `profiles.downloads_count` +1 |

The admin dashboard reads generation and download events for charts and totals. The History page shows saved downloads for the signed-in user.

## Resume Templates

Templates are stored in `public.resume_templates` and exposed to users through the Builder template selector.

| Layout key | Description |
| --- | --- |
| `classic` | Traditional single-column layout; skills appear before experience |
| `modern` | Clean layout with profile, experience, education, then core technologies |
| `compact` | Dense layout for longer resumes |

Each template record includes:

- `name`, `description`, `template_key`
- `source_type` (`code`, `pdf`, or `docx`) and optional `source_filename`
- `preview_url` (e.g. `/templates/classic-preview.svg`)
- `template_schema` (JSON metadata: section order, labels, placeholders)
- `is_active`, `sort_order`

Admins manage templates at `/admin`. Only **active** templates appear in the Builder dropdown. Preview images can be clicked to view full size in Admin and Builder.

## Routes

| Path | Access | Description |
| --- | --- | --- |
| `/login`, `/signup` | Public | Authentication |
| `/builder` | User | Resume builder |
| `/history` | User | Download history & monthly chart |
| `/profile` | User | Base resume profiles |
| `/settings` | User | Gemini API key settings |
| `/admin` | Admin | User management, template management & analytics |

## Security Notes

- Row Level Security (RLS) restricts users to their own data
- Admins can read all profiles and analytics via role-based policies
- Rejected users are blocked from protected routes
- Do not commit `.env` files or API keys to version control

## License

This project is provided as-is for development and internal use. Add a license file if you plan to distribute it publicly.
