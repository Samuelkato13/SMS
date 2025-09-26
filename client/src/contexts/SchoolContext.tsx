import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { School } from '@/types';
import { firestoreService } from '@/lib/firestore';
import { useAuthContext } from './AuthContext';

interface SchoolContextType {
  school: School | null;
  loading: boolean;
  refreshSchool: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const useSchoolContext = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchoolContext must be used within a SchoolProvider');
  }
  return context;
};

interface SchoolProviderProps {
  children: ReactNode;
}

export const SchoolProvider = ({ children }: SchoolProviderProps) => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use try-catch to handle context not being ready
  let authContext;
  try {
    authContext = useAuthContext();
  } catch (error) {
    // AuthProvider not ready yet, set authContext to null
    authContext = { profile: null, loading: true };
  }
  
  const { profile } = authContext;

  const refreshSchool = async () => {
    if (profile?.schoolId) {
      try {
        const schoolData = await firestoreService.getSchoolById(profile.schoolId);
        setSchool(schoolData);
      } catch (error) {
        console.error('Error fetching school:', error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.schoolId) {
      refreshSchool();
    } else if (profile === null) {
      // Profile is explicitly null (not loading), stop loading
      setLoading(false);
    }
  }, [profile?.schoolId]);

  const value = {
    school,
    loading,
    refreshSchool,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};
