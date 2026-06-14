import { Router } from 'express';
import { verifyPassword } from '../utils/helpers.js';
import { rateLimit, resetRateLimit } from '../utils/rateLimit.js';
import {
  isAdminVerified,
  setAdminVerifiedCookie,
  clearAdminVerifiedCookie,
} from '../utils/adminSession.js';

const router = Router();

function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

router.post('/api/admin/verify-password', (req, res) => {
  const ip = clientIp(req);
  const limit = rateLimit(ip, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });

  if (!limit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Unable to verify right now. Please try again later.',
    });
  }

  const password = req.body?.password;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }

  if (!verifyPassword(password)) {
    return res.status(401).json({
      success: false,
      message: 'Wrong password. Please try again.',
    });
  }

  resetRateLimit(ip);
  setAdminVerifiedCookie(res);
  return res.json({ success: true, message: 'Password verified.' });
});

router.get('/api/admin/session', (req, res) => {
  return res.json({ verified: isAdminVerified(req) });
});

router.post('/api/admin/logout', (_req, res) => {
  clearAdminVerifiedCookie(res);
  return res.json({ success: true });
});

export default router;
