import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export class StorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  async uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
    const path = `schools/${schoolId}/logo.${file.name.split('.').pop()}`;
    return this.uploadFile(file, path);
  }

  async uploadStudentPhoto(schoolId: string, studentId: string, file: File): Promise<string> {
    const path = `schools/${schoolId}/students/${studentId}/photo.${file.name.split('.').pop()}`;
    return this.uploadFile(file, path);
  }

  async uploadReportPDF(schoolId: string, reportId: string, file: Blob): Promise<string> {
    const path = `schools/${schoolId}/reports/${reportId}.pdf`;
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
