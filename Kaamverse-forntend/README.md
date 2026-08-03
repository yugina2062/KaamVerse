# Kaamverse frontend

Kaamverse is the frontend for an AI-enhanced, trust-first employment platform for Nepal. The current interface contains the public marketplace, authentication flows, and dedicated workspaces for job seekers, company employers, individual employers, and administrators.

The interface was created in Figma Make. Its visual markup and global styles are intentionally preserved while the source is organized by responsibility.

## Requirements

- Node.js 22.12 or newer
- pnpm 10.34.3 or newer

The pinned versions are recorded in `.mise.toml` and `package.json`.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Useful checks:

```bash
pnpm typecheck
pnpm build
pnpm check
```

## Source structure

```text
src/
|-- app/
|   `-- App.tsx
|-- assets/
|   `-- figma/
|-- features/
|   |-- auth/
|   |-- dashboards/
|   |   |-- admin/
|   |   |-- company-employer/
|   |   |-- individual-employer/
|   |   `-- job-seeker/
|   `-- marketing/
|-- styles/
|   `-- index.css
|-- main.tsx
`-- vite-env.d.ts
```

- `app` composes the public pages, authentication flow, and authenticated role workspaces.
- `features` owns role-specific behavior and UI.
- `assets/figma` retains source reference images that are not imported by the running application.
- `styles` contains the global Tailwind entrypoint and the existing design tokens.
- `docs/figma` contains the original Figma review notes outside the runtime source tree.

## Backend integration

The approved FYP architecture is implemented as React -> Django REST Framework -> XAMPP MySQL/MariaDB. The React application never connects to the database directly. Authentication, validation, authorization, file handling, recommendation logic, and database access belong in the sibling `Kaamverse-backend` project.

The project specification prioritizes:

- job seeker, employer, and administrator role-based access;
- employer document verification and administrator approval;
- part-time job CRUD, applications, saved jobs, and status notifications;
- schedule-, shift-, location-, and skills-based filtering;
- fraud reporting and moderation;
- English/Nepali UI support;
- content-based recommendations first, with collaborative filtering added after sufficient interaction data exists.

Set `VITE_API_BASE_URL` when the API is not running at its default `http://127.0.0.1:8000/api` address. Authentication, session restoration, live job recommendations, applications, saved jobs, employer job submission, and administrator job moderation are connected to the API. Remaining presentation-only prototype panels can be migrated incrementally through `src/lib/api` without changing the visual system.
