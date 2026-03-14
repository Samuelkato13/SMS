import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebase";
import { User, AuthUser } from "@/types";

// Demo users for all 6 roles (password: demo123)
const DEMO_USERS = {
  "admin@demo.com": {
    id: "c0000000-0000-0000-0000-000000000001",
    username: "edupay_admin",
    email: "admin@demo.com",
    role: "admin" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "System",
    lastName: "Admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "director@demo.com": {
    id: "c0000000-0000-0000-0000-000000000002",
    username: "edupay_director",
    email: "director@demo.com",
    role: "director" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "Sarah",
    lastName: "Mugisha",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "headteacher@demo.com": {
    id: "c0000000-0000-0000-0000-000000000003",
    username: "edupay_headteacher",
    email: "headteacher@demo.com",
    role: "head_teacher" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "James",
    lastName: "Okello",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "classteacher@demo.com": {
    id: "c0000000-0000-0000-0000-000000000004",
    username: "edupay_classteacher",
    email: "classteacher@demo.com",
    role: "class_teacher" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "Grace",
    lastName: "Nakato",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "subjectteacher@demo.com": {
    id: "c0000000-0000-0000-0000-000000000005",
    username: "edupay_subjectteacher",
    email: "subjectteacher@demo.com",
    role: "subject_teacher" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "David",
    lastName: "Mugisha",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "bursar@demo.com": {
    id: "c0000000-0000-0000-0000-000000000006",
    username: "edupay_bursar",
    email: "bursar@demo.com",
    role: "bursar" as const,
    schoolId: "a0000000-0000-0000-0000-000000000001",
    firstName: "Christine",
    lastName: "Nabukeera",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
};

const DEMO_SCHOOL = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "EduPay Demo School",
  abbreviation: "EDS",
  email: "admin@edupay.com",
  phone: "+256 700 123456",
  address: "Plot 45, Kampala Road, Kampala, Uganda",
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_APP_ID &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
};

export const isDemoMode = () => !isFirebaseConfigured();

// Persist demo auth state across page navigation
const DEMO_AUTH_KEY = 'edupay_demo_auth';
let currentDemoUser: AuthUser | null = null;
let authChangeListeners: ((user: any) => void)[] = [];

const loadDemoAuthState = (): AuthUser | null => {
  try {
    const stored = sessionStorage.getItem(DEMO_AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      currentDemoUser = parsed;
      return parsed;
    }
  } catch (_) {}
  return null;
};

const saveDemoAuthState = (user: AuthUser | null) => {
  try {
    if (user) {
      sessionStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(DEMO_AUTH_KEY);
    }
    currentDemoUser = user;
  } catch (_) {}
};

const notifyAuthChange = (user: any) => {
  authChangeListeners.forEach(cb => cb(user));
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string) => {
  if (isFirebaseConfigured()) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  }

  if (email in DEMO_USERS && password === "demo123") {
    const profile = DEMO_USERS[email as keyof typeof DEMO_USERS];
    const demoUser: AuthUser = { uid: profile.id, email: profile.email, profile };
    saveDemoAuthState(demoUser);
    notifyAuthChange({ uid: profile.id, email: profile.email });
    return { uid: profile.id, email: profile.email };
  }

  throw new Error("Invalid credentials. Use one of the demo accounts with password: demo123");
};

export const signOut = async () => {
  if (isFirebaseConfigured()) {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Logout failed");
    }
  } else {
    saveDemoAuthState(null);
    notifyAuthChange(null);
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (isFirebaseConfigured()) {
    try {
      const res = await fetch(`/api/auth/user?replitId=${uid}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }
  // Demo mode: look up by uid
  const demoUser = Object.values(DEMO_USERS).find(u => u.id === uid);
  return demoUser || null;
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  if (isFirebaseConfigured()) {
    return onAuthStateChanged(auth, callback);
  }

  authChangeListeners.push(callback);
  const persisted = loadDemoAuthState();
  setTimeout(() => callback(persisted ? { uid: persisted.uid, email: persisted.email } as any : null), 0);

  return () => {
    const i = authChangeListeners.indexOf(callback);
    if (i > -1) authChangeListeners.splice(i, 1);
  };
};

export const getDemoSchool = () => DEMO_SCHOOL;
export const getAllDemoUsers = () => DEMO_USERS;
