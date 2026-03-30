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

const full: Permission = { create: true, read: true, update: true, delete: true };
const readOnly: Permission = { create: false, read: true, update: false, delete: false };
const none: Permission = { create: false, read: false, update: false, delete: false };
const createRead: Permission = { create: true, read: true, update: false, delete: false };
const createReadUpdate: Permission = { create: true, read: true, update: true, delete: false };
const readUpdate: Permission = { create: false, read: true, update: true, delete: false };

export const rolePermissions: Record<UserRole, RolePermissions> = {
  super_admin: {
    dashboard: full,
    students: full,
    classes: full,
    subjects: full,
    exams: full,
    marks: full,
    attendance: full,
    fees: full,
    payments: full,
    users: full,
    reports: full,
    schools: full,
  },
  // ── System Admin: manages the SaaS platform, NOT school academics/finances ──
  admin: {
    dashboard: full,
    students: readOnly,      // can view, NOT edit marks or finances
    classes: readOnly,
    subjects: readOnly,
    exams: readOnly,
    marks: readOnly,         // cannot edit marks
    attendance: readOnly,
    fees: readOnly,          // cannot edit finances
    payments: readOnly,
    users: full,             // full user management across all schools
    reports: readOnly,
    schools: full,           // create, activate, deactivate schools
  },

  // ── Director: highest authority inside a school ──
  director: {
    dashboard: readOnly,
    students: full,          // add, import, edit, archive, promote
    classes: createReadUpdate,
    subjects: createReadUpdate,
    exams: createReadUpdate,
    marks: readOnly,         // view only
    attendance: readOnly,
    fees: full,              // define and edit fee structure
    payments: readOnly,      // view only
    users: { create: true, read: true, update: true, delete: false }, // cannot delete; cannot create another director
    reports: { create: true, read: true, update: false, delete: false },
    schools: none,           // cannot manage other schools
  },

  // ── Head Teacher: academic supervisor ──
  head_teacher: {
    dashboard: readOnly,
    students: createReadUpdate, // add and edit students
    classes: readUpdate,        // assign teachers, not create classes
    subjects: readUpdate,       // assign teachers to subjects
    exams: full,                // create, manage, lock exams
    marks: { create: false, read: true, update: true, delete: false }, // approve and lock marks
    attendance: readOnly,
    fees: none,
    payments: none,
    users: createRead,          // create class/subject teachers only
    reports: { create: true, read: true, update: false, delete: false },
    schools: none,
  },

  // ── Class Teacher: manages one class ──
  class_teacher: {
    dashboard: readOnly,
    students: readUpdate,    // view & edit students in their class (cannot add)
    classes: readOnly,       // view their class only
    subjects: readOnly,
    exams: readOnly,
    marks: readOnly,         // view marks for their class
    attendance: createReadUpdate, // mark attendance for their class
    fees: none,
    payments: none,
    users: none,
    reports: { create: true, read: true, update: false, delete: false }, // class report cards
    schools: none,
  },

  // ── Subject Teacher: enters marks for assigned subject+class ──
  subject_teacher: {
    dashboard: readOnly,
    students: readOnly,      // view students in assigned classes only
    classes: readOnly,
    subjects: readOnly,      // view assigned subjects only
    exams: readOnly,
    marks: createReadUpdate, // enter & edit marks before approval
    attendance: none,
    fees: none,
    payments: none,
    users: none,
    reports: readOnly,
    schools: none,
  },

  // ── Bursar: financial officer ──
  bursar: {
    dashboard: readOnly,
    students: readOnly,      // view for payment lookup
    classes: none,
    subjects: none,
    exams: none,
    marks: none,             // cannot view marks
    attendance: none,
    fees: readOnly,          // view fee structure only (cannot edit per spec)
    payments: createReadUpdate, // record, view, edit payments
    users: none,
    reports: { create: true, read: true, update: false, delete: false }, // finance reports
    schools: none,
  },
};

export const hasPermission = (
  userRole: UserRole,
  resource: keyof RolePermissions,
  action: keyof Permission
): boolean => {
  const perms = rolePermissions[userRole];
  if (!perms) return false;
  return perms[resource]?.[action] ?? false;
};

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  group: string;
}

export const getNavigationItems = (userRole: UserRole): NavItem[] => {
  const p = rolePermissions[userRole];
  const items: NavItem[] = [];

  // Always show dashboard
  if (p.dashboard.read) {
    items.push({ name: 'Dashboard', path: '/dashboard', icon: 'home', group: 'main' });
  }

  // Academic
  if (p.students.read) {
    items.push({ name: 'Students', path: '/students', icon: 'users', group: 'academic' });
  }
  if (p.classes.read) {
    items.push({ name: 'Classes', path: '/classes', icon: 'building', group: 'academic' });
  }
  if (p.subjects.read) {
    items.push({ name: 'Subjects', path: '/subjects', icon: 'book', group: 'academic' });
  }
  if (p.exams.read) {
    items.push({ name: 'Exams', path: '/exams', icon: 'document', group: 'academic' });
  }
  if (p.marks.read) {
    items.push({ name: 'Marks', path: '/marks', icon: 'star', group: 'academic' });
  }
  if (p.attendance.read) {
    items.push({ name: 'Attendance', path: '/attendance', icon: 'check', group: 'academic' });
  }

  // Finance
  if (p.fees.read) {
    items.push({ name: 'Fees', path: '/fees', icon: 'currency', group: 'finance' });
  }
  if (p.payments.read) {
    items.push({ name: 'Payments', path: '/payments', icon: 'credit-card', group: 'finance' });
  }

  // Admin
  if (p.users.read) {
    items.push({ name: 'Users', path: '/users', icon: 'user-group', group: 'admin' });
  }
  if (p.reports.read) {
    items.push({ name: 'Reports', path: '/reports', icon: 'chart', group: 'admin' });
  }
  if (p.schools.read) {
    items.push({ name: 'Schools', path: '/schools', icon: 'building-office', group: 'admin' });
  }

  return items;
};

// Which roles can access each route path
export const routeAccess: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  '/students': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  '/classes': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher'],
  '/subjects': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher'],
  '/exams': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher'],
  '/marks': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher'],
  '/attendance': ['admin', 'director', 'head_teacher', 'class_teacher'],
  '/fees': ['admin', 'director', 'bursar'],
  '/payments': ['admin', 'director', 'bursar'],
  '/users': ['admin', 'director', 'head_teacher'],
  '/reports': ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  '/schools': ['admin'],
};

export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
  const allowed = routeAccess[path];
  if (!allowed) return true; // unknown routes pass through
  return allowed.includes(userRole);
};

// What roles a given role can CREATE (for user management)
export const creatableRoles: Record<UserRole, UserRole[]> = {
  super_admin: ['admin', 'director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  admin: ['director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  director: ['head_teacher', 'class_teacher', 'subject_teacher', 'bursar'],
  head_teacher: ['class_teacher', 'subject_teacher'],
  class_teacher: [],
  subject_teacher: [],
  bursar: [],
};
