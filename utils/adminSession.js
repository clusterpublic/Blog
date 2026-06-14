export const ADMIN_VERIFIED_COOKIE = 'cluster_admin_verified';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function isAdminVerified(req) {
  const cookies = parseCookies(req);
  return cookies[ADMIN_VERIFIED_COOKIE] === '1';
}

export function setAdminVerifiedCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_VERIFIED_COOKIE}=1; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax`
  );
}

export function clearAdminVerifiedCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_VERIFIED_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  );
}
