/** GET /me, PATCH /me. */
import { validationFailed } from '../errors/ApiError.js';
import { requireAuth } from '../middleware/auth.js';

export function registerMeRoutes(router, repo) {
  router.get('/me', requireAuth(repo), async (req, res) => {
    res.json(200, req.user);
  });

  router.patch('/me', requireAuth(repo), async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) throw validationFailed({ name: 'Enter your name.' });
    const updated = await repo.updateUser(req.user.id, { name: name.trim() });
    res.json(200, updated);
  });
}
