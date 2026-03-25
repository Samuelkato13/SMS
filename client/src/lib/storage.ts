// ─── ZaabuPay File Storage — backed by Replit server filesystem ────────────────
// Files are uploaded to the Express server and stored in /uploads/
// Served back at /uploads/<filename>

export class StorageService {
  private async upload(file: File | Blob, path: string): Promise<string> {
    const formData = new FormData();
    const ext = file instanceof File ? (file.name.split('.').pop() || 'bin') : 'bin';
    const filename = path.replace(/\//g, '_') + '.' + ext;
    formData.append('file', file, filename);
    formData.append('path', path);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message);
    }
    const data = await res.json();
    return data.url;
  }

  async uploadSchoolLogo(schoolId: string, file: File): Promise<string> {
    return this.upload(file, `schools/${schoolId}/logo`);
  }

  async uploadStudentPhoto(schoolId: string, studentId: string, file: File): Promise<string> {
    return this.upload(file, `schools/${schoolId}/students/${studentId}/photo`);
  }

  async uploadReportPDF(schoolId: string, reportId: string, file: Blob): Promise<string> {
    return this.upload(file, `schools/${schoolId}/reports/${reportId}`);
  }

  async deleteFile(path: string): Promise<void> {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  }
}

export const storageService = new StorageService();
