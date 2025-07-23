import { z } from "zod";

// User Roles
export const UserRole = z.enum([
  "admin",
  "director", 
  "head_teacher",
  "class_teacher",
  "subject_teacher",
  "bursar"
]);

export type UserRole = z.infer<typeof UserRole>;

// School schema
export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  logoUrl: z.string().optional(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertSchoolSchema = schoolSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type School = z.infer<typeof schoolSchema>;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;

// User schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: UserRole,
  schoolId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserSchema = userSchema.omit({
  id: true,
  username: true,
  createdAt: true,
  updatedAt: true,
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  dateOfBirth: z.date(),
  gender: z.enum(["male", "female"]),
  classId: z.string(),
  schoolId: z.string(),
  paymentCode: z.string(),
  guardianName: z.string(),
  guardianPhone: z.string(),
  guardianEmail: z.string().email().optional(),
  address: z.string(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertStudentSchema = studentSchema.omit({
  id: true,
  paymentCode: true,
  createdAt: true,
  updatedAt: true,
});

export type Student = z.infer<typeof studentSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

// Class schema
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  section: z.string().optional(),
  schoolId: z.string(),
  classTeacherId: z.string().optional(),
  academicYear: z.string(),
  maxStudents: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertClassSchema = classSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Class = z.infer<typeof classSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;

// Subject schema
export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  schoolId: z.string(),
  teacherId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertSubjectSchema = subjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subject = z.infer<typeof subjectSchema>;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

// Exam schema
export const examSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  subjectId: z.string(),
  classId: z.string(),
  schoolId: z.string(),
  date: z.date(),
  duration: z.number(), // in minutes
  totalMarks: z.number(),
  passingMarks: z.number(),
  examType: z.enum(["quiz", "midterm", "final", "assignment"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertExamSchema = examSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Exam = z.infer<typeof examSchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;

// Marks schema
export const markSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  examId: z.string(),
  subjectId: z.string(),
  classId: z.string(),
  schoolId: z.string(),
  marksObtained: z.number(),
  totalMarks: z.number(),
  grade: z.string().optional(),
  remarks: z.string().optional(),
  recordedBy: z.string(), // teacher ID
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertMarkSchema = markSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Mark = z.infer<typeof markSchema>;
export type InsertMark = z.infer<typeof insertMarkSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  classId: z.string(),
  schoolId: z.string(),
  date: z.date(),
  status: z.enum(["present", "absent", "late", "excused"]),
  remarks: z.string().optional(),
  recordedBy: z.string(), // teacher ID
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertAttendanceSchema = attendanceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Attendance = z.infer<typeof attendanceSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

// Fee Structure schema
export const feeStructureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  amount: z.number(),
  dueDate: z.date(),
  classId: z.string().optional(),
  schoolId: z.string(),
  academicYear: z.string(),
  isOptional: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertFeeStructureSchema = feeStructureSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type FeeStructure = z.infer<typeof feeStructureSchema>;
export type InsertFeeStructure = z.infer<typeof insertFeeStructureSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  feeStructureId: z.string(),
  schoolId: z.string(),
  paymentCode: z.string(),
  amount: z.number(),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "card"]),
  provider: z.enum(["mtn", "airtel", "bank", "other"]).optional(),
  phoneNumber: z.string().optional(),
  transactionRef: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  paidAt: z.date().optional(),
  recordedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertPaymentSchema = paymentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Payment = z.infer<typeof paymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
