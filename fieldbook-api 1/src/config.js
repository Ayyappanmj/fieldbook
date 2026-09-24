/**
 * Runtime configuration, read once at startup from environment variables.
 * See .env.example for what each variable does and its default.
 */
import crypto from 'node:crypto';

const isProduction = process.env.NODE_ENV === 'production';

const jwtSecret = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
if (isProduction && jwtSecret === 'dev-only-insecure-secret-change-me') {
  // Fail loudly rather than silently signing production sessions with a
  // secret that ships in every clone of this repository.
  throw new Error('Set JWT_SECRET before running with NODE_ENV=production.');
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  dbMode: process.env.DB_MODE === 'postgres' ? 'postgres' : 'memory',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret,
  tokenTtlSeconds: Number(process.env.TOKEN_TTL_SECONDS) || 604800, // 7 days
  isProduction,
};

/** A short random id, used for request tracing in logs. */
export const requestId = () => crypto.randomBytes(6).toString('hex');
