# Academy Frontend - Project Context

## Overview
This is the frontend for **Propel Nonprofit Academy**, a learning management system (LMS) for nonprofits. The site is being rebuilt from a WordPress/Elementor site to a React + Django stack.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **Styling**: CSS (no framework, custom styles)
- **Backend API**: Django REST Framework at `https://api.academy.wepropel.org/api/`
- **Deployment**: Vercel (frontend), Custom server (backend)

## Repository URLs
- Frontend: `https://github.com/Data-Propel/academy-front.git`
- Backend: `https://github.com/Data-Propel/academy-back.git`
- Live site: `https://academy-front-flax.vercel.app/`

## Design System

### Colors
```css
/* Primary */
--teal-dark: #043A37;
--teal-gradient-end: #032220;
--teal-topbar: #116D66;

/* Accent */
--orange: #FD6A44;
--orange-hover: #e55a36;
--yellow: #f8b81f;

/* Neutrals */
--white: #F2F2F2;
--gray-border: #656565;
--transparent-white: rgba(255, 255, 255, 0.1);
```

### Fonts
- **Headings**: 'Libre Franklin', sans-serif
- **Body**: 'Poppins', sans-serif

### Background Pattern
Most pages use a gradient background:
```css
background: linear-gradient(135deg, #043A37 28%, #032220 95%);
```

## Project Structure
```
src/
├── components/
│   ├── Topbar/          # Navigation header with logo and login/logout
│   └── Footer/          # Site footer with links and social
├── pages/
│   ├── Login/           # Multi-step login (email → password/setup)
│   ├── Register/        # User registration
│   ├── ResetPassword/   # Password reset request
│   ├── Dashboard/       # Main page after login (shows courses)
│   └── NotFound/        # 404 page
├── services/
│   └── api.ts           # API client with JWT handling
└── App.tsx              # Routes configuration
```

## Authentication Flow

### Login (Multi-step for migrated users)
1. **Step 1**: User enters email
2. **API Call**: `POST /api/users/check-account/` with `{ email }`
3. **Response handling**:
   - If `requires_password_setup: true` → Show password setup form (migrated user)
   - If `requires_password_setup: false` → Show password input form
4. **Step 2a (Setup)**: `POST /api/users/set-initial-password/` → Auto-login with returned tokens
5. **Step 2b (Login)**: `POST /api/users/login/` → Store JWT tokens

### Token Management
- Tokens stored in `localStorage` (`access_token`, `refresh_token`)
- Auto-refresh on 401 response
- `isAuthenticated()` checks if token exists

## API Endpoints

### Users (`/api/users/`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/check-account/` | POST | No | Check if email exists, returns setup token if migrated |
| `/set-initial-password/` | POST | No | Set password for migrated users (returns JWT) |
| `/login/` | POST | No | Login with email/password (returns JWT) |
| `/register/` | POST | No | Create new account |
| `/password-reset/` | POST | No | Request password reset email |
| `/profile/` | GET/PUT | Yes | Get/update user profile |
| `/token/refresh/` | POST | No | Refresh access token |

### Courses (`/api/courses/`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | No | List courses (supports filters) |
| `/categories/` | GET | No | List categories |
| `/<slug>/` | GET | No | Course details |
| `/<slug>/enroll/` | POST | Yes | Enroll in course |
| `/<slug>/favorite/` | POST | Yes | Toggle favorite |
| `/my/enrollments/` | GET | Yes | User's enrollments |
| `/my/favorites/` | GET | Yes | User's favorites |

## Pages Status

### Completed ✅
- [x] Login (multi-step with migrated user support)
- [x] Register
- [x] Reset Password
- [x] Dashboard (courses grid)
- [x] 404 Page ("¡Ups!" friendly message)
- [x] Topbar (logo + login/logout button)
- [x] Footer (logo, nav columns, social links)

### Pending 📋
- [ ] Home page for non-logged users (template 5215)
- [ ] Single course page
- [ ] Course enrollment flow
- [ ] User profile page
- [ ] Favorites list
- [ ] My enrollments/progress
- [ ] Search functionality
- [ ] Category filtering

## Elementor Templates Reference
Located in `ElementorSite/templates/`. Key templates:
- `994.json` - Login page design
- `5215.json` - Home (non-registered users)
- `4973.json` - Dashboard (registered users)
- `7280.json` - 404 page
- `851.json` - Single course
- `947.json` - Course archive

## Git Configuration
- Author: Data Propel (`data@wepropel.org`)
- Commit format: `Description @CarlosFeijoo`

## Important Notes
1. All text is in **Spanish**
2. Forms have dark transparent backgrounds with light text
3. Buttons are solid orange (#FD6A44), not gradients
4. The Topbar logo links to: `https://www.academy.wepropel.org/wp-content/uploads/2025/04/Logotipo_Propel_Horizontal-02-removebg-preview-e1745455801946.png`
5. Vercel needs `vercel.json` with rewrites for SPA routing
6. Backend has migrated users from WordPress that need password setup on first login
