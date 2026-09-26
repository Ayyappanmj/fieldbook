/** POST /projects/:id/tasks, PATCH/DELETE /projects/:id/tasks/:taskId. */
import { notFound, validationFailed } from '../errors/ApiError.js';
import { validateTask, isValid } from '../lib/validate.js';
import { requireAuth } from '../middleware/auth.js';

export function registerTaskRoutes(router, repo) {
  const auth = requireAuth(repo);

  router.post('/projects/:id/tasks', auth, async (req, res) => {
    const data = req.body || {};
    const errors = validateTask(data);
    if (!isValid(errors)) throw validationFailed(errors);

    const task = await repo.createTask(req.user.id, req.params.id, data);
    if (!task) throw notFound('That project no longer exists.');
    res.json(201, task);
  });

  router.patch('/projects/:id/tasks/:taskId', auth, async (req, res) => {
    const project = await repo.getProject(req.user.id, req.params.id);
    if (!project) throw notFound('That project no longer exists.');
    const existingTask = project.tasks.find((t) => t.id === req.params.taskId);
    if (!existingTask) throw notFound('That task no longer exists.');

    const merged = { ...existingTask, ...req.body };
    const errors = validateTask(merged);
    if (!isValid(errors)) throw validationFailed(errors);

    const updated = await repo.updateTask(req.user.id, req.params.id, req.params.taskId, req.body || {});
    res.json(200, updated);
  });

  router.delete('/projects/:id/tasks/:taskId', auth, async (req, res) => {
    const deleted = await repo.deleteTask(req.user.id, req.params.id, req.params.taskId);
    if (!deleted) throw notFound('That task no longer exists.');
    res.noContent();
  });
}
