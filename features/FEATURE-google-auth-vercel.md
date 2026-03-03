# Feature: Google Authentication via Vercel (with Email Allow-List)

## Overview
Add Google OAuth authentication using Google Identity Services (GIS) so that only approved users can access the app. Unauthenticated or unauthorized users see a sign-in page. Deploy the full stack to Vercel under the `jdbaker01-9217's projects` scope.

## Architecture

### Why GIS (not Auth.js/NextAuth)?
This app is a Vite React SPA + FastAPI backend — not Next.js. GIS is Google's framework-agnostic client-side SDK that returns a signed JWT ID token directly to the frontend. The backend verifies it cryptographically using Google's public keys. No Client Secret, no session store, no OAuth callback endpoints needed.

### Email Allow-List
After verifying the Google token, the backend checks the user's email against an `ALLOWED_EMAILS` environment variable (comma-separated). Users not on the list get `403 Forbidden`. Add/remove users by updating the env var — no code changes needed.

## Auth Flow
1. User visits the app → sees Google Sign-In button
2. User signs in with Google → GIS returns a JWT ID token to the frontend
3. Frontend stores the token and sends it as `Authorization: Bearer <token>` on API requests
4. Backend verifies the token with `google-auth` library, checks email against allow-list
5. Valid + allowed → returns data; invalid → 401; not allowed → 403
6. Token expires (~1 hour) → backend returns 401 → frontend prompts re-authentication

## Environment Variables
| Variable | Where | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Backend (Vercel + local) | Token audience verification |
| `VITE_GOOGLE_CLIENT_ID` | Frontend (Vercel + local) | GIS SDK initialization |
| `ALLOWED_EMAILS` | Backend (Vercel + local) | Comma-separated authorized emails |
| `FRONTEND_URL` | Backend (Vercel only) | Production CORS origin |

## Backend Changes
- New `backend/auth.py`: `verify_google_token` FastAPI dependency — verifies token, checks allow-list
- `backend/main.py`: Add `Depends(verify_google_token)` to `/api/volatility/{ticker}`; `/api/health` stays public
- `backend/requirements.txt`: Add `google-auth==2.27.0`
- `backend/cache.py`: Use `/tmp` for SQLite in Vercel serverless (ephemeral filesystem)

## Frontend Changes
- New `frontend/src/auth/AuthContext.jsx`: React Context for auth state, GIS initialization, token persistence
- New `frontend/src/components/SignInPage.jsx`: Google Sign-In button with dark theme
- `frontend/src/App.jsx`: Conditional rendering (sign-in vs. app), token in fetch headers, 401/403 handling, user info in header
- `frontend/src/index.jsx`: Wrap App with AuthProvider
- `frontend/index.html`: Load GIS script

## Vercel Deployment
- `vercel.json`: Routes `/api/*` to serverless function, serves frontend static build otherwise
- `api/index.py`: Entry point importing FastAPI app
- `api/requirements.txt`: Production dependencies
- Deploy under `jdbaker01-9217's projects` scope

## Acceptance Criteria
- [ ] Google Sign-In page shown to unauthenticated users
- [ ] Only emails in `ALLOWED_EMAILS` can access the app
- [ ] Unauthorized emails get 403 with "Access denied" message
- [ ] Authenticated users see their email and sign-out button in the header
- [ ] `/api/health` remains publicly accessible
- [ ] `/api/volatility/*` returns 401 without token, 403 for unauthorized emails
- [ ] Token expiry handled gracefully (re-prompts sign-in)
- [ ] Deploys to Vercel with all env vars configured
- [ ] 100% test coverage maintained
