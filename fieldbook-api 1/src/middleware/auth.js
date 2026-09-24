/**
 * Verifies the Authorization: Bearer <token> header on protected routes.
 * On success, attaches req.user (the public user shape) and req.sessionId.
 * On failure, throws ApiError(401) — the router's error handler converts
 * that into the actual HTTP response, matching what the front end's API
 * client already expects on a 401 (see js/api/client.js: onUnauthorized).
 */
import { verify } from '../lib/token.js';
import { config } from '../config.js';
import { unauthorized } from '../errors/ApiError.js';

export function requireAuth(repo) {
  return async function authMiddleware(req) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    let payload;
    try {
      payload = verify(token, config.jwtSecret);
    } catch {
      throw unauthorized();
    }

    const session = await repo.findActiveSession(payload.sid);
    if (!session || session.userId !== payload.sub) throw unauthorized();

    const user = await repo.findUserById(payload.sub);
    if (!user) throw unauthorized();

    req.user = user;
    req.sessionId = payload.sid;
  };
}
