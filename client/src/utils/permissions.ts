import { UserRole } from "@/types";

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  students: Permission;
  classes: Permission;
  subjects: Permission;
  exams: Permission;
  marks: Permission;
  attendance: Permission;
  fees: Permission;
  payments: Permission;
  users: Permission;
  reports: Permission;
  schools: Permission;
}

const fullPermission: Permission = { create: true, read: true, update: true, delete: true };
const readOnlyPermission: Permission = { create: false, read: true, update: false, delete: false };
const noPermission: Permission = { create: false, read: false, update: false, delete: false };

export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    dashboard: fullPermission,
    students: fullPermission,
    classes: fullPermission,
    subjects: fullPermission,
    exams: fullPermission,
    marks: fullPermission,
    attendance: fullPermission,
    fees: fullPermission,
    payments: fullPermission,
    users: fullPermission,
    reports: fullPermission,
    schools: fullPermission,
  },
  director: {
    dashboard: readOnlyPermission,
    students: { create: true, read: true, update: true, delete: false },
    classes: { create: true, read: true, update: true, delete: false },
    subjects: { create: true, read: true, update: true, delete: false },
    exams: { create: true, read: true, update: true, delete: false },
    marks: readOnlyPermission,
    attendance: readOnlyPermission,
    fees: readOnlyPermission,
    payments: readOnlyPermission,
    users: readOnlyPermission,
    reports: readOnlyPermission,
    schools: noPermission,
  },
  head_teacher: {
    dashboard: readOnlyPermission,
    students: readOnlyPermission,
    classes: readOnlyPermission,
    subjects: readOnlyPermission,
    exams: { create: true, read: true, update: true, delete: false },
    marks: { create: true, read: true, update: true, delete: false },
    attendance: { create: true, read: true, update: true, delete: false },
    fees: noPermission,
    payments: noPermission,
    users: noPermission,
    reports: readOnlyPermission,
    schools: noPermission,
  },
  class_teacher: {
    dashboard: readOnlyPermission,
    students: readOnlyPermission, // Only their students
    classes: readOnlyPermission, // Only their classes
    subjects: readOnlyPermission,
    exams: noPermission,
    marks: { create: true, read: true, update: true, delete: false },
    attendance: { create: true, read: true, update: true, delete: false },
    fees: noPermission,
    payments: noPermission,
    users: noPermission,
    reports: { create: true, read: true, update: false, delete: false },
    schools: noPermission,
  },
  subject_teacher: {
    dashboard: readOnlyPermission,
    students: readOnlyPermission, // Only students taking their subject
    classes: readOnlyPermission,
    subjects: readOnlyPermission, // Only their subjects
    exams: noPermission,
    marks: { create: true, read: true, update: true, delete: false },
    attendance: noPermission,
    fees: noPermission,
    payments: noPermission,
    users: noPermission,
    reports: { create: true, read: true, update: false, delete: false },
    schools: noPermission,
  },
  bursar: {
    dashboard: readOnlyPermission,
    students: readOnlyPermission,
    classes: noPermission,
    subjects: noPermission,
    exams: noPermission,
    marks: noPermission,
    attendance: noPermission,
    fees: { create: true, read: true, update: true, delete: false },
    payments: { create: true, read: true, update: true, delete: false },
    users: noPermission,
    reports: { create: true, read: true, update: false, delete: false },
    schools: noPermission,
  },
};

export const hasPermission = (
  userRole: UserRole,
  resource: keyof RolePermissions,
  action: keyof Permission
): boolean => {
  return rolePermissions[userRole][resource][action];
};

export const getNavigationItems = (userRole: UserRole) => {
  const permissions = rolePermissions[userRole];
  const items = [];

  if (permissions.dashboard.read) {
    items.push({ name: 'Dashboard', path: '/dashboard', icon: 'home' });
  }

  if (permissions.students.read) {
    items.push({ name: 'Students', path: '/students', icon: 'users' });
  }

  if (permissions.classes.read) {
    items.push({ name: 'Classes', path: '/classes', icon: 'building' });
  }

  if (permissions.subjects.read) {
    items.push({ name: 'Subjects', path: '/subjects', icon: 'book' });
  }

  if (permissions.exams.read) {
    items.push({ name: 'Exams', path: '/exams', icon: 'document' });
  }

  if (permissions.marks.read) {
    items.push({ name: 'Marks', path: '/marks', icon: 'star' });
  }

  if (permissions.attendance.read) {
    items.push({ name: 'Attendance', path: '/attendance', icon: 'check' });
  }

  if (permissions.fees.read) {
    items.push({ name: 'Fees', path: '/fees', icon: 'currency' });
  }

  if (permissions.payments.read) {
    items.push({ name: 'Payments', path: '/payments', icon: 'credit-card' });
  }

  if (permissions.users.read) {
    items.push({ name: 'Users', path: '/users', icon: 'user-group' });
  }

  if (permissions.reports.read) {
    items.push({ name: 'Reports', path: '/reports', icon: 'chart' });
  }

  if (permissions.schools.read) {
    items.push({ name: 'Schools', path: '/schools', icon: 'building-office' });
  }

  return items;
};
