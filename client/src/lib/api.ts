// Backend base URL for the API + Socket.IO connection.
// Empty string = same origin (the normal case, where the Express server also serves this client).
// Set VITE_API_URL at build time to point a separately-hosted frontend (e.g. on Vercel) at the
// game server running elsewhere. Example: VITE_API_URL=https://my-server.onrender.com
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
