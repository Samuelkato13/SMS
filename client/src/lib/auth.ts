// ─── EduPay Auth — backed entirely by Replit PostgreSQL ──────────────────────
// No Firebase. No Supabase. Just the server API + this Replit DB.

import { User, AuthUser } from '@/types';

const SESSION_KEY = 'edupay_session';

// ── Session helpers ───────────────────────────────────────────────────────────
const saveSession = (user: AuthUser) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) {}
};

const loadSession = (): AuthUser | null => {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch (_) { return null; }
};

const clearSession = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
};

// Listeners for auth state changes
let listeners: ((user: AuthUser | null) => void)[] = [];
const notify = (user: AuthUser | null) => listeners.forEach(cb => cb(user));

// ── Public API ────────────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');

  // Store both id AND email so we can look up by ID (avoids duplicate email issue)
  const authUser: AuthUser = { uid: data.id, email: data.email };
  saveSession(authUser);
  notify(authUser);
  return authUser;
};

export const signOut = async (): Promise<void> => {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  clearSession();
  notify(null);
};

// Fetch profile by user ID (preferred) — falls back to email if no ID
export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
  try {
    // Always prefer lookup by ID to avoid duplicate-email issues
    const param = uid && uid !== 'undefined'
      ? `id=${encodeURIComponent(uid)}`
      : email ? `email=${encodeURIComponent(email)}` : null;

    if (!param) return null;

    const res = await fetch(`/api/auth/user?${param}`);
    if (!res.ok) return null;
    const data = await res.json();

    return {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role,
      schoolId: data.school_id || data.schoolId,
      firstName: data.first_name || data.firstName,
      lastName: data.last_name || data.lastName,
      isActive: data.is_active ?? data.isActive ?? true,
      createdAt: new Date(data.created_at || data.createdAt),
      updatedAt: new Date(data.updated_at || data.updatedAt),
    };
  } catch (_) { return null; }
};

export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  listeners.push(callback);
  const session = loadSession();
  setTimeout(() => callback(session), 0);
  return () => { listeners = listeners.filter(l => l !== callback); };
};

export const isDemoMode = (): boolean => false; // always using real DB now

// Fallback school info used if the API call fails
export const getDemoSchool = () => ({
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'EduPay Demo School',
  abbreviation: 'EDS',
  email: 'demo@edupayapp.com',
  phone: '0742 751 956',
  address: 'Kampala, Uganda',
});
