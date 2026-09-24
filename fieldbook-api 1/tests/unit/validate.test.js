import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLogin, validateRegister, validateProject, validateTask, isValid } from '../../src/lib/validate.js';

test('validateLogin', () => {
  assert.deepEqual(Object.keys(validateLogin({})), ['email', 'password']);
  assert.ok(validateLogin({ email: 'not-an-email', password: 'secret1' }).email);
  assert.ok(validateLogin({ email: 'a@b.co', password: '123' }).password);
  assert.ok(isValid(validateLogin({ email: 'a@b.co', password: 'secret1' })));
});

test('validateRegister adds a name requirement on top of login rules', () => {
  assert.ok(validateRegister({ email: 'a@b.co', password: 'secret1', name: '' }).name);
  assert.ok(isValid(validateRegister({ email: 'a@b.co', password: 'secret1', name: 'Alex' })));
});

test('validateProject', () => {
  assert.ok(validateProject({ name: '   ' }).name);
  assert.ok(validateProject({ name: 'x'.repeat(61) }).name);
  assert.ok(validateProject({ name: 'ok', dueDate: '2026-13-40' }).dueDate);
  assert.ok(validateProject({ name: 'ok', description: 'x'.repeat(281) }).description);
  assert.ok(validateProject({ name: 'ok', status: 'archived' }).status);
  assert.ok(isValid(validateProject({ name: 'Good name', dueDate: '2026-10-01' })));
});

test('validateTask', () => {
  assert.ok(validateTask({ title: '' }).title);
  assert.ok(validateTask({ title: 'ok', priority: 'urgent' }).priority);
  assert.ok(validateTask({ title: 'ok', status: 'blocked' }).status);
  assert.ok(isValid(validateTask({ title: 'Write tests', priority: 'high', status: 'doing', due: '2026-10-01' })));
});
