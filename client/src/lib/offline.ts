import Dexie, { Table } from 'dexie';

// ── Sync Queue Entry ──────────────────────────────────────────────────────────
export interface SyncQueueEntry {
  id?: number;
  // What kind of action
  action: 'marks_bulk' | 'attendance_bulk' | 'remarks' | 'attendance_single';
  // API endpoint to call when syncing
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // Payload to send
  payload: any;
  // Human-readable description (for UI)
  description: string;
  // Status tracking
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  retries: number;
  // Server version of data (for conflict detection)
  serverSnapshot?: any;
  // Timestamps
  createdAt: number; // epoch ms
  syncedAt?: number;
  error?: string;
}

// ── Cached Data ───────────────────────────────────────────────────────────────
export interface CachedStudent {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  payment_code: string;
  class_id: string;
  school_id: string;
  gender: string;
  is_active: boolean;
  [key: string]: any;
}

export interface CachedClass {
  id: string;
  name: string;
  level: string;
  school_id: string;
  [key: string]: any;
}

export interface CachedSubject {
  id: string;
  name: string;
  code: string;
  school_id: string;
  [key: string]: any;
}

export interface CachedProfileRow {
  id: string;
  username: string;
  email: string | null;
  role: string;
  schoolId: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  cachedAt: number;
}

export interface ApiCacheEntry {
  url: string;
  data: string;
  cachedAt: number;
}

export interface CachedSchoolRow {
  id: string;
  data: string;
  cachedAt: number;
}

// ── Dexie Database ────────────────────────────────────────────────────────────
class ZaabuPayDB extends Dexie {
  syncQueue!: Table<SyncQueueEntry, number>;
  students!: Table<CachedStudent, string>;
  classes!: Table<CachedClass, string>;
  subjects!: Table<CachedSubject, string>;
  profile!: Table<CachedProfileRow, string>;
  apiCache!: Table<ApiCacheEntry, string>;
  schools!: Table<CachedSchoolRow, string>;

  constructor() {
    super('ZaabuPayDB_v2');
    this.version(1).stores({
      syncQueue: '++id, status, action, createdAt',
      students: 'id, class_id, school_id',
      classes: 'id, school_id',
      subjects: 'id, school_id',
    });
    this.version(2).stores({
      syncQueue: '++id, status, action, createdAt',
      students: 'id, class_id, school_id',
      classes: 'id, school_id',
      subjects: 'id, school_id',
      profile: 'id',
      apiCache: 'url, cachedAt',
      schools: 'id',
    });
  }
}

export const db = new ZaabuPayDB();

// ── Queue Manager ─────────────────────────────────────────────────────────────
export const syncQueue = {
  async add(entry: Omit<SyncQueueEntry, 'id' | 'status' | 'retries' | 'createdAt'>): Promise<number> {
    return db.syncQueue.add({
      ...entry,
      status: 'pending',
      retries: 0,
      createdAt: Date.now(),
    });
  },

  async getPending(): Promise<SyncQueueEntry[]> {
    return db.syncQueue.where('status').anyOf(['pending', 'failed']).sortBy('createdAt');
  },

  async getAll(): Promise<SyncQueueEntry[]> {
    return db.syncQueue.orderBy('createdAt').toArray();
  },

  async countPending(): Promise<number> {
    return db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
  },

  async markSyncing(id: number) {
    await db.syncQueue.update(id, { status: 'syncing' });
  },

  async markSynced(id: number) {
    await db.syncQueue.update(id, { status: 'synced', syncedAt: Date.now() });
  },

  async markFailed(id: number, error: string) {
    const entry = await db.syncQueue.get(id);
    await db.syncQueue.update(id, {
      status: 'failed',
      error,
      retries: (entry?.retries || 0) + 1,
    });
  },

  async markConflict(id: number, serverData: any) {
    await db.syncQueue.update(id, { status: 'conflict', serverSnapshot: serverData });
  },

  async resolve(id: number, resolution: 'use_local' | 'use_server') {
    if (resolution === 'use_server') {
      await db.syncQueue.update(id, { status: 'synced', syncedAt: Date.now() });
    } else {
      await db.syncQueue.update(id, { status: 'pending' });
    }
  },

  async removeOldSynced() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h ago
    await db.syncQueue.where('status').equals('synced').filter(e => (e.syncedAt || 0) < cutoff).delete();
  },
};

// ── Data Cache ────────────────────────────────────────────────────────────────
export const localCache = {
  async saveStudents(students: CachedStudent[]) {
    if (!students.length) return;
    await db.students.bulkPut(students);
  },

  async getStudents(schoolId: string, classId?: string): Promise<CachedStudent[]> {
    let q = db.students.where('school_id').equals(schoolId);
    const all = await q.toArray();
    return classId ? all.filter(s => s.class_id === classId) : all;
  },

  async saveClasses(classes: CachedClass[]) {
    if (!classes.length) return;
    await db.classes.bulkPut(classes);
  },

  async getClasses(schoolId: string): Promise<CachedClass[]> {
    return db.classes.where('school_id').equals(schoolId).toArray();
  },

  async saveSubjects(subjects: CachedSubject[]) {
    if (!subjects.length) return;
    await db.subjects.bulkPut(subjects);
  },

  async getSubjects(schoolId: string): Promise<CachedSubject[]> {
    return db.subjects.where('school_id').equals(schoolId).toArray();
  },
};

// ── Profile & school cache ────────────────────────────────────────────────────
export const profileCache = {
  async save(profile: CachedProfileRow) {
    await db.profile.put({ ...profile, cachedAt: Date.now() });
  },

  async get(userId: string): Promise<CachedProfileRow | null> {
    return (await db.profile.get(userId)) ?? null;
  },

  async clear(userId?: string) {
    if (userId) await db.profile.delete(userId);
    else await db.profile.clear();
  },
};

export const schoolCache = {
  async save(schoolId: string, data: unknown) {
    await db.schools.put({
      id: schoolId,
      data: JSON.stringify(data),
      cachedAt: Date.now(),
    });
  },

  async get<T = unknown>(schoolId: string): Promise<T | null> {
    const row = await db.schools.get(schoolId);
    if (!row) return null;
    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  },

  async clear(schoolId?: string) {
    if (schoolId) await db.schools.delete(schoolId);
    else await db.schools.clear();
  },
};

export const apiCache = {
  async put(url: string, data: unknown) {
    await db.apiCache.put({
      url,
      data: JSON.stringify(data),
      cachedAt: Date.now(),
    });
  },

  async get<T = unknown>(url: string): Promise<T | null> {
    const row = await db.apiCache.get(url);
    if (!row) return null;
    try {
      return JSON.parse(row.data) as T;
    } catch {
      return null;
    }
  },
};

// ── Register Background Sync ──────────────────────────────────────────────────
export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('zaabupay-sync');
    } catch (_) { /* Background Sync not supported */ }
  }
}
