# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Academy Frontend

## Project Overview

Propel Nonprofit Academy LMS frontend. Rebuilt from WordPress/Elementor to React + Django.

- **Frontend**: React 19 + TypeScript + Vite (this repo)
- **Backend**: Django 4.2 + DRF with JWT auth (`/home/ec2-user/academy-back`)
- **Live frontend**: `https://academyv2.wepropel.org`
- **Live API**: `https://api.academy.wepropel.org/api/`
- **GitHub**: `https://github.com/Data-Propel/academy-front.git`

## Architecture

### Infrastructure (EC2 instance)

- **Nginx** serves frontend statically from `dist/` and reverse-proxies API
- **Gunicorn** runs Django via systemd service `academy-api.service`
- **PostgreSQL** database
- **SSL**: Let's Encrypt certificates
- Frontend domain: `academyv2.wepropel.org`
- API domain: `api.academy.wepropel.org`

### Frontend Structure

```
src/
  components/
    Topbar/          # Nav header (logo, admin link, login/logout)
    Footer/          # Site footer
  pages/
    Admin/           # Admin panel (superusers only) - CRUD for all entities
    AutoLogin/       # Token-based auto-login
    CourseDetail/    # Single course page (enrollment, syllabus, materials)
    CourseLearner/   # Course viewer (video, content, sidebar nav, progress tracking)
    CourseEvaluation/ # Post-course evaluation form submission
    Dashboard/       # Main page - courses grid with filters
    FormPage/        # Dynamic form renderer (uses FormRenderer component)
    Login/           # Multi-step login (email -> password/setup for migrated users)
    Profile/         # User profile management
    Register/        # User registration
    ResetPassword/   # Password reset flow
    NotFound/        # 404 page
  services/
    api.ts           # API client with JWT token management and auto-refresh
  App.tsx            # Routes configuration
```

### Backend Structure (`/home/ec2-user/academy-back`)

```
apps/
  courses/           # Course, Lesson, Topic, Quiz, Enrollment, LessonProgress, Favorite, LessonResource models
  users/             # Custom user model with WordPress migration support
config/
  settings.py        # Django settings (PostgreSQL, S3, JWT config)
```

## Key Commands

```bash
# Build frontend (output to dist/, served by nginx)
npm run build

# Dev server
npm run dev

# Restart backend
sudo systemctl restart academy-api

# Django shell (backend)
cd /home/ec2-user/academy-back && source venv/bin/activate && python manage.py shell

# Check nginx config
sudo nginx -t && sudo systemctl reload nginx
```

## Deployment

Frontend deploys by running `npm run build` - nginx serves `dist/` directly. No restart needed.
Backend deploys by restarting `sudo systemctl restart academy-api`.

## Design System

- **Colors**: Teal dark `#0E4B43`, Orange accent `#FF5A2F`, Green progress `#A3C94A`, Background `#F5F5F3`
- **Fonts**: 'Libre Franklin' (headings), 'Poppins' (body)
- **Sidebar**: Dark teal `#0E4B43`, 380px wide on desktop
- **All UI text is in Spanish**

## Data Model (key relationships)

- Course -> Lessons (ordered by `order_index`) -> Topics (ordered by `order_index`)
- Lesson -> Quizzes, LessonResource (files or external URLs)
- Course has `materials_html` field (HTML with `<a>` tags from LearnDash WordPress export)
- Enrollment tracks user progress per course
- LessonProgress / TopicProgress track completion per item

## Important Patterns

- `order_index` field controls display ordering for lessons, topics, quizzes
- WordPress upload URLs are rewritten via `localizeUrl()` to `/pdfs/` local path
- Google Drive/Docs/Calendar links are extracted from lesson content HTML and shown as resource cards
- Course-level materials (`materials_html`) are parsed from HTML `<a>` tags via `parseMaterialsHtml()`
- Video embeds support Vimeo and YouTube (via iframe) and S3 pre-signed URLs (via `<video>`)
- PDF resources use embedded PDF.js viewer at `/pdfjs/web/viewer.html`
- JWT tokens stored in localStorage, auto-refreshed on 401

## Auth Flow

1. Multi-step login: email check -> password or first-time password setup (migrated WordPress users)
2. Tokens: `access_token` and `refresh_token` in localStorage
3. Superuser flag in localStorage controls admin panel access
4. `isAuthenticated()` and `isSuperuser()` helpers in `api.ts`

## TypeScript & Linting

- `verbatimModuleSyntax` is enabled — use `import { type X }` for type-only imports
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — the build fails on type errors
- Build: `tsc -b && vite build`
- Lint: `npm run lint` (ESLint v9 flat config, TypeScript + React hooks rules)
- No test framework configured

## Git

- Author: Data Propel (`data@wepropel.org`)
- Commit format: descriptive message, no specific prefix convention
