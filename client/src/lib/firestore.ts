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

// Enable network connectivity (Firebase v9 approach)
try {
  enableNetwork(db);
} catch (error) {
  console.log('Network already enabled or unavailable');
}

export class FirestoreService {
  // Generic CRUD operations
  async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
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
    return this.getMany<Subject>("subjects", [
      where("schoolId", "==", schoolId),
      orderBy("name")
    ]);
  }
}

export const firestoreService = new FirestoreService();
