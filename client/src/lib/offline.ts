import Dexie, { Table } from 'dexie';
import { Student, User, Class, Subject, Mark, Attendance } from "@/types";

export interface OfflineData {
  id?: number;
  collection: string;
  docId: string;
  data: any;
  action: 'create' | 'update' | 'delete';
  timestamp: Date;
  synced: boolean;
}

class OfflineDatabase extends Dexie {
  students!: Table<Student>;
  users!: Table<User>;
  classes!: Table<Class>;
  subjects!: Table<Subject>;
  marks!: Table<Mark>;
  attendance!: Table<Attendance>;
  offlineQueue!: Table<OfflineData>;

  constructor() {
    super('SchoolManagementDB');
    
    this.version(1).stores({
      students: 'id, firstName, lastName, classId, schoolId, paymentCode',
      users: 'id, email, schoolId, role',
      classes: 'id, name, schoolId',
      subjects: 'id, name, schoolId',
      marks: 'id, studentId, examId, subjectId, classId, schoolId',
      attendance: 'id, studentId, classId, schoolId, date',
      offlineQueue: '++id, collection, docId, action, timestamp, synced'
    });
  }
}

export const offlineDB = new OfflineDatabase();

export class OfflineService {
  async saveForSync(collection: string, docId: string, data: any, action: 'create' | 'update' | 'delete') {
    await offlineDB.offlineQueue.add({
      collection,
      docId,
      data,
      action,
      timestamp: new Date(),
      synced: false
    });
  }

  async getPendingSync(): Promise<OfflineData[]> {
    return offlineDB.offlineQueue.where('synced').equals(false).toArray();
  }

  async markAsSynced(id: number) {
    await offlineDB.offlineQueue.update(id, { synced: true });
  }

  async clearSyncedData() {
    await offlineDB.offlineQueue.where('synced').equals(true).delete();
  }

  // Cache management
  async cacheStudents(schoolId: string, students: Student[]) {
    await offlineDB.students.where('schoolId').equals(schoolId).delete();
    await offlineDB.students.bulkAdd(students);
  }

  async getCachedStudents(schoolId: string): Promise<Student[]> {
    return offlineDB.students.where('schoolId').equals(schoolId).toArray();
  }

  async cacheClasses(schoolId: string, classes: Class[]) {
    await offlineDB.classes.where('schoolId').equals(schoolId).delete();
    await offlineDB.classes.bulkAdd(classes);
  }

  async getCachedClasses(schoolId: string): Promise<Class[]> {
    return offlineDB.classes.where('schoolId').equals(schoolId).toArray();
  }

  // Network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  onNetworkChange(callback: (online: boolean) => void) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

export const offlineService = new OfflineService();
