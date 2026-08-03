# KaamVerse full-stack FYP

KaamVerse is an AI-enhanced, trust-first employment platform for Nepal. This workspace contains the React frontend and the Django REST backend connected to the local XAMPP database.

## Architecture

```text
React + TypeScript frontend
        |
        | REST/JSON + JWT
        v
Django REST Framework API
        |
        | Django ORM
        v
XAMPP MariaDB/MySQL (kaamverse_db)
```

The browser never connects directly to MySQL. Django owns authentication, authorization, validation, business rules, recommendations, file uploads, and persistence.

## Projects

- `Kaamverse-forntend/` - React, Vite, TypeScript, and Tailwind frontend.
- `Kaamverse-backend/` - Django REST API, migrations, tests, and seed command.
- The `.docx` files in this directory are the FYP requirements and investigation sources.

## Run locally

1. Start MySQL from the XAMPP Control Panel.
2. From PowerShell in this directory, launch both applications:

   ```powershell
   .\start-dev.ps1
   ```

   Press `Ctrl+C` to stop both servers.

The launcher safely reuses a compatible server if port `8000` or `8443` is already running. It rejects an outdated backend instead of silently connecting the new frontend to missing API routes. Startup diagnostics are written to `.dev-logs/`; processes that were already running are never stopped by the launcher.

Alternatively, start each service separately. Start the backend:

   ```powershell
   cd "Kaamverse-backend"
   .\.venv\Scripts\Activate.ps1
   python manage.py migrate
   python manage.py runserver 127.0.0.1:8000
   ```

In a second terminal, start the frontend:

   ```powershell
   cd "Kaamverse-forntend"
   npx --yes node@22.12.0 node_modules/vite/bin/vite.js --host 0.0.0.0
   ```

Then open `http://localhost:8443`.

The frontend API URL defaults to `http://127.0.0.1:8000/api`. Override it through `Kaamverse-forntend/.env` using `VITE_API_BASE_URL` when needed.

Local demo accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@kaamverse.local` | `Admin@12345` |
| Company employer | `employer@kaamverse.local` | `Employer@12345` |
| Individual employer | `individual@kaamverse.local` | `Individual@12345` |
| Job seeker | `seeker@kaamverse.local` | `Seeker@12345` |

These credentials are for local development only.

## Implemented workflows

- Persistent job seeker and employer registration.
- Email or phone identifier login using JWT tokens and automatic refresh.
- Restored login sessions after browser reload.
- Verified-employer job submission and administrator approval.
- Public approved job listings and schedule/location/type filters.
- Content-based recommendations using skills, location, job type, and availability.
- Job applications, application status updates, and notifications.
- Saved jobs and interaction tracking.
- Email and phone verification, plus verification document submission and administrator review.
- Fraud reporting and administrator resolution.
- Role-specific dashboard summaries and administrator user controls.
- Six-digit email verification and password-reset codes delivered through SMTP, with expiry, resend throttling, hashing, and attempt limits.
- Bottom-right success, error, warning, and information banners for API activity.
- Persistent in-app notifications plus preference-aware email delivery for applications, job moderation, matching jobs, bookings, messages, safety warnings, and account suspension.
- Administrator broadcasts by audience, with separate consent handling for advertisements.
- Real conversations and messages, employer talent search, seeker service listings, and service bookings.
- Exact user-entered availability and employer wanted-time schedules, including public and dashboard time filtering.
- English/Nepali preference persistence across public pages and all role workspaces.
- Persistent profile photos, date of birth, resumes, verification documents, mutation audit logs, and secondary account actions.

## Email configuration

Copy `Kaamverse-backend/.env.example` to `.env` and configure a Google Workspace or Gmail app password. Never commit `.env` or place the mailbox password in frontend code. The configured mailbox sends verification codes and important transactional notices; advertisements are sent only to users who enabled marketing email.

## Verification commands

```powershell
cd "Kaamverse-backend"
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py test accounts marketplace

cd ..\Kaamverse-forntend
npx --yes node@22.12.0 node_modules/typescript/bin/tsc --noEmit
npx --yes node@22.12.0 node_modules/vite/bin/vite.js build

cd ..
.\smoke-test.ps1
```

The smoke test authenticates all four demo roles and verifies their authorized API routes over real HTTP against the configured MySQL database.

## Production checklist

- Set `DJANGO_DEBUG=false`, a new long random `DJANGO_SECRET_KEY`, production host names, HTTPS CORS origins, and a least-privilege MySQL user.
- Set `SECURE_SSL_REDIRECT=true`; serve the built frontend and Django through an HTTPS reverse proxy; run Django using a production WSGI/ASGI server rather than `runserver`.
- Run `manage.py migrate --noinput` and `manage.py collectstatic --noinput` during deployment.
- Store `.env` values in the deployment platform's secret manager, rotate SMTP credentials, back up MySQL and uploaded media, and configure log retention/monitoring.
- Replace all local demo passwords before exposing the service publicly.
