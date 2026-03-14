import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '@/lib/syncManager';
import { SyncQueueEntry } from '@/lib/offline';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncQueueEntry[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncManager.subscribe((state, count, conflictList) => {
      setSyncState(state);
      setPendingCount(count);
      setConflicts(conflictList);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => {
    syncManager.sync();
  }, []);

  const resolveConflict = useCallback((id: number, resolution: 'use_local' | 'use_server') => {
    syncManager.resolveConflict(id, resolution);
  }, []);

  return {
    isOnline,
    syncState,
    pendingCount,
    conflicts,
    triggerSync,
    resolveConflict,
  };
}
