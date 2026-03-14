import { useOffline } from '@/hooks/useOffline';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const OfflineBanner = () => {
  const { isOnline, pendingCount, syncState, triggerSync, conflicts, resolveConflict } = useOffline();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed when going offline
  if (!isOnline && dismissed) setDismissed(false);

  // ── Conflict resolution banner ─────────────────────────────────────────────
  if (conflicts.length > 0) {
    const conflict = conflicts[0];
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">Sync conflict:</span>{' '}
            {conflict.description} was also modified on another device. Which version should we keep?
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => resolveConflict(conflict.id!, 'use_server')}>
              Use Server Data
            </Button>
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
              onClick={() => resolveConflict(conflict.id!, 'use_local')}>
              Keep My Changes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sync success banner ────────────────────────────────────────────────────
  if (syncState === 'success' && !dismissed) {
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-800 flex-1 font-medium">
            All offline changes synced successfully
          </span>
          <button onClick={() => setDismissed(true)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Syncing banner ─────────────────────────────────────────────────────────
  if (syncState === 'syncing') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <span className="text-sm text-blue-800 font-medium">Syncing offline changes to server...</span>
        </div>
      </div>
    );
  }

  // ── Pending sync banner (online but has queue) ─────────────────────────────
  if (isOnline && pendingCount > 0) {
    return (
      <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-sm text-indigo-800 flex-1">
            <span className="font-semibold">{pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}</span>
            {' '}waiting to sync
          </span>
          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1"
            onClick={triggerSync}>
            <RefreshCw className="w-3 h-3" /> Sync Now
          </Button>
        </div>
      </div>
    );
  }

  // ── Offline banner ─────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-sm text-white flex-1">
            <span className="font-semibold text-red-300">Offline Mode</span>
            {' — '}
            <span className="text-gray-300">Viewing cached data. Marks, attendance & remarks will sync when reconnected.</span>
          </span>
          {pendingCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount} queued
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};
