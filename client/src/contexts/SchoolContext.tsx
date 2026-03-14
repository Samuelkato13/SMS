import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { School } from '@/types';
import { useAuthContext } from './AuthContext';
import { getDemoSchool } from '@/lib/auth';

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
    if (!profile?.schoolId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/schools/${profile.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setSchool(data);
      } else {
        // Fall back to demo school data
        const demo = getDemoSchool();
        setSchool({
          id: demo.id,
          name: demo.name,
          abbreviation: demo.abbreviation,
          email: demo.email,
          phone: demo.phone,
          address: demo.address,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as School);
      }
    } catch (_) {
      const demo = getDemoSchool();
      setSchool({
        id: demo.id,
        name: demo.name,
        abbreviation: demo.abbreviation,
        email: demo.email,
        phone: demo.phone,
        address: demo.address,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as School);
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
