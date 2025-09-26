import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, AuthUser } from "@/types";

// Development demo users for immediate testing
const DEMO_USERS = {
  "admin@demo.com": {
    id: "demo-admin-1",
    username: "EduManage_admin_1",
    email: "admin@demo.com",
    role: "admin" as const,
    schoolId: "demo-school-1",
    firstName: "Admin",
    lastName: "User",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  "director@demo.com": {
    id: "demo-director-1",
    username: "EduManage_director_1",
    email: "director@demo.com",
    role: "director" as const,
    schoolId: "demo-school-1",
    firstName: "Director",
    lastName: "User",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
};

const DEMO_SCHOOL = {
  id: "demo-school-1",
  name: "EduManage Demo School",
  abbreviation: "EDS",
  email: "contact@demoschool.edu",
  phone: "+256123456789",
  address: "Kampala, Uganda",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return !!(import.meta.env.VITE_FIREBASE_API_KEY && 
           import.meta.env.VITE_FIREBASE_PROJECT_ID &&
           import.meta.env.VITE_FIREBASE_APP_ID);
};

// Demo authentication state management
let currentDemoUser: AuthUser | null = null;
let authChangeListeners: ((user: any) => void)[] = [];

// Persist demo auth state in sessionStorage for consistency across page navigation
const DEMO_AUTH_KEY = 'edumanage_demo_auth';

const loadDemoAuthState = () => {
  try {
    const stored = sessionStorage.getItem(DEMO_AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      currentDemoUser = parsed;
      return parsed;
    }
  } catch (error) {
    console.log('No demo auth state found');
  }
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
  } catch (error) {
    console.log('Failed to save demo auth state');
  }
};

const notifyAuthChange = (user: any) => {
  authChangeListeners.forEach(callback => callback(user));
};

export const signIn = async (email: string, password: string) => {
  // If Firebase is configured, use Firebase authentication
  if (isFirebaseConfigured()) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  }

  // Development mode: Use demo credentials
  if (email in DEMO_USERS && password === "demo123") {
    const profile = DEMO_USERS[email as keyof typeof DEMO_USERS];
    const demoUser: AuthUser = {
      uid: profile.id,
      email: profile.email,
      profile
    };
    
    // Save to persistent storage and update state
    saveDemoAuthState(demoUser);
    
    // Simulate Firebase user object for compatibility
    const firebaseUser = {
      uid: profile.id,
      email: profile.email,
    };
    
    notifyAuthChange(firebaseUser);
    return firebaseUser;
  }

  throw new Error("Invalid credentials. For demo mode, use: admin@demo.com / demo123");
};

export const signOut = async () => {
  if (isFirebaseConfigured()) {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Logout failed");
    }
  } else {
    // Demo mode logout
    saveDemoAuthState(null);
    notifyAuthChange(null);
  }
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (isFirebaseConfigured()) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  // Demo mode: Return demo user profile
  const demoUser = Object.values(DEMO_USERS).find(user => user.id === uid);
  return demoUser || null;
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  if (isFirebaseConfigured()) {
    return onAuthStateChanged(auth, callback);
  }

  // Demo mode: Manage auth state locally with persistence
  authChangeListeners.push(callback);
  
  // Load persisted auth state on initialization
  const persistedUser = loadDemoAuthState();
  
  // Immediately call with current user (from storage or memory)
  setTimeout(() => callback(persistedUser ? {
    uid: persistedUser.uid,
    email: persistedUser.email,
  } as any : null), 0);

  // Return unsubscribe function
  return () => {
    const index = authChangeListeners.indexOf(callback);
    if (index > -1) {
      authChangeListeners.splice(index, 1);
    }
  };
};

// Helper function to get demo school data
export const getDemoSchool = () => DEMO_SCHOOL;

// Helper function to check if running in demo mode
export const isDemoMode = () => !isFirebaseConfigured();
