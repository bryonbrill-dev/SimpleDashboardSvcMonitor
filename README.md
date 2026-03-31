# Windows Service Monitor (MVP)

Windows Service Monitor is a production-structured MVP with two deployable Node.js + TypeScript components:

1. **Windows Agent Service** (`agent/`): runs on monitored Windows machines and exposes service-health APIs.
2. **Central Dashboard Service** (`dashboard/`): runs centrally, hosts admin UI, stores history, and polls agents.

## Proposed Solution Structure

```text
windows-service-monitor/
├─ agent/
│  ├─ src/
│  │  ├─ config/ env.ts
│  │  ├─ middleware/ auth.ts
│  │  ├─ routes/ api.ts
│  │  ├─ services/ windowsServiceReader.ts
│  │  ├─ types/ service.ts
│  │  └─ index.ts
│  ├─ scripts/
│  │  ├─ install-service.js/.ps1
│  │  └─ uninstall-service.js/.ps1
│  └─ .env.example
├─ dashboard/
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  ├─ migrations/20260331000000_init/migration.sql
│  │  └─ seed.ts
│  ├─ src/
│  │  ├─ config/ env.ts, prisma.ts
│  │  ├─ middleware/ authMiddleware.ts
│  │  ├─ routes/ web.ts
│  │  ├─ services/ authService.ts, pollingService.ts
│  │  ├─ workers/ pollWorker.ts
│  │  ├─ views/ (EJS pages + partials)
│  │  ├─ public/ (AdminLTE-inspired styling)
│  │  └─ index.ts
│  ├─ scripts/
│  │  ├─ install-service.js/.ps1
│  │  └─ uninstall-service.js/.ps1
│  └─ .env.example
└─ README.md
```

## Features

- Agent endpoints:
  - `GET /api/health`
  - `GET /api/services`
  - `GET /api/services/:serviceName`
  - `POST /api/checkin`
- Agent queries Windows services using **PowerShell + JSON conversion**.
- API key protection for agent endpoints.
- Dashboard pages:
  - Login
  - Dashboard Home (KPIs + event feed)
  - Machines
  - Monitored Services
  - Monitoring History (with filters)
  - Admin Settings
- Background polling worker on configurable interval.
- Lifecycle-aware monitored services (`monitoringStartDate`, `monitoringEndDate`, soft removal).
- Service status history + transition events.
- CSV export for monitoring history.

## Technology

- Node.js + TypeScript
- Express + EJS
- SQLite + Prisma ORM
- bcryptjs for hashed local passwords
- express-session with sqlite-backed session store

## Local Development

### 1) Install dependencies

From repository root:

```bash
npm install
```

### 2) Configure env files (Windows-native)

Use the included PowerShell script (default extraction path: `C:\SimpleDashboardSvcMonitor-main`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts-configure-env.ps1
```

If you extracted to a different folder, pass `-RootPath`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts-configure-env.ps1 -RootPath "D:\Apps\SimpleDashboardSvcMonitor-main"
```

Or run equivalent Command Prompt copy commands manually:

```cmd
copy agent\.env.example agent\.env
copy dashboard\.env.example dashboard\.env
```

### 3) Database setup (Dashboard)

```bash
npm run prisma:generate -w dashboard
npm run prisma:migrate -w dashboard
npm run prisma:seed -w dashboard
```

### 4) Run services in dev mode

```bash
npm run dev -w agent
npm run dev -w dashboard
```

- Agent default URL: `http://localhost:4100`
- Dashboard default URL: `http://localhost:4200`

## Production Build

```bash
npm run build
npm run start -w agent
npm run start -w dashboard
```

## Authentication

- Local username/password login only (MVP)
- Passwords stored as bcrypt hashes
- Session timeout intentionally long/no forced expiration for MVP
- TODO in code for SSO/RBAC/MFA integration points

### Default Login Credentials

Configured via `dashboard/.env`:
- Username: `DEFAULT_ADMIN_USERNAME` (default `admin`)
- Password: `DEFAULT_ADMIN_PASSWORD` (default `Admin@123`)

## Config Options

### Agent (`agent/.env`)
- `AGENT_PORT`
- `AGENT_API_KEY`
- `AGENT_VERSION`
- `ALLOWED_ORIGINS`
- `ALLOWED_IPS`
- `CHECKIN_INTERVAL_SECONDS`
- `DASHBOARD_URL`
- `MACHINE_NAME`

### Dashboard (`dashboard/.env`)
- `DASHBOARD_PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `DEFAULT_ADMIN_USERNAME`
- `DEFAULT_ADMIN_PASSWORD`
- `POLL_INTERVAL_SECONDS`
- `APP_BASE_URL`

## Windows Service Installation

> Build each component before service install so `dist/` exists.

### Agent Service

```powershell
cd agent
npm ci
npm run build
.\scripts\install-service.ps1
```

Uninstall:

```powershell
.\scripts\uninstall-service.ps1
```

### Dashboard Service

```powershell
cd dashboard
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run build
.\scripts\install-service.ps1
```

Uninstall:

```powershell
.\scripts\uninstall-service.ps1
```

## Notes and TODOs

- TODO: Replace local session auth with enterprise SSO providers (LDAP/AD/Entra ID).
- TODO: Add RBAC and audit policy enhancements.
- TODO: Add retry/backoff + concurrent worker queue for large fleets.
- TODO: Add HTTPS termination and rate limiting for hardened deployment.
- TODO: Replace SQLite with PostgreSQL/SQL Server by changing Prisma datasource.
