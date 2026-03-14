# replit.md

## Overview

**EduPay** (edupayapp.com) — A multi-tenant SaaS School Management System built for Ugandan schools by SKYVALE Technologies Uganda Limited. Helpline: 0742 751 956. Features a React frontend and Express.js backend with PostgreSQL database, role-based access control, mobile money payment integration, and offline capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### March 2026 (Latest)
- **Removed Firebase & Supabase completely**: No external auth providers. Pure Replit infrastructure only.
- **Auth backed by Replit PostgreSQL**: `POST /api/auth/login` verifies bcrypt-hashed passwords stored in the DB. `password_hash` column auto-added and demo passwords seeded on startup.
- **File storage via Replit filesystem**: `POST /api/upload` saves files to `/uploads/` directory, served at `/uploads/<filename>`. Replaces Firebase Storage.
- **client/src/lib/firebase.ts** and **firestore.ts**: Stubbed out (no-ops). Can be deleted once confirmed clean.
- **client/src/lib/supabase.ts**: Stubbed out (no-ops).

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
