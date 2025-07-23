export type {
  School,
  InsertSchool,
  User,
  InsertUser,
  Student,
  InsertStudent,
  Class,
  InsertClass,
  Subject,
  InsertSubject,
  Exam,
  InsertExam,
  Mark,
  InsertMark,
  Attendance,
  InsertAttendance,
  FeeStructure,
  InsertFeeStructure,
  Payment,
  InsertPayment,
  UserRole,
} from "@shared/schema";

export interface AuthUser {
  uid: string;
  email: string | null;
  profile?: User | null;
}

export interface DashboardStats {
  totalStudents: number;
  activeTeachers: number;
  feesCollected: number;
  attendanceRate: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    tension?: number;
    fill?: boolean;
  }[];
}

export interface PaymentRequest {
  studentId: string;
  amount: number;
  provider: 'mtn' | 'airtel';
  phoneNumber: string;
  paymentCode: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingItems: number;
}
