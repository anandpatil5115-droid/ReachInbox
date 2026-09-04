# ReachInbox Email Job Scheduler

A full-stack email job scheduling application built as part of the **Outbox Labs Full-Stack Hiring Assignment**. Users can create email campaigns, upload leads via CSV/TXT, schedule individual email jobs with configurable delays and rate limits, and monitor delivery status through a polished dashboard.

---

## Project Overview

ReachInbox Scheduler enables users to:

- Authenticate via Google OAuth
- Create email campaigns with personalized messages
- Upload lead lists from CSV/TXT files with validation and deduplication
- Schedule emails with configurable send times and delays
- Enforce Redis-backed hourly rate limits per sender
- Track delivery status (queued, sent, failed) in real time
- Search emails via Elasticsearch with automatic PostgreSQL fallback
- Monitor the BullMQ job queue through a live dashboard

---

## Features Implemented

### Backend

| Feature | Status | Details |
|---------|--------|---------|
| Express.js API with TypeScript | Done | RESTful routes for auth, campaigns, emails, dashboard, admin |
| PostgreSQL relational database | Done | Knex.js query builder with migrations |
| Database migrations | Done | 5 migrations: users, sessions, campaigns, email_messages, slack_connections |
| BullMQ delayed jobs | Done | One job per email recipient, stored in Redis |
| Stable idempotent job IDs | Done | Deterministic job IDs prevent duplicate sends on restart |
| Worker concurrency configuration | Done | Configurable via `WORKER_CONCURRENCY` env var |
| Minimum delay between emails | Done | Configurable via `MIN_SEND_DELAY_MS` (default: 2s) |
| Redis-backed hourly rate limiting | Done | Atomic counters with EXPIRE, per-sender tracking |
| Rate-limit job rescheduling | Done | Jobs automatically rescheduled when hourly limit hit |
| Restart persistence | Done | BullMQ jobs survive server restarts via Redis |
| Ethereal SMTP for test delivery | Done | Captures emails in Ethereal dashboard |
| Failed job tracking | Done | Failed jobs recorded with error details, retryable |
| Slack notifications | Done | OAuth flow + notifications on rate limit hits |
| Elasticsearch indexing/search | Done | Full-text search with user isolation, PG fallback |
| BullMQ visual dashboard | Done | bull-board mounted at `/admin/queues` with auth guard |
| Email search API | Done | `GET /api/emails?search=...` with ES or ILIKE fallback |
| Reindex command | Done | `npm run search:reindex` bulk-indexes from PostgreSQL |

### Frontend

| Feature | Status | Details |
|---------|--------|---------|
| Next.js 14 with App Router | Done | TypeScript, Tailwind CSS |
| Google OAuth login | Done | Redirect-based flow with session persistence |
| Logout | Done | Clears server session |
| Overview dashboard | Done | Campaign stats, recent activity, delivery metrics |
| Scheduled Emails tab | Done | List of queued emails with status and countdown |
| Sent Emails tab | Done | Delivered emails with provider message IDs |
| Compose campaign wizard | Done | 3-step flow: Message → Recipients → Schedule |
| Message step | Done | Subject, body, sender email configuration |
| CSV/TXT lead upload | Done | Drag-and-drop with file validation |
| Email validation | Done | RFC-compliant validation of each address |
| Duplicate removal | Done | Automatic deduplication of uploaded emails |
| Invalid email count | Done | Displayed during upload with details |
| Delivery settings | Done | Concurrency, delay, rate limit configuration |
| Search and filtering | Done | Debounced search (300ms) with status filters |
| Queue health | Done | Real-time queue metrics from BullMQ |
| Email detail view | Done | Full email content, status, and error details |
| Responsive design | Done | Apple-inspired UI, mobile-friendly |
| Loading/empty/error states | Done | Skeleton loaders, empty states, error toasts |

---

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** icons
- **date-fns** date formatting

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with Knex.js (query builder + migrations)
- **Redis** with IORedis
- **BullMQ** for delayed job queue
- **Elasticsearch 8.x** for full-text search
- **bull-board** for live queue dashboard
- **Passport.js** for Google OAuth
- **Nodemailer** with Ethereal SMTP
- **Zod** for request validation

### Infrastructure
- **Docker Compose** (PostgreSQL 16, Redis 7, Elasticsearch 8.12)
- Environment-based configuration
- Database migrations

---

## Architecture Overview

```
┌─────────────┐     Google OAuth      ┌──────────────┐
│   Frontend   │ ◄──────────────────► │    Backend    │
│  (Next.js)   │     REST API         │  (Express.js) │
│  Port 3000   │ ◄──────────────────► │  Port 3001    │
└─────────────┘                       └───────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐            ┌──────▼──────┐          ┌──────▼──────┐
              │ PostgreSQL │            │    Redis    │          │Elasticsearch│
              │  Port 5432 │            │  Port 6379  │          │  Port 9200  │
              └───────────┘            └──────┬──────┘          └─────────────┘
                                              │
                                      ┌───────▼───────┐
                                      │    BullMQ     │
                                      │  Job Queue    │
                                      └───────┬───────┘
                                              │
                                      ┌───────▼───────┐
                                      │  Email Worker  │
                                      │  (BullMQ)     │
                                      └───────┬───────┘
                                              │
                                      ┌───────▼───────┐
                                      │  Ethereal SMTP │
                                      │  (Test Email)  │
                                      └───────────────┘
```

### Request and Processing Flow

1. The user logs in with Google OAuth. The backend creates or updates a user record and establishes a session.
2. The user creates a campaign through the compose wizard, providing a subject, body, sender email, and schedule time.
3. The frontend uploads and parses the lead file (CSV/TXT). Emails are validated, deduplicated, and invalid addresses counted.
4. The backend stores the campaign and individual email messages in PostgreSQL, each with a status of `queued`.
5. Each email message gets a stable, idempotent BullMQ job ID based on the message ID.
6. BullMQ stores delayed jobs in Redis, scheduled for the specified send time.
7. The worker processes jobs at their scheduled time, checking the database status before sending.
8. The worker checks hourly rate limits and minimum delay between sends before dispatching.
9. If the rate limit is reached, the job is rescheduled with a delay.
10. Ethereal SMTP captures the test email and returns a provider message ID.
11. The database record is updated to `sent` (with provider message ID) or `failed` (with error details).
12. If Elasticsearch is configured, the email index is updated to reflect the new status.

---

## How to Run

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google OAuth credentials (Client ID + Client Secret from Google Cloud Console)
- Ethereal Email account (free at https://ethereal.email)

### 1. Clone the Repository

```powershell
git clone https://github.com/anandpatil5115-droid/ReachInbox.git
cd ReachInbox
```

### 2. Start Infrastructure

```powershell
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Elasticsearch on port 9200

### 3. Install Dependencies

```powershell
# Root
npm install

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 4. Configure Environment

Copy the example environment file and fill in your credentials:

```powershell
copy .env.example backend\.env
```

Edit `backend\.env` with your values:

```env
# Database (default works with docker-compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox

# Redis (default works with docker-compose)
REDIS_URL=redis://localhost:6379

# Session secret (change in production)
SESSION_SECRET=your-random-secret-here

# Google OAuth (required - get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Ethereal Email (for testing - get from ethereal.email)
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=your-ethereal-user
ETHEREAL_PASSWORD=your-ethereal-password
ETHEREAL_SECURE=false

# Slack (optional - for rate-limit notifications)
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3001/api/slack/callback

# Worker settings
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

# Elasticsearch (optional - falls back to PostgreSQL ILIKE search if not set)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=
ELASTICSEARCH_INDEX=reachinbox-emails

# Frontend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 5. Run Database Migrations

```powershell
cd backend
npm run db:migrate
cd ..
```

### 6. Start Development Servers

```powershell
# From root directory
npm run dev
```

Or start separately:

```powershell
# Backend (port 3001)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **BullMQ Dashboard**: http://localhost:3000/admin/queues (login required)

---

## Project Structure

```
reachinbox-scheduler/
├── backend/
│   ├── migrations/              # Database migrations (5 files)
│   ├── src/
│   │   ├── config/              # Environment, database, Redis config
│   │   ├── middleware/          # Authentication middleware
│   │   ├── routes/             # API routes (auth, campaigns, emails, slack, dashboard, admin)
│   │   ├── services/           # Business logic (email, queue, rate limiter, slack, elasticsearch)
│   │   ├── scripts/            # Reindex command
│   │   ├── utils/              # Email validation utilities
│   │   ├── workers/            # BullMQ email worker
│   │   └── __tests__/          # Jest tests
│   ├── knexfile.ts             # Knex configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Header, AppLayout
│   │   │   ├── pages/          # Page components (Overview, Scheduled, Sent, Campaigns, Settings)
│   │   │   └── ui/             # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # API client, types
│   ├── tailwind.config.ts
│   └── package.json
├── shared/                     # Shared TypeScript types
├── docker-compose.yml          # PostgreSQL + Redis + Elasticsearch
├── .env.example                # Environment variable template
├── .gitignore
├── package.json                # Root package.json (concurrently)
└── README.md
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns (with pagination, search) |
| POST | `/api/campaigns` | Create campaign (multipart/form-data with CSV/TXT) |
| GET | `/api/campaigns/:id` | Get campaign details |
| DELETE | `/api/campaigns/:id` | Delete campaign |

### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List emails (with filters, pagination, search) |
| GET | `/api/emails/:id` | Get email details |
| GET | `/api/emails/stats` | Get email statistics |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/dashboard/queue-health` | Get queue health metrics |

### Slack
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slack/status` | Check Slack connection |
| GET | `/api/slack/connect` | Initiate Slack OAuth |
| GET | `/api/slack/callback` | Slack OAuth callback |
| DELETE | `/api/slack/disconnect` | Disconnect Slack |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/queues` | Live BullMQ dashboard (requires auth) |
| GET | `/api/admin/health` | Elasticsearch health check |
| POST | `/api/admin/reindex` | Reindex all emails to Elasticsearch |

---

## Key Features Deep Dive

### Email Scheduling with BullMQ
- Each email message gets its own delayed job in the BullMQ queue
- Job IDs are deterministic (based on email message ID) for idempotency
- Jobs survive server restarts via Redis persistence
- Configurable worker concurrency, minimum delay, and hourly rate limits

### Rate Limiting
- Redis-backed atomic counters with EXPIRE for automatic reset
- Per-sender hourly tracking (configurable via `MAX_EMAILS_PER_HOUR`)
- When the limit is reached, the job is rescheduled with an appropriate delay
- Slack notification sent when rate limit is hit (if Slack is connected)

### Email Validation and Upload
- CSV/TXT file upload with drag-and-drop interface
- RFC-compliant email validation for each address
- Automatic deduplication of email addresses
- Invalid email count displayed during upload
- Error details returned on validation failure

### Elasticsearch Search
- Full-text search across recipient, subject, sender, and body fields
- Fuzzy matching for typo tolerance
- User isolation: searches restricted to the authenticated user's emails
- Automatic fallback to PostgreSQL ILIKE queries when Elasticsearch is unavailable
- Deterministic document IDs for idempotent indexing
- Index updated on campaign creation and email status changes
- Bulk reindex command: `npm run search:reindex`

### BullMQ Dashboard
- Live queue monitoring at `/admin/queues` (requires authentication)
- Shows waiting, delayed, active, completed, and failed jobs
- Job details, payloads, attempts, and error messages
- Retry and remove controls
- Accessible from Settings > Queue Monitor in the frontend

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/reachinbox` | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |
| `SESSION_SECRET` | Yes | - | Secret for session encryption |
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | `http://localhost:3001/api/auth/google/callback` | OAuth callback URL |
| `ETHEREAL_HOST` | Yes | `smtp.ethereal.email` | SMTP host |
| `ETHEREAL_PORT` | Yes | `587` | SMTP port |
| `ETHEREAL_USER` | Yes | - | SMTP username |
| `ETHEREAL_PASSWORD` | Yes | - | SMTP password |
| `ETHEREAL_SECURE` | No | `false` | Use TLS |
| `SLACK_CLIENT_ID` | No | - | Slack OAuth client ID |
| `SLACK_CLIENT_SECRET` | No | - | Slack OAuth client secret |
| `SLACK_REDIRECT_URI` | No | `http://localhost:3001/api/slack/callback` | Slack callback URL |
| `WORKER_CONCURRENCY` | No | `5` | Number of concurrent workers |
| `MIN_SEND_DELAY_MS` | No | `2000` | Minimum delay between sends (ms) |
| `MAX_EMAILS_PER_HOUR` | No | `200` | Hourly limit per sender |
| `ELASTICSEARCH_URL` | No | - | Elasticsearch URL (optional) |
| `ELASTICSEARCH_API_KEY` | No | - | Elasticsearch API key (optional) |
| `ELASTICSEARCH_INDEX` | No | `reachinbox-emails` | Elasticsearch index name |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001` | Backend API URL for frontend |

---

## Running Tests

```powershell
cd backend
npm test
```

Tests cover:
- Email validation utilities
- Environment configuration
- Elasticsearch client, indexing, search, and fallback
- Admin dashboard and queue routes

---

## License

MIT
