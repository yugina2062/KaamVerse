# Kaamverse frontend

React + Vite + Tailwind CSS frontend originally generated in Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports global styles and mounts the application
- `src/app/App.tsx` - Application composition, authentication state, and role switching
- `src/features/auth/AuthFlow.tsx` - Authentication and registration flows
- `src/features/dashboards/` - Role-specific dashboard features
- `src/features/marketing/MarketingExperience.tsx` - Public navigation and marketplace pages
- `src/styles/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `src/assets/figma/` - Retained Figma reference assets that are not currently imported at runtime
- `docs/figma/` - Figma review and workspace notes
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/styles/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/styles/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/styles/index.css`, so global font wiring belongs there. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## FYP architecture

- Frontend: React, TypeScript, Tailwind CSS
- Planned API: Django REST Framework
- Planned database: MySQL 8.0 (the local instance is provided through XAMPP)
- Do not connect the browser directly to MySQL. All persistent data must flow through the Django REST API.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
