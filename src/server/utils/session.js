// server/utils/session.js
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'omda-session-secret-2026-change-me';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12h

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function signSession(payloadObj) {
  const payload = { ...payloadObj, exp: Date.now() + SESSION_DURATION_MS };
  const payloadStr = base64url(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  return `${payloadStr}.${hmac}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadStr, hmac] = token.split('.');
  const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
  if (hmac !== expectedHmac) return null;
  try {
    const payload = JSON.parse(base64urlDecode(payloadStr));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

module.exports = { signSession, verifySession };