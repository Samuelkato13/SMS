import { syncQueue, SyncQueueEntry, registerBackgroundSync } from './offline';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';
type SyncListener = (state: SyncState, pendingCount: number, conflicts: SyncQueueEntry[]) => void;

class SyncManager {
  private listeners: SyncListener[] = [];
  private currentState: SyncState = 'idle';
  private pendingCount = 0;
  private conflicts: SyncQueueEntry[] = [];
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onOnline());
      window.addEventListener('offline', () => this.onOffline());
      // Listen to SW messages
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'TRIGGER_SYNC') this.sync();
        });
      }
      this.refreshPendingCount();
    }
  }

  private async onOnline() {
    await this.refreshPendingCount();
    if (this.pendingCount > 0) {
      // Slight delay to allow network to stabilize
      setTimeout(() => this.sync(), 2000);
    }
    this.notifyListeners();
  }

  private onOffline() {
    this.notifyListeners();
  }

  subscribe(listener: SyncListener) {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.currentState, this.pendingCount, this.conflicts);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentState, this.pendingCount, this.conflicts));
  }

  private setState(state: SyncState) {
    this.currentState = state;
    this.notifyListeners();
  }

  async refreshPendingCount() {
    this.pendingCount = await syncQueue.countPending();
    const all = await syncQueue.getAll();
    this.conflicts = all.filter(e => e.status === 'conflict');
    this.notifyListeners();
  }

  async sync() {
    if (this.currentState === 'syncing') return;
    if (!navigator.onLine) return;

    const pending = await syncQueue.getPending();
    if (pending.length === 0) {
      this.pendingCount = 0;
      this.setState('idle');
      return;
    }

    this.setState('syncing');
    let hasError = false;
    let synced = 0;

    for (const entry of pending) {
      if (!entry.id) continue;
      try {
        await syncQueue.markSyncing(entry.id);

        // Check for conflict: if action involves marks, check server first
        if (entry.action === 'marks_bulk') {
          const conflict = await this.checkMarksConflict(entry);
          if (conflict) {
            await syncQueue.markConflict(entry.id, conflict);
            await this.refreshPendingCount();
            this.setState('idle');
            return; // Stop sync until conflict resolved
          }
        }

        const response = await fetch(entry.endpoint, {
          method: entry.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });

        if (response.ok) {
          await syncQueue.markSynced(entry.id);
          synced++;
        } else if (response.status === 409) {
          // Conflict from server
          const serverData = await response.json().catch(() => null);
          await syncQueue.markConflict(entry.id, serverData);
          await this.refreshPendingCount();
          this.setState('idle');
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err: any) {
        hasError = true;
        await syncQueue.markFailed(entry.id, err.message || 'Network error');
      }
    }

    await syncQueue.removeOldSynced();
    await this.refreshPendingCount();
    this.setState(synced > 0 && !hasError ? 'success' : hasError ? 'error' : 'idle');

    // Auto-reset success state after 4s
    if (this.currentState === 'success') {
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        this.setState('idle');
      }, 4000);
    }
  }

  private async checkMarksConflict(entry: SyncQueueEntry): Promise<any | null> {
    try {
      const { examId, classId, subjectId, schoolId } = entry.payload;
      if (!examId || !classId || !subjectId) return null;

      const res = await fetch(
        `/api/marks?schoolId=${schoolId}&examId=${examId}&classId=${classId}&subjectId=${subjectId}`
      );
      if (!res.ok) return null;

      const serverMarks = await res.json();
      if (!serverMarks.length) return null;

      // Check if server marks were updated after our offline entry was created
      for (const m of serverMarks) {
        const serverUpdated = new Date(m.updated_at).getTime();
        if (serverUpdated > entry.createdAt) {
          return serverMarks; // Conflict: server has newer data
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async resolveConflict(id: number, resolution: 'use_local' | 'use_server') {
    const entry = await syncQueue.resolve(id, resolution);
    await this.refreshPendingCount();
    if (resolution === 'use_local') {
      // Re-trigger sync to send local version
      setTimeout(() => this.sync(), 500);
    } else {
      this.notifyListeners();
    }
  }

  // Queue a marks bulk save
  async queueMarksSave(payload: any, description: string) {
    const id = await syncQueue.add({
      action: 'marks_bulk',
      endpoint: '/api/marks/bulk',
      method: 'POST',
      payload,
      description,
    });
    await this.refreshPendingCount();

    // If we're online, attempt immediate sync
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 500);
    } else {
      await registerBackgroundSync();
    }
    return id;
  }

  // Queue attendance save
  async queueAttendanceSave(payload: any, description: string) {
    const id = await syncQueue.add({
      action: 'attendance_bulk',
      endpoint: '/api/attendance/bulk',
      method: 'POST',
      payload,
      description,
    });
    await this.refreshPendingCount();

    if (navigator.onLine) {
      setTimeout(() => this.sync(), 500);
    } else {
      await registerBackgroundSync();
    }
    return id;
  }

  // Queue report card remarks
  async queueRemarksSave(payload: any, description: string) {
    const id = await syncQueue.add({
      action: 'remarks',
      endpoint: '/api/report-cards/remarks',
      method: 'POST',
      payload,
      description,
    });
    await this.refreshPendingCount();

    if (navigator.onLine) {
      setTimeout(() => this.sync(), 500);
    } else {
      await registerBackgroundSync();
    }
    return id;
  }
}

export const syncManager = new SyncManager();
