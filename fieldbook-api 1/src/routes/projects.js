/** GET/POST /projects, GET/PATCH/DELETE /projects/:id. */
import { notFound, validationFailed } from '../errors/ApiError.js';
import { validateProject, isValid } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';

export function registerProjectRoutes(router, repo) {
  const auth = requireAuth(repo);

  router.get('/projects', auth, async (req, res) => {
    res.json(200, await repo.listProjects(req.user.id));
  });

  router.get('/projects/:id', auth, async (req, res) => {
    const project = await repo.getProject(req.user.id, req.params.id);
    if (!project) throw notFound('That project no longer exists.');
    res.json(200, project);
  });

  router.post('/projects', auth, async (req, res) => {
    const data = req.body || {};
    const errors = validateProject(data);
    if (!isValid(errors)) throw validationFailed(errors);
    const project = await repo.createProject(req.user.id, data);
    res.json(201, project);
  });

  router.patch('/projects/:id', auth, async (req, res) => {
    const existing = await repo.getProject(req.user.id, req.params.id);
    if (!existing) throw notFound('That project no longer exists.');

    const merged = { ...existing, ...req.body };
    const errors = validateProject(merged);
    if (!isValid(errors)) throw validationFailed(errors);

    const updated = await repo.updateProject(req.user.id, req.params.id, req.body || {});
    res.json(200, updated);
  });

  router.delete('/projects/:id', auth, async (req, res) => {
    const deleted = await repo.deleteProject(req.user.id, req.params.id);
    if (!deleted) throw notFound('That project no longer exists.');
    res.noContent();
  });
}
