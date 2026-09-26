/**
 * Compact, signed session tokens: base64url(payload) + '.' + base64url(HMAC).
 *
 * This plays the same role as a JWT (a stateless, tamper-evident token the
 * client holds and sends back on every request) without pulling in the
 * `jsonwebtoken` package. Swapping this module for real JWTs later is a
 * drop-in change: callers only use sign() and verify().
 */
import crypto from 'node:crypto';

const b64url = (buf) => buf.toString('base64url');

function hmac(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest();
}

/** @param {{sub: string, sid: string}} payload */
export function sign(payload, secret, ttlSeconds) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(body)));
  const sig = b64url(hmac(payloadB64, secret));
  return `${payloadB64}.${sig}`;
}

/** Returns the decoded payload, or throws if the signature or expiry is invalid. */
export function verify(token, secret) {
  const [payloadB64, sig] = String(token).split('.');
  if (!payloadB64 || !sig) throw new Error('Malformed token.');

  const expectedSig = hmac(payloadB64, secret);
  const givenSig = Buffer.from(sig, 'base64url');
  if (expectedSig.length !== givenSig.length || !crypto.timingSafeEqual(expectedSig, givenSig)) {
    throw new Error('Invalid token signature.');
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired.');
  }
  return payload;
}
