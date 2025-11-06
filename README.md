# skillshot

Resume bullet point manager with AI-powered parsing and skill extraction.

## Setup

### Prerequisites

- Node.js 18+
- Docker (for Supabase)
- Auth0 account
- Google Gemini API key

### Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start local Supabase**

For installation and detailed documentation: https://supabase.com/docs/guides/local-development

```bash
npm run supabase:start
```

This will start all Supabase services and display connection details. The local setup includes:

- API URL: http://127.0.0.1:54321
- Database: PostgreSQL on port 54322
- Studio UI: http://127.0.0.1:54323
- Mailpit (email testing): http://127.0.0.1:54324

3. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:

   - Auth0: Create app at [manage.auth0.com](https://manage.auth0.com/), add callback URL `http://localhost:3000/api/auth/callback`
   - Generate `AUTH0_SECRET`: `openssl rand -hex 32`
   - Gemini API Key: Get key at [makersuite.google.com](https://makersuite.google.com/app/apikey)
   - Supabase credentials are already configured for local development in the example configuration

4. **Run app**
   ```bash
   npm run dev
   ```
   Open [localhost:3000](http://localhost:3000)

## Testing

No automated tests currently implemented. Manual testing via the UI:

- Sign in with Auth0
- Upload resume (PDF/DOCX) to extract bullet points
- Add/edit/delete bullet points manually
- Verify tags are generated automatically

## Database Management

This project uses Supabase for local development with the following commands:

```bash
# Start Supabase services
npx supabase start

# Stop Supabase services
npx supabase stop

# Check Supabase status and credentials
npx supabase status

# Reset database (reapply migrations)
npx supabase db reset

# Connect to database directly
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Database Schema

The database schema is managed through Supabase migrations in `supabase/migrations/`. The schema includes:

- `users` table: Stores user information linked to Auth0
- `bullet_points` table: Stores resume bullet points with tags

### Supabase Studio

Access the Supabase Studio UI at http://127.0.0.1:54323 when services are running. This provides:

- Table editor
- SQL editor
- API documentation
- Database management tools
