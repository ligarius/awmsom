# Sprint FE7 Validation

- All authentication endpoints (`/auth/login`, `/auth/me`) align with frontend expectations: JWT cookie is set via the frontend API route and the backend returns `accessToken`, optional `refreshToken`, and `user` payload.
- `/auth/me` endpoint exists and is guarded by `AuthUserGuard`, which validates bearer tokens and returns sanitized user data with roles and permissions.
- Frontend middleware (`frontend/middleware.ts`) validates the session via the `/api/auth/me` proxy using HttpOnly cookies; protected routes and role/permission checks work without relying on `localStorage`.
- Hook `useAuth` initializes the user from `/api/auth/me`, performs login/logout through API routes, and avoids persisting tokens on the client.
- Backend enforces strong JWT secret configuration by failing startup when `JWT_SECRET` is missing or too short.

## Tests

- `npm test -- --runInBand` (passes all suites).
