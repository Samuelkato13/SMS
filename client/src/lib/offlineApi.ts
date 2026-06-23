import { apiCache, localCache, schoolCache } from './offline';

async function syncStructuredCache(url: string, data: unknown) {
  if (!Array.isArray(data)) return;

  const parsed = new URL(url, window.location.origin);
  const schoolId = parsed.searchParams.get('schoolId');
  if (!schoolId) return;

  if (parsed.pathname === '/api/students') {
    await localCache.saveStudents(data as Parameters<typeof localCache.saveStudents>[0]);
  } else if (parsed.pathname === '/api/classes') {
    await localCache.saveClasses(data as Parameters<typeof localCache.saveClasses>[0]);
  } else if (parsed.pathname === '/api/subjects') {
    await localCache.saveSubjects(data as Parameters<typeof localCache.saveSubjects>[0]);
  }
}

async function structuredFallback(url: string): Promise<unknown | null> {
  const parsed = new URL(url, window.location.origin);
  const schoolId = parsed.searchParams.get('schoolId');
  if (!schoolId) return null;

  if (parsed.pathname === '/api/students') {
    const classId = parsed.searchParams.get('classId');
    return localCache.getStudents(schoolId, classId || undefined);
  }
  if (parsed.pathname === '/api/classes') {
    return localCache.getClasses(schoolId);
  }
  if (parsed.pathname === '/api/subjects') {
    return localCache.getSubjects(schoolId);
  }
  return null;
}

/** Network-first fetch with IndexedDB fallback for offline PWA use. */
export async function offlineFetchJson<T = unknown>(url: string): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    await apiCache.put(url, data);
    await syncStructuredCache(url, data);
    return data;
  } catch {
    const cached = await apiCache.get<T>(url);
    if (cached !== null) return cached;

    const structured = await structuredFallback(url);
    if (structured !== null) return structured as T;

    return [] as T;
  }
}

/** Fetch a single school record with offline fallback. */
export async function offlineFetchSchool<T = unknown>(schoolId: string): Promise<T | null> {
  const url = `/api/schools/${schoolId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    await schoolCache.save(schoolId, data);
    return data;
  } catch {
    return schoolCache.get<T>(schoolId);
  }
}

const SCHOOL_PRECACHE_PATHS = [
  '/api/classes',
  '/api/students',
  '/api/subjects',
  '/api/exams',
  '/api/fees',
  '/api/stats',
  '/api/payments',
] as const;

/** Warm IndexedDB + service worker caches after login. */
export async function precacheSchoolData(schoolId: string, userId?: string) {
  const urls = [
    ...SCHOOL_PRECACHE_PATHS.map((p) => `${p}?schoolId=${schoolId}`),
    `/api/schools/${schoolId}`,
  ];
  if (userId) {
    urls.push(`/api/auth/user?id=${encodeURIComponent(userId)}`);
  }

  await Promise.allSettled(urls.map((url) => offlineFetchJson(url)));

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_URLS', urls });
  }
}
