# replit.md

## Overview

**EduPay** (edupayapp.com) — A multi-tenant SaaS School Management System built for Ugandan schools by SKYVALE Technologies Uganda Limited. Helpline: 0742 751 956. Features a React frontend and Express.js backend with PostgreSQL database, role-based access control, mobile money payment integration, and offline capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### March 15, 2026 (Final)
- **Username-Only Authentication**: Auth system completely refactored to use usernames only (no email logins)
  - Backend: `POST /api/auth/login` accepts only `{ username, password }`
  - Frontend: `signIn()` function takes username + password
  - Database: Added UNIQUE constraint on usernames
  - Both login pages (official and demo) now username-based
- **Professional Branding**: EduPay logo (blue gradient) integrated into all login pages
  - Copied logo to `/public/logo.png`
  - Used on OfficialLogin.tsx and demo LoginForm
  - Replaces generic graduation cap icon
- **Dynamic Demo Accounts Page**: `/demo-login` displays all schools and staff with quick login buttons
  - Fetches users and schools from API
  - Groups by school with code and name
  - Shows username/password for each staff member
  - One-click "Log In" buttons for instant access
- **Real Schools Working**: All 4 schools (EDS, Heritage, Ndejje, St. Clutues) have staff with working demo accounts
  - Staff can login with `username-schoolcode` format
  - Password: `demo123` for all demos
  - No email required for any staff account

### March 15, 2026 (Earlier)
- **MVC Server Restructure COMPLETED**: `server/routes.ts` (1932 lines) split into 14 focused route files under `server/routes/`:
  - `auth.ts` — login, logout, user profile, change-password
  - `schools.ts` — CRUD for schools
  - `users.ts` — user management (with email validation)
  - `students.ts` — student management + defaulters list
  - `classes.ts` — class management + teacher assignment
  - `subjects.ts` — subject management + teacher assignment
  - `attendance.ts` — attendance (single + bulk)
  - `exams.ts` — exam management + status updates
  - `marks.ts` — marks, bulk entry, lock/unlock, report cards, school stats
  - `fees.ts` — fee structures, payments, payment records, bank statements, reconciliation
  - `academic.ts` — sections, streams, academic years, terms, grading systems, events, parent comms
  - `admin.ts` — super admin CRUD (schools, users, subscriptions, audit logs, settings)
  - `signup.ts` — demo requests, trial requests, admin approval flow
  - `upload.ts` — file upload/delete
  - `index.ts` — bootstrap (DB schema setup + seed) + route registration
- **Auth system fixed**:
  - `getUserProfile` now looks up by user ID (`?id=`) instead of email — fixes duplicate email issue
  - Login endpoint uses `ORDER BY created_at DESC LIMIT 1` for emails that appear multiple times
  - Email regex validation on login and user creation
- **Role redirects fixed** in `LoginForm.tsx`: `head_teacher→/headteacher`, `class_teacher→/classteacher`, `bursar→/bursar`, `subject_teacher→/dashboard`
- **Two separate login pages**:
  - `/login` → `OfficialLogin.tsx` — clean professional page for real school staff (no demo accounts), shows helpline
  - `/demo-login` → `Login.tsx` (`LoginForm`) — demo accounts + super admin quick login
  - All ProtectedRoute guards redirect unauthenticated users to `/login` (OfficialLogin)
- **School director created on approval**: When super admin approves a signup request, a director user is created in the users table with the school's credentials

### March 14, 2026
- **Director Panel query fix**: All 9 director pages now use explicit `queryFn` with `?schoolId=` query params to correctly fetch school-scoped data (fixed `queryKey.join("/")` path-join bug)
- **Security fix**: `GET /api/users`, `POST /api/users`, `PUT /api/users/:id` no longer expose `password_hash` in responses
- **New `/api/stats` endpoint**: School-level statistics (totalStudents, totalStaff, totalClasses, totalRevenue, expectedRevenue, totalMarks, presentToday) — used by all role dashboards
- **Password support in user creation**: `POST /api/users` now accepts and bcrypt-hashes a password; `Users.tsx` form now includes a password field for new staff; `StaffManagement.tsx` already had this
- **Full RBAC verified**: All 7 roles (super_admin, director, admin, head_teacher, class_teacher, subject_teacher, bursar) login and route correctly; navigation scoped per role
- **All demo accounts working**: `superadmin@skyvale.com`/`Admin@2025!`, plus `director/admin/headteacher/classteacher/subjectteacher/bursar@demo.com` all with password `demo123`

### March 2026 (Earlier)
- **Super Admin (SaaS Owner) Panel built**: Full `/admin` route with its own layout, sidebar, 6 pages
  - Dashboard with platform stats (schools, users, revenue, subscriptions)
  - Schools Management: CRUD, status (Active/Trial/Suspended/Expired)
  - All Users: view/search/filter across all schools, create Director/Head Teacher, deactivate users
  - Subscriptions: assign Basic/Professional/Enterprise plans, expiry alerts
  - System Settings: global subject pool, security settings
  - Audit Logs: read-only log of all admin actions, CSV export
- **New DB tables**: `subscriptions`, `audit_logs`, `global_settings`; `schools` gets `status` + `subdomain` columns
- **New role: `super_admin`**: DB constraint updated; seeded as `superadmin@skyvale.com` / `Admin@2025!`
- **Role-based redirect**: login detects `super_admin` → `/admin`; all others → `/dashboard`
- **Removed Firebase & Supabase completely**: No external auth providers. Pure Replit infrastructure only.
- **Auth backed by Replit PostgreSQL**: `POST /api/auth/login` verifies bcrypt-hashed passwords stored in the DB.
- **File storage via Replit filesystem**: `POST /api/upload` saves files to `/uploads/` directory.

### March 2026 (Earlier)
- **Full PostgreSQL Migration**: Removed all Firebase/Firestore data dependencies; all CRUD operations now use PostgreSQL REST API
- **All 6 Dashboards Updated**: Admin, Director, HeadTeacher, ClassTeacher, SubjectTeacher, Bursar — all use real API data
- **Student Management**: Full CRUD with Add Student dialog, payment code display, class filtering
- **Bursar Dashboard**: Record payments dialog with MTN/Airtel Mobile Money support, real payment history table
- **Login Flow Fixed**: After quick-login, users are redirected to `/dashboard` automatically
- **Payment Seed Data**: 7 demo payments seeded in the database (950K UGX total revenue)
- **Schools Page**: Uses real API data; SchoolForm creates schools via REST API
- **Forms Updated**: StudentForm, SchoolForm, PDFGenerator, PaymentModal all use REST API

### Earlier
- **EduPay Brand**: Rebranded from EduManage → EduPay with dark sidebar and role badges
- **Demo Auth**: sessionStorage-based demo auth for 6 roles (all use password `demo123`)
- **Database Schema**: 11 PostgreSQL tables with realistic Ugandan demo data

## Demo Credentials

All demo users use password: `demo123`

| Email | Role | Color |
|-------|------|-------|
| admin@demo.com | Admin | Blue |
| director@demo.com | Director | Indigo |
| headteacher@demo.com | Head Teacher | Green |
| classteacher@demo.com | Class Teacher | Yellow |
| subjectteacher@demo.com | Subject Teacher | Purple |
| bursar@demo.com | Bursar | Teal |

Demo School ID: `a0000000-0000-0000-0000-000000000001`

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API (AuthContext, SchoolContext)
- **Data Fetching**: TanStack Query v5 (React Query) — all queries use fetch to REST API
- **Routing**: Wouter for client-side routing
- **PDF Generation**: jsPDF for student reports
- **Charts**: Chart.js for performance/attendance visualization

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Replit) via `pg` Pool — 11 tables, raw SQL queries
- **Authentication**: Demo auth via sessionStorage (Firebase removed from data flow)
- **Build System**: Vite for frontend, esbuild for backend

### Database Tables
1. `schools` — Multi-tenant school entities
2. `users` — Staff accounts with roles
3. `classes` — School classes/streams
4. `students` — Student records with payment codes
5. `subjects` — Academic subjects
6. `exams` — Assessment definitions
7. `marks` — Student grades
8. `attendance` — Daily attendance records
9. `fee_structures` — Fee types and amounts
10. `payments` — Payment transactions (MTN/Airtel/Cash/Bank)
11. `documents` — File/document references

### API Endpoints
- `GET/POST /api/schools` — School management
- `GET/POST /api/users` — User management
- `GET/POST /api/classes` — Class management
- `GET/POST /api/students` — Student CRUD
- `GET/POST /api/subjects` — Subject management
- `GET/POST /api/attendance` — Attendance tracking
- `GET/POST /api/exams` — Exam management
- `GET/POST /api/marks` — Grade recording
- `GET/POST /api/fees` — Fee structures
- `GET/POST /api/payments` — Payment recording
- `GET /api/stats?schoolId=` — Dashboard statistics
- `POST /api/demo-request` — Landing page lead capture

### Role-Based Access
- **Admin**: System-wide access, all schools
- **Director**: School-level management
- **Head Teacher**: Academic oversight
- **Class Teacher**: Class management, attendance
- **Subject Teacher**: Marks and exams
- **Bursar**: Fee collection and payments

### Payment Processing
- Students have unique payment codes: `ABBR-YEAR-NNNN` format (e.g., `EDS-2025-0001`)
- Bursar dashboard records payments (MTN MoMo, Airtel Money, Cash, Bank Transfer)
- Payment Modal validates payment code against student database before processing

## Key Files

- `server/routes.ts` — All REST API routes + database seed on startup
- `server/db.ts` — PostgreSQL pool connection
- `client/src/lib/auth.ts` — Demo authentication logic (sessionStorage)
- `client/src/contexts/AuthContext.tsx` — Auth state management
- `client/src/contexts/SchoolContext.tsx` — School data context
- `client/src/pages/LandingOnly.tsx` — EduPay marketing landing page
- `client/src/components/auth/LoginForm.tsx` — 6-role quick login buttons
- `client/src/App.tsx` — Route configuration with ProtectedRoute
