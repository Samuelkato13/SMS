import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { precacheSchoolData } from '@/lib/offlineApi';

/**
 * After login, prefetch critical school data into IndexedDB and the service worker cache.
 */
export function useOfflineBootstrap() {
  const { profile, user } = useAuthContext();
  const schoolId = profile?.schoolId;

  useEffect(() => {
    if (!schoolId) return;
    precacheSchoolData(schoolId, user?.uid);
  }, [schoolId, user?.uid]);

  useEffect(() => {
    if (!schoolId) return;

    const onOnline = () => {
      precacheSchoolData(schoolId, user?.uid);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [schoolId, user?.uid]);
}
