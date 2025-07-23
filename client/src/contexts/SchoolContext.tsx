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
  const { profile } = useAuthContext();

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
    refreshSchool();
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
