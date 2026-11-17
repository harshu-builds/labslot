# LabSlot

LabSlot is a responsive laboratory booking application built with React, Vite, TypeScript, React Router DOM, Express, Firebase Authentication, and Cloud Firestore.

## Repository layout

- `frontend/` — React/Vite application.
- `backend/` — Express API and Firebase Admin SDK.
- Equipment inventory and the administrator student directory use Firestore when `VITE_API_BASE_URL` is configured.
- Booking requests and booking history are still demo/local state; they are not part of the equipment/student API integration.

## Local development

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Provide Firebase Admin credentials using either:
- `config/serviceAccountKey.json` (local only; this path is ignored by Git), or
- `FIREBASE_SERVICE_ACCOUNT_JSON` in the backend environment.

Set `FRONTEND_URL=http://localhost:3000` in `backend/.env`, then run:

```bash
npm run dev
```

The health endpoint is `GET http://localhost:5000/api/health`.

### Frontend

Create `frontend/.env` using `.env.example` and fill in the Firebase web app configuration. Set:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Then run:

```bash
cd frontend
pnpm install
pnpm dev
```

## Administrator account

The backend includes `backend/scripts/createAdmin.js`. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` in the backend environment, then run:

```bash
node scripts/createAdmin.js
```

Do not commit service-account credentials or real passwords.

## Person 2 API

All endpoints below require a Firebase ID token in the `Authorization: Bearer <token>` header.

### Equipment

- `GET /api/equipment` — authenticated catalogue.
- `GET /api/equipment/:id` — equipment details.
- `POST /api/equipment` — admin-only create.
- `PUT /api/equipment/:id` — admin-only update.
- `PATCH /api/equipment/:id/status` — admin-only availability update.
- `DELETE /api/equipment/:id` — admin-only delete.

Equipment documents are stored in the Firestore `equipment` collection. Status values: `available`, `limited`, `unavailable`, `maintenance`.

### Students

- `GET /api/students/me` and `PUT /api/students/me` — a student can read/update their own profile.
- `GET /api/students`, `GET /api/students/:id`, `PUT /api/students/:id` — admin-only student directory operations.

Student profiles reuse the existing Firestore `users` collection created by registration. No duplicate students collection is used.

## Deployment

### Render backend

Create a Web Service with root directory `backend`, build command `npm install`, and start command `npm start`. Configure:
- `FRONTEND_URL` — the exact deployed frontend origin (for example, your Vercel URL).
- `FIREBASE_SERVICE_ACCOUNT_JSON` — the complete Firebase Admin service-account JSON as a secret environment variable.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` for the one-time admin setup script.

Run the admin setup script once from a trusted environment after the backend credentials are configured.

### Vercel frontend

Set the Vercel project root directory to `frontend`. Configure:
- `VITE_API_BASE_URL` — the deployed Render backend base URL, without a trailing slash.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Redeploy the frontend after changing Vite environment variables. These `VITE_*` values are public client configuration; never put Firebase Admin credentials in the frontend.

## Important scope note

The equipment catalogue and admin student directory switch to live API data when `VITE_API_BASE_URL` is configured. Without it, the app retains its local demo data. Booking workflows are still local demo state and need their own backend integration before the complete booking lifecycle is multi-user and production-ready.
