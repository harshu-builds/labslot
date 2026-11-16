# LabSlot

LabSlot is a responsive laboratory booking demo built with React, Vite, TypeScript/JSX, React Router DOM, and custom CSS. It includes a public landing page, student portal, administrator portal, and sample data persisted in the browser for demonstration purposes.

## Start the app

Install dependencies with `pnpm install`, then run `pnpm dev`. Create an optimized static bundle with `pnpm build`; preview the bundle locally with `pnpm start`.

## Demo access

Open **Get started**, choose a role, and sign in. The demo student is `harshita@university.edu`; the administrator is `admin@labslot.edu`. Any password is accepted. This is demo-only authentication and must not be used with real credentials or treated as secure access control.

## Demo data and limitations

Equipment, bookings, and booking statuses persist in the browser’s `localStorage` under `labslot-demo-v1`. The student and administrator portals share state in the same browser. This does not provide server storage, secure authentication, or synchronization between people or devices. Use the clean demo state by clearing that browser storage entry.

The assistant replies from a small local demo response set. API credentials must never be placed in frontend code; a future assistant integration should call a secured backend.

## Extending the demo

The shared state layer is isolated in `components/labslot/store.tsx`, with sample data in `components/labslot/data.ts`. These are natural boundaries for replacing local persistence with Firebase, Firestore, or an Express API. `.env.example` lists the optional backend URL variable; no environment variable is required for the demo.
