// ─── Token Management ─────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem('token');

export const setToken = (token) => localStorage.setItem('token', token);

export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    // Decode payload (no verification — just check expiry client-side)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
};

export const getUser = () => {
  const raw = localStorage.getItem('user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));

export const logout = () => {
  removeToken();

  // Collect keys first (localStorage.length changes during removal)
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  // Remove anything that looks like chat/session data (plus user/token)
  const patterns = [/^chat/i, /^rag/i, /^conversation/i, /^messages/i, /^session/i, /^user$/i, /^token$/i];
  keys.forEach((k) => {
    if (k && patterns.some((p) => p.test(k))) localStorage.removeItem(k);
  });

  window.location.href = '/';
};

// Clear any pre-login or temporary credentials stored in localStorage
export const clearPreLoginCredentials = () => {
  // Collect keys first (localStorage.length changes during removal)
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  // Remove common pre-login/temp keys
  const patterns = [/^temp/i, /^tmp/i, /^login/i, /^register/i, /^otp/i, /^phone/i, /^email/i, /^user$/i, /^token$/i];
  keys.forEach((k) => {
    if (k && patterns.some((p) => p.test(k))) localStorage.removeItem(k);
  });
};
