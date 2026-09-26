import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../../src/lib/token.js';

test('sign then verify round-trips the payload', () => {
  const token = sign({ sub: 'user-1', sid: 'session-1' }, 'secret', 3600);
  const payload = verify(token, 'secret');
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.sid, 'session-1');
});

test('verify rejects a token signed with a different secret', () => {
  const token = sign({ sub: 'user-1', sid: 'session-1' }, 'secret-a', 3600);
  assert.throws(() => verify(token, 'secret-b'));
});

test('verify rejects a tampered payload', () => {
  const token = sign({ sub: 'user-1', sid: 'session-1' }, 'secret', 3600);
  const [, sig] = token.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'attacker', sid: 'session-1', iat: 0, exp: 9999999999 })).toString('base64url');
  assert.throws(() => verify(`${tamperedPayload}.${sig}`, 'secret'));
});

test('verify rejects an expired token', () => {
  const token = sign({ sub: 'user-1', sid: 'session-1' }, 'secret', -10);
  assert.throws(() => verify(token, 'secret'), /expired/);
});

test('verify rejects a malformed token', () => {
  assert.throws(() => verify('not-a-real-token', 'secret'));
  assert.throws(() => verify('', 'secret'));
});
