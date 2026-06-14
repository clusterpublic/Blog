/**
 * Persistent admin password — stored in localStorage; must pass server verify + cookie.
 */
(function (global) {
  const STORAGE_KEY = 'cluster_admin_password';
  const VERIFIED_COOKIE = 'cluster_admin_verified';
  const SETTINGS_PATH = '/settings';

  function getStoredPassword() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function setStoredPassword(password) {
    try {
      if (password) {
        localStorage.setItem(STORAGE_KEY, password);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Could not save admin password:', err);
    }
  }

  function clearStoredPassword() {
    setStoredPassword('');
  }

  function hasStoredPassword() {
    return Boolean(getStoredPassword());
  }

  function isVerified() {
    return global.document?.cookie
      ?.split(';')
      .some((part) => part.trim() === `${VERIFIED_COOKIE}=1`);
  }

  function isSettingsPage() {
    const path = global.location?.pathname || '';
    return path.includes('/settings') || path.includes('/test-header');
  }

  function isUnlocked() {
    return hasStoredPassword() && isVerified();
  }

  /** Redirect to Settings when not verified (except on Settings itself). */
  function guardAdminAccess() {
    if (isSettingsPage()) return true;
    if (isUnlocked()) return true;
    global.location.replace(SETTINGS_PATH);
    return false;
  }

  /** Password for API calls — only when unlocked. */
  function requirePassword() {
    if (!isUnlocked()) return '';
    return getStoredPassword();
  }

  async function verifyAndSave(password) {
    const response = await fetch('/api/admin/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  async function logoutSession() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      /* ignore */
    }
    global.document.cookie = `${VERIFIED_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }

  global.AdminPassword = {
    get: getStoredPassword,
    set: setStoredPassword,
    clear: clearStoredPassword,
    has: hasStoredPassword,
    isVerified,
    isUnlocked,
    require: requirePassword,
    guard: guardAdminAccess,
    isSettingsPage,
    verifyAndSave,
    logoutSession,
  };
})(window);
