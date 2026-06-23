import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { School } from '@/types';
import { useAuthContext } from './AuthContext';
import { getDemoSchool } from '@/lib/auth';
import { offlineFetchSchool } from '@/lib/offlineApi';

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

const demoSchoolFallback = (): School => {
  const demo = getDemoSchool();
  return {
    id: demo.id,
    name: demo.name,
    abbreviation: demo.abbreviation,
    email: demo.email,
    phone: demo.phone,
    address: demo.address,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as School;
};

export const SchoolProvider = ({ children }: SchoolProviderProps) => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthContext();

  const refreshSchool = async () => {
    if (!profile?.schoolId) {
      setLoading(false);
      return;
    }
    try {
      const data = await offlineFetchSchool<School>(profile.schoolId);
      if (data) {
        setSchool(data);
      } else {
        setSchool(demoSchoolFallback());
      }
    } catch {
      setSchool(demoSchoolFallback());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.schoolId) {
      refreshSchool();
    } else {
      setLoading(false);
    }
  }, [profile?.schoolId]);

  return (
    <SchoolContext.Provider value={{ school, loading, refreshSchool }}>
      {children}
    </SchoolContext.Provider>
  );
};
