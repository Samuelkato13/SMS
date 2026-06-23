// ─── ZaabuPay Auth — backed by your server + Postgres ─────────────────────────
// No Firebase. No Supabase. Just your own API + database.

import { User, AuthUser } from '@/types';
import { profileCache, type CachedProfileRow } from './offline';
import { precacheSchoolData } from './offlineApi';

const SESSION_KEY = 'zaabupay_session';

function rowToUser(row: CachedProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email || `${row.username}@zaabupay.local`,
    role: row.role as User['role'],
    schoolId: row.schoolId || '',
    firstName: row.firstName,
    lastName: row.lastName,
    isActive: row.isActive,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function userToRow(user: User): CachedProfileRow {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId || null,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    cachedAt: Date.now(),
  };
}

function mapApiUser(data: Record<string, unknown>): User {
  const username = String(data.username ?? '');
  return {
    id: String(data.id),
    username,
    email: String(data.email || `${username}@zaabupay.local`),
    role: data.role as User['role'],
    schoolId: String(data.school_id || data.schoolId || ''),
    firstName: String(data.first_name || data.firstName || ''),
    lastName: String(data.last_name || data.lastName || ''),
    isActive: (data.is_active ?? data.isActive ?? true) as boolean,
    createdAt: new Date((data.created_at || data.createdAt) as string),
    updatedAt: new Date((data.updated_at || data.updatedAt) as string),
  };
}

// ── Session helpers (localStorage for PWA persistence on iOS) ─────────────────
const saveSession = (user: AuthUser) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (_) {}
};

const loadSession = (): AuthUser | null => {
  try {
    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) return JSON.parse(fromLocal);

    // Migrate legacy sessionStorage sessions
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) {
      localStorage.setItem(SESSION_KEY, fromSession);
      sessionStorage.removeItem(SESSION_KEY);
      return JSON.parse(fromSession);
    }
    return null;
  } catch (_) {
    return null;
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {}
};

let listeners: ((user: AuthUser | null) => void)[] = [];
const notify = (user: AuthUser | null) => listeners.forEach((cb) => cb(user));

// ── Public API ────────────────────────────────────────────────────────────────

export const signIn = async (username: string, password: string): Promise<AuthUser> => {
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');

  const authUser: AuthUser = { uid: data.id, email: data.email };
  saveSession(authUser);

  const profile = mapApiUser(data);
  await profileCache.save(userToRow(profile));

  if (profile.schoolId) {
    precacheSchoolData(profile.schoolId, profile.id).catch(() => {});
  }

  notify(authUser);
  return authUser;
};

export const signOut = async (): Promise<void> => {
  const session = loadSession();
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  if (session?.uid) await profileCache.clear(session.uid);
  clearSession();
  notify(null);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (!uid || uid === 'undefined') return null;

  try {
    const res = await fetch(`/api/auth/user?id=${encodeURIComponent(uid)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || Array.isArray(data) || typeof data !== 'object' || !data.id) return null;

    const profile = mapApiUser(data);
    await profileCache.save(userToRow(profile));
    return profile;
  } catch {
    const cached = await profileCache.get(uid);
    return cached ? rowToUser(cached) : null;
  }
};

export const getCachedUserProfile = async (uid: string): Promise<User | null> => {
  const cached = await profileCache.get(uid);
  return cached ? rowToUser(cached) : null;
};

export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  listeners.push(callback);
  const session = loadSession();
  setTimeout(() => callback(session), 0);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
};

export const isDemoMode = (): boolean => false;

export const getDemoSchool = () => ({
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'ZaabuPay Demo School',
  abbreviation: 'EDS',
  email: 'demo@zaabupayapp.com',
  phone: '0742 751 956',
  address: 'Kampala, Uganda',
});
