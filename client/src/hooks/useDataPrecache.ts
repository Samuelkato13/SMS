import { useEffect } from 'react';
import { localCache } from '@/lib/offline';

/**
 * Saves critical school data into IndexedDB (Dexie) whenever it's fetched online.
 * This provides an extra offline fallback layer beyond the service worker cache.
 */
export function useDataPrecache(schoolId: string | undefined, students: any[], classes: any[], subjects: any[]) {
  useEffect(() => {
    if (!schoolId || !navigator.onLine) return;
    if (students.length > 0) localCache.saveStudents(students).catch(() => {});
  }, [schoolId, students.length]);

  useEffect(() => {
    if (!schoolId || !navigator.onLine) return;
    if (classes.length > 0) localCache.saveClasses(classes).catch(() => {});
  }, [schoolId, classes.length]);

  useEffect(() => {
    if (!schoolId || !navigator.onLine) return;
    if (subjects.length > 0) localCache.saveSubjects(subjects).catch(() => {});
  }, [schoolId, subjects.length]);
}
