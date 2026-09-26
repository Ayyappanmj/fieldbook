/**
 * POST /auth/login, POST /auth/register, POST /auth/logout.
 *
 * The front end's current UI only ever calls /auth/login and /auth/logout
 * (see the front-end project's js/api/httpAdapter.js) — /auth/register is
 * included because a real multi-user backend needs a genuine way to create
 * accounts; the mock API's front-end-only demo let *any* email/password
 * "sign in" as a new account, which is deliberately not how this real
 * server behaves (see README.md, "Differences from the front-end mock").
 */
import { sign } from '../lib/token.js';
import { verifyPassword } from '../lib/password.js';
import { config } from '../config.js';
import { ApiError, validationFailed } from '../errors/ApiError.js';
import { validateLogin, validateRegister, isValid } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';

// A simple in-memory rate limiter on login attempts per IP. In production
// this counter would live in Redis (see the architecture plan, Section 4.3)
// so it works across multiple server instances; the interface — check(ip),
// which throws when the limit is hit — would stay identical.
function createLoginLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map(); // ip -> [timestamps]
  return function check(ip) {
    const now = Date.now();
    const recent = (attempts.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) throw new ApiError('Too many sign-in attempts. Try again in a few minutes.', 429);
    recent.push(now);
    attempts.set(ip, recent);
  };
}

export function registerAuthRoutes(router, repo) {
  const checkLoginRate = createLoginLimiter();

  router.post('/auth/login', async (req, res) => {
    checkLoginRate(req.socket.remoteAddress || 'unknown');

    const errors = validateLogin(req.body || {});
    if (!isValid(errors)) throw validationFailed(errors);

    const { email, password } = req.body;
    const user = await repo.findUserByEmailInternal(email.trim());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new ApiError("That email and password don't match. Check them and try again.", 401);
    }

    const sessionId = await repo.createSession(user.id);
    const token = sign({ sub: user.id, sid: sessionId }, config.jwtSecret, config.tokenTtlSeconds);
    res.json(200, { token, user: { id: user.id, email: user.email, name: user.name } });
  });

  router.post('/auth/register', async (req, res) => {
    const errors = validateRegister(req.body || {});
    if (!isValid(errors)) throw validationFailed(errors);

    const { email, password, name } = req.body;
    const existing = await repo.findUserByEmailInternal(email.trim());
    if (existing) throw validationFailed({ email: 'An account with this email already exists.' });

    const user = await repo.createUser({ email: email.trim(), password, name: name.trim() });
    const sessionId = await repo.createSession(user.id);
    const token = sign({ sub: user.id, sid: sessionId }, config.jwtSecret, config.tokenTtlSeconds);
    res.json(201, { token, user });
  });

  router.post('/auth/logout', requireAuth(repo), async (req, res) => {
    await repo.revokeSession(req.sessionId);
    res.noContent();
  });
}
