import { supabase, isSupabaseConfigured } from './supabase';
import { User, AuthUser } from '@/types';

// ── Demo Users (used when Supabase is not yet configured) ────────────────────
const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
  'admin@demo.com':           { uid: 'c0000000-0000-0000-0000-000000000001', email: 'admin@demo.com',           password: 'demo123' },
  'director@demo.com':        { uid: 'c0000000-0000-0000-0000-000000000002', email: 'director@demo.com',        password: 'demo123' },
  'headteacher@demo.com':     { uid: 'c0000000-0000-0000-0000-000000000003', email: 'headteacher@demo.com',     password: 'demo123' },
  'classteacher@demo.com':    { uid: 'c0000000-0000-0000-0000-000000000004', email: 'classteacher@demo.com',    password: 'demo123' },
  'subjectteacher@demo.com':  { uid: 'c0000000-0000-0000-0000-000000000005', email: 'subjectteacher@demo.com',  password: 'demo123' },
  'bursar@demo.com':          { uid: 'c0000000-0000-0000-0000-000000000006', email: 'bursar@demo.com',          password: 'demo123' },
};

// Demo session persistence
const DEMO_AUTH_KEY = 'edupay_demo_auth';
let currentDemoUser: AuthUser | null = null;
let authChangeListeners: ((user: AuthUser | null) => void)[] = [];

const loadDemoAuth = (): AuthUser | null => {
  try {
    const s = sessionStorage.getItem(DEMO_AUTH_KEY);
    if (s) { currentDemoUser = JSON.parse(s); return currentDemoUser; }
  } catch (_) {}
  return null;
};

const saveDemoAuth = (user: AuthUser | null) => {
  try {
    user ? sessionStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(user))
         : sessionStorage.removeItem(DEMO_AUTH_KEY);
    currentDemoUser = user;
  } catch (_) {}
};

const notifyListeners = (user: AuthUser | null) =>
  authChangeListeners.forEach(cb => cb(user));

// Helper to map UID → email in demo users
const getEmailForUid = (uid: string): string | null =>
  Object.values(DEMO_USERS).find(u => u.uid === uid)?.email ?? null;

// ── Public Auth API ──────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  if (isSupabaseConfigured() && supabase) {
    // ── Supabase login ──────────────────────────────────────────────────────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Login failed — no user returned');
    return { uid: data.user.id, email: data.user.email ?? email };
  }

  // ── Demo login ──────────────────────────────────────────────────────────
  const demo = DEMO_USERS[email.toLowerCase()];
  if (demo && demo.password === password) {
    const authUser: AuthUser = { uid: demo.uid, email: demo.email };
    saveDemoAuth(authUser);
    notifyListeners(authUser);
    return authUser;
  }
  throw new Error('Invalid credentials. Use a demo account (e.g. admin@demo.com) with password: demo123');
};

export const signOut = async (): Promise<void> => {
  if (isSupabaseConfigured() && supabase) {
    await supabase.auth.signOut();
    return;
  }
  saveDemoAuth(null);
  notifyListeners(null);
};

export const getUserProfile = async (uid: string, email?: string): Promise<User | null> => {
  try {
    const lookupEmail = email || getEmailForUid(uid);
    if (!lookupEmail) return null;

    const res = await fetch(`/api/auth/user?email=${encodeURIComponent(lookupEmail)}`);
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
  } catch (_) {
    return null;
  }
};

export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  if (isSupabaseConfigured() && supabase) {
    // ── Supabase session listener ─────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user
        ? { uid: session.user.id, email: session.user.email ?? '' }
        : null
      );
    });
    return () => subscription.unsubscribe();
  }

  // ── Demo session listener ─────────────────────────────────────────────
  authChangeListeners.push(callback);
  const persisted = loadDemoAuth();
  setTimeout(() => callback(persisted), 0);
  return () => {
    const i = authChangeListeners.indexOf(callback);
    if (i > -1) authChangeListeners.splice(i, 1);
  };
};

export const isDemoMode = (): boolean => !isSupabaseConfigured();
