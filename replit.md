# replit.md

## Overview

This is a modern SaaS School Management System built with a React frontend and Express.js backend, designed to serve multiple schools with role-based access control. The application features a multi-tenant architecture where each school operates as a separate entity with its own branding, users, and data.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 23, 2025
- **SaaS Landing Page Created**: Built comprehensive landing page for EduManage
  - Professional hero section with Ugandan school focus
  - Feature showcase highlighting 6 core capabilities
  - Customer testimonials and social proof
  - Transparent pricing in UGX (50k-120k per school/month)
  - Interactive demo request form for lead generation
  - Mobile-responsive design with gradient backgrounds
  - Smooth scrolling navigation and modern UI components

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for auth and school data
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Offline Support**: Dexie.js (IndexedDB wrapper) for offline data storage and synchronization
- **PDF Generation**: jsPDF for generating reports and documents
- **Charts**: Chart.js for data visualization

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Firebase Authentication integration
- **File Storage**: Firebase Storage for images and documents
- **Session Management**: Express sessions with PostgreSQL store
- **Build System**: Vite for frontend bundling, esbuild for backend bundling

### Multi-Tenant Design
- Each school is a separate entity with unique branding (logo, name, colors)
- School-scoped data isolation ensures users only access their school's information
- Centralized admin role can manage multiple schools

## Key Components

### Authentication System
- Firebase Authentication for user management
- Role-based access control with 6 distinct roles:
  - **Admin**: System-wide access, can manage all schools
  - **Director**: School-level management, limited user management
  - **Head Teacher**: Academic oversight within school
  - **Class Teacher**: Class-specific management
  - **Subject Teacher**: Subject-specific teaching duties
  - **Bursar**: Financial management and fee collection

### Permission System
- Granular permissions for each role (create, read, update, delete)
- Resource-based access control for students, classes, subjects, exams, marks, attendance, fees, payments, users, reports, and schools
- Navigation items dynamically generated based on user role

### Data Models
- **Schools**: Multi-tenant entities with branding information
- **Users**: Role-based user accounts linked to specific schools
- **Students**: Student records with payment codes and class assignments
- **Classes**: Organizational units within schools
- **Subjects**: Academic subjects with teacher assignments
- **Exams**: Assessment management
- **Marks**: Grade recording and tracking
- **Attendance**: Daily attendance tracking
- **Fees**: Fee structure management
- **Payments**: Payment processing and tracking

## Data Flow

### Authentication Flow
1. User logs in via Firebase Authentication
2. User profile fetched from Firestore with role and school information
3. School context loaded based on user's school ID
4. Navigation and permissions configured based on user role

### Data Synchronization
1. Online operations use Firebase Firestore directly
2. Offline operations queue in IndexedDB via Dexie.js
3. Background sync process uploads queued changes when connectivity returns
4. Optimistic updates provide immediate feedback

### Payment Processing
1. Students assigned unique payment codes (SCHOOL-YEAR-NUMBER format)
2. Mobile money integration for MTN and Airtel (mock implementation included)
3. Payment validation and transaction tracking
4. Automatic fee balance updates

## External Dependencies

### Firebase Services
- **Authentication**: User login/logout, session management
- **Firestore**: Primary database for all application data
- **Storage**: File uploads (school logos, student photos, reports)
- **Functions**: Serverless backend logic (if needed)

### Third-Party Libraries
- **Neon Database**: Serverless PostgreSQL for session storage and caching
- **Drizzle ORM**: Type-safe database operations
- **Radix UI**: Accessible component primitives
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form validation and management
- **Zod**: Runtime type validation

### Mobile Money APIs
- MTN Mobile Money API integration
- Airtel Money API integration
- Mock implementations provided for development

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- Express server with auto-reload via tsx
- Environment variables for Firebase configuration
- Database migrations via Drizzle Kit

### Production Build
- Frontend: Vite build optimized for production
- Backend: esbuild bundle for Node.js deployment
- Static assets served from Express
- Database schema managed via migrations

### Environment Configuration
- Firebase project configuration via environment variables
- Database connection string for PostgreSQL
- Mobile money API credentials
- Session secret for security

### Scaling Considerations
- Firebase Firestore provides automatic scaling
- Offline-first architecture reduces server load
- Multi-tenant design allows horizontal scaling
- Static asset CDN for performance optimization