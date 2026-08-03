# KaamVerse API

Django REST Framework backend for KaamVerse. It provides JWT authentication, role-based authorization, XAMPP MySQL/MariaDB persistence, job and application workflows, employer verification, fraud moderation, notifications, and content-based recommendations.

## Local stack

- Python 3.12
- Django 4.2 LTS
- Django REST Framework
- JWT access and refresh tokens
- XAMPP MariaDB 10.4 using Django's MySQL backend
- Database: `kaamverse_db`, character set `utf8mb4`

Django 4.2 is used deliberately because XAMPP currently ships MariaDB 10.4. The schema remains compatible with MySQL 8.0.

## Start the API

Ensure MySQL is running in the XAMPP Control Panel, then run:

```powershell
cd "C:\Users\Lenovo\Documents\Downloads\FYP Final\Kaamverse-backend"
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

Health check: `http://127.0.0.1:8000/api/health/`

Django administration: `http://127.0.0.1:8000/admin/`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@kaamverse.local` | `Admin@12345` |
| Company employer | `employer@kaamverse.local` | `Employer@12345` |
| Individual employer | `individual@kaamverse.local` | `Individual@12345` |
| Job seeker | `seeker@kaamverse.local` | `Seeker@12345` |

These accounts are strictly for local development. Replace all credentials and the Django secret before deployment.

## Main API routes

| Area | Routes |
|---|---|
| Authentication | `POST /api/auth/register/`, `POST /api/auth/token/`, `POST /api/auth/token/refresh/` |
| Email/phone verification | `/api/auth/verification/email/*`, `/api/auth/verification/phone/*` |
| Current user | `GET/PATCH /api/auth/me/` |
| Administration | `/api/auth/users/`, `/api/auth/verifications/` |
| Jobs | `/api/jobs/`, `/api/jobs/mine/`, `/api/jobs/moderation_queue/` |
| Recommendations | `GET /api/recommendations/` |
| Applications | `/api/applications/` |
| Saved jobs | `/api/saved-jobs/`, `POST /api/saved-jobs/toggle/` |
| Fraud reports | `/api/fraud-reports/` |
| Notifications | `/api/notifications/` |
| Role dashboard | `GET /api/dashboard/` |

In local debug mode the API returns the email verification token and phone OTP to the frontend so the complete flow can be demonstrated without paid providers. Production mode never includes those values in API responses. Verification uploads accept JPG, PNG, and PDF files up to 8 MB.

## Test and validate

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test accounts marketplace -v 2
```

Tests use an isolated `test_kaamverse_db` database and do not modify development data.

## Production checklist

- Set `DJANGO_DEBUG=false` and use a strong secret from the deployment environment.
- Replace the local database password and restrict database access to the application host.
- Serve Django behind HTTPS with a production WSGI/ASGI server.
- Move user documents to private object storage with signed access URLs.
- Configure real email/SMS providers for verification and password recovery.
- Add scheduled backups, centralized logs, monitoring, and rate limiting at the reverse proxy.
