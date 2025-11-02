# skillshot

Resume bullet point manager with AI-powered parsing and skill extraction.

## Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Auth0 account
- Google Gemini API key

### Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:

   - Auth0: Create app at [manage.auth0.com](https://manage.auth0.com/), add callback URL `http://localhost:3000/api/auth/callback`
   - Generate `AUTH0_SECRET`: `openssl rand -hex 32`
   - Gemini API Key: Get key at [makersuite.google.com](https://makersuite.google.com/app/apikey)

3. **Start database**

   ```bash
   docker volume create pg_data
   docker-compose up -d
   ```

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

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs -f postgres

# Connect to database
docker exec -it skillshot-postgres psql -U skillshot_user -d skillshot_db
```
