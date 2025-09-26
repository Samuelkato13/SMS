import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  enableNetwork
} from "firebase/firestore";
import { db } from "./firebase";
import { School, Student, User, Class, Subject } from "@/types";
import { getDemoSchool } from "./auth";

// Initialize Firebase with graceful error handling
let isFirebaseConfigured = false;
try {
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    enableNetwork(db);
    isFirebaseConfigured = true;
  }
} catch (error) {
  console.log('Firebase configuration pending - demo mode active');
}

// Demo data for development and testing
const DEMO_STUDENTS: Student[] = [
  {
    id: "student-1",
    firstName: "John",
    lastName: "Mukasa",
    email: "john.mukasa@example.com",
    dateOfBirth: new Date("2008-05-15"),
    gender: "male",
    classId: "class-1",
    schoolId: "demo-school-1",
    paymentCode: "EDS-2025-001",
    guardianName: "Robert Mukasa",
    guardianPhone: "+256701234567",
    guardianEmail: "robert.mukasa@example.com",
    address: "Kampala, Uganda",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "student-2",
    firstName: "Mary",
    lastName: "Namuli",
    email: "mary.namuli@example.com",
    dateOfBirth: new Date("2009-03-22"),
    gender: "female",
    classId: "class-1",
    schoolId: "demo-school-1",
    paymentCode: "EDS-2025-002",
    guardianName: "Grace Namuli",
    guardianPhone: "+256702345678",
    guardianEmail: "grace.namuli@example.com",
    address: "Entebbe, Uganda",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "student-3",
    firstName: "David",
    lastName: "Ssemakula",
    email: "david.ssemakula@example.com",
    dateOfBirth: new Date("2008-11-08"),
    gender: "male",
    classId: "class-2",
    schoolId: "demo-school-1",
    paymentCode: "EDS-2025-003",
    guardianName: "Peter Ssemakula",
    guardianPhone: "+256703456789",
    guardianEmail: "peter.ssemakula@example.com",
    address: "Jinja, Uganda",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const DEMO_CLASSES: Class[] = [
  {
    id: "class-1",
    name: "Primary 6A",
    level: "Primary 6",
    section: "A",
    schoolId: "demo-school-1",
    classTeacherId: "demo-director-1",
    academicYear: "2025",
    maxStudents: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "class-2",
    name: "Primary 7B",
    level: "Primary 7",
    section: "B",
    schoolId: "demo-school-1",
    classTeacherId: "demo-director-1",
    academicYear: "2025",
    maxStudents: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const DEMO_SUBJECTS: Subject[] = [
  {
    id: "subject-1",
    name: "Mathematics",
    code: "MATH",
    description: "Core mathematics curriculum",
    schoolId: "demo-school-1",
    teacherId: "demo-director-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "subject-2",
    name: "English Language",
    code: "ENG",
    description: "English language and literature",
    schoolId: "demo-school-1",
    teacherId: "demo-director-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "subject-3",
    name: "Science",
    code: "SCI",
    description: "General science curriculum",
    schoolId: "demo-school-1",
    teacherId: "demo-director-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class FirestoreService {
  // Check if running in demo mode
  private isDemoMode(): boolean {
    return !isFirebaseConfigured;
  }

  // Generic CRUD operations
  async create<T>(collectionName: string, data: any): Promise<string> {
    if (this.isDemoMode()) {
      // Demo mode: simulate creation by returning a mock ID
      console.log(`Demo mode: Creating ${collectionName}`, data);
      return `demo-${collectionName}-${Date.now()}`;
    }

    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating ${collectionName}:`, error);
      throw error;
    }
  }

  async update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(db, collectionName, id), {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  }

  async delete(collectionName: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      throw error;
    }
  }

  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(db, collectionName, id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  }

  async getMany<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as T[];
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  }

  // School-specific operations
  async createSchool(schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.create<School>("schools", schoolData);
  }

  async getSchoolById(id: string): Promise<School | null> {
    if (this.isDemoMode()) {
      // Demo mode: return demo school data
      if (id === "demo-school-1") {
        return getDemoSchool();
      }
      return null;
    }

    return this.getById<School>("schools", id);
  }

  async getAllSchools(): Promise<School[]> {
    return this.getMany<School>("schools", [orderBy("name")]);
  }

  // User-specific operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.create<User>("users", userData);
  }

  async getUsersBySchool(schoolId: string): Promise<User[]> {
    return this.getMany<User>("users", [
      where("schoolId", "==", schoolId),
      orderBy("firstName")
    ]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getMany<User>("users", [
      where("email", "==", email),
      limit(1)
    ]);
    return users.length > 0 ? users[0] : null;
  }

  // Student-specific operations
  async createStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.create<Student>("students", studentData);
  }

  async getStudentsBySchool(schoolId: string): Promise<Student[]> {
    if (this.isDemoMode()) {
      // Demo mode: return demo students
      return DEMO_STUDENTS.filter(student => student.schoolId === schoolId && student.isActive);
    }

    return this.getMany<Student>("students", [
      where("schoolId", "==", schoolId),
      where("isActive", "==", true),
      orderBy("firstName")
    ]);
  }

  async getStudentsByClass(classId: string): Promise<Student[]> {
    return this.getMany<Student>("students", [
      where("classId", "==", classId),
      where("isActive", "==", true),
      orderBy("firstName")
    ]);
  }

  async getStudentByPaymentCode(paymentCode: string): Promise<Student | null> {
    const students = await this.getMany<Student>("students", [
      where("paymentCode", "==", paymentCode),
      limit(1)
    ]);
    return students.length > 0 ? students[0] : null;
  }

  // Class-specific operations
  async createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.create<Class>("classes", classData);
  }

  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    if (this.isDemoMode()) {
      // Demo mode: return demo classes
      return DEMO_CLASSES.filter(cls => cls.schoolId === schoolId);
    }

    return this.getMany<Class>("classes", [
      where("schoolId", "==", schoolId),
      orderBy("level"),
      orderBy("name")
    ]);
  }

  // Subject-specific operations
  async createSubject(subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return this.create<Subject>("subjects", subjectData);
  }

  async getSubjectsBySchool(schoolId: string): Promise<Subject[]> {
    if (this.isDemoMode()) {
      // Demo mode: return demo subjects
      return DEMO_SUBJECTS.filter(subject => subject.schoolId === schoolId);
    }

    return this.getMany<Subject>("subjects", [
      where("schoolId", "==", schoolId),
      orderBy("name")
    ]);
  }
}

export const firestoreService = new FirestoreService();
