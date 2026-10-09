import "server-only";
// Read at runtime; Vercel supplies production values and Next loads .env.local locally.
export const env = process.env;
