import { useQuery, type QueryKey } from '@tanstack/react-query';
import { offlineFetchJson } from '@/lib/offlineApi';

/** React Query hook that reads school API data with offline IndexedDB fallback. */
export function useOfflineSchoolQuery<T>(
  url: string | undefined,
  queryKey: QueryKey,
  enabled = true,
) {
  return useQuery<T>({
    queryKey,
    queryFn: () => offlineFetchJson<T>(url!),
    enabled: enabled && !!url,
  });
}
