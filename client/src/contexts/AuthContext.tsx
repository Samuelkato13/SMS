import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthChange, getUserProfile, signOut } from '@/lib/auth';
import { AuthUser, User } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  profile: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user?.uid) {
      const userProfile = await getUserProfile(user.uid, user.email ?? undefined);
      setProfile(userProfile);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser: AuthUser | null) => {
      if (authUser) {
        setUser(authUser);
        const userProfile = await getUserProfile(authUser.uid, authUser.email ?? undefined);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
