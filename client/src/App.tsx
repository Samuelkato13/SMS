import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { LandingOnly } from "@/pages/LandingOnly";
import Login from "@/pages/Login";
import OfficialLogin from "@/pages/OfficialLogin";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Schools from "@/pages/Schools";
import Classes from "@/pages/Classes";
import Subjects from "@/pages/Subjects";
import Exams from "@/pages/Exams";
import Marks from "@/pages/Marks";
import Attendance from "@/pages/Attendance";
import Fees from "@/pages/Fees";
import Payments from "@/pages/Payments";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/not-found";

// Super Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminSchools from "@/pages/admin/AdminSchools";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminSignupRequests from "@/pages/admin/AdminSignupRequests";

// ClassTeacher pages
import CTDashboard from "@/pages/classteacher/CTDashboard";
import CTStudents from "@/pages/classteacher/CTStudents";
import CTAttendance from "@/pages/classteacher/CTAttendance";
import CTMarks from "@/pages/classteacher/CTMarks";
import ClassPerformance from "@/pages/classteacher/ClassPerformance";
import CTReportCards from "@/pages/classteacher/CTReportCards";
import ParentCommunication from "@/pages/classteacher/ParentCommunication";

// HeadTeacher pages
import HTDashboard from "@/pages/headteacher/HTDashboard";
import AcademicCalendar from "@/pages/headteacher/AcademicCalendar";
import TeacherManagement from "@/pages/headteacher/TeacherManagement";
import HTStudents from "@/pages/headteacher/HTStudents";
import ExamManagement from "@/pages/headteacher/ExamManagement";
import PerformanceReports from "@/pages/headteacher/PerformanceReports";
import ReportCards from "@/pages/headteacher/ReportCards";
import PrintIDs from "@/pages/headteacher/PrintIDs";

// Bursar pages
import BursarDashboard from "@/pages/bursar/BursarDashboard";
import PaymentsReceived from "@/pages/bursar/PaymentsReceived";
import FeeManagement from "@/pages/bursar/FeeManagement";
import FinancialReports from "@/pages/bursar/FinancialReports";
import Reconciliation from "@/pages/bursar/Reconciliation";
import BankStatements from "@/pages/bursar/BankStatements";
import ReceiptsPage from "@/pages/bursar/ReceiptsPage";

// Director pages
import DirectorDashboard from "@/pages/director/DirectorDashboard";
import SchoolSetup from "@/pages/director/SchoolSetup";
import StaffManagement from "@/pages/director/StaffManagement";
import StudentManagement from "@/pages/director/StudentManagement";
import AcademicSetup from "@/pages/director/AcademicSetup";
import FeesManagement from "@/pages/director/FeesManagement";
import DirectorReports from "@/pages/director/DirectorReports";
import ReportStudio from "@/pages/director/ReportStudio";
import FinancialSummary from "@/pages/director/FinancialSummary";
import PromotionStudio from "@/pages/shared/PromotionStudio";
import GroupingStudio from "@/pages/shared/GroupingStudio";
import ReportsHub from "@/pages/shared/ReportsHub";
import { CTLayout } from "@/components/classteacher/CTLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, isSuperAdmin, profile } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <OfficialLogin />;
  }

  if (isSuperAdmin) {
    setTimeout(() => navigate('/admin'), 0);
    return null;
  }

  if (profile?.role === 'director') {
    setTimeout(() => navigate('/director'), 0);
    return null;
  }

  if (profile?.role === 'head_teacher') {
    setTimeout(() => navigate('/headteacher'), 0);
    return null;
  }

  if (profile?.role === 'class_teacher') {
    setTimeout(() => navigate('/classteacher'), 0);
    return null;
  }

  if (profile?.role === 'bursar') {
    setTimeout(() => navigate('/bursar'), 0);
    return null;
  }

  return <Layout>{children}</Layout>;
}

function HeadTeacherRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Head Teacher panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <OfficialLogin />;

  if (profile?.role !== 'head_teacher' && profile?.role !== 'admin') {
    setTimeout(() => navigate('/dashboard'), 0);
    return null;
  }

  return <>{children}</>;
}

function ClassTeacherRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Class Teacher panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <OfficialLogin />;

  if (profile?.role !== 'class_teacher' && profile?.role !== 'admin') {
    setTimeout(() => navigate('/dashboard'), 0);
    return null;
  }

  return <>{children}</>;
}

function BursarRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Finance panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <OfficialLogin />;

  if (profile?.role !== 'bursar' && profile?.role !== 'admin') {
    setTimeout(() => navigate('/dashboard'), 0);
    return null;
  }

  return <>{children}</>;
}

function DirectorRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading director panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <OfficialLogin />;
  }

  if (profile?.role !== 'director' && profile?.role !== 'admin') {
    setTimeout(() => navigate('/dashboard'), 0);
    return null;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <OfficialLogin />;
  }

  if (!isSuperAdmin) {
    setTimeout(() => navigate('/dashboard'), 0);
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingOnly} />
      <Route path="/login" component={OfficialLogin} />
      <Route path="/demo-login" component={Login} />

      {/* ── Super Admin routes ─────────────────────────────────────── */}
      <Route path="/admin">
        <AdminRoute><AdminDashboard /></AdminRoute>
      </Route>
      <Route path="/admin/schools">
        <AdminRoute><AdminSchools /></AdminRoute>
      </Route>
      <Route path="/admin/users">
        <AdminRoute><AdminUsers /></AdminRoute>
      </Route>
      <Route path="/admin/subscriptions">
        <AdminRoute><AdminSubscriptions /></AdminRoute>
      </Route>
      <Route path="/admin/settings">
        <AdminRoute><AdminSettings /></AdminRoute>
      </Route>
      <Route path="/admin/audit-logs">
        <AdminRoute><AdminAuditLogs /></AdminRoute>
      </Route>
      <Route path="/admin/signup-requests">
        <AdminRoute><AdminSignupRequests /></AdminRoute>
      </Route>

      {/* ── School system routes ───────────────────────────────────── */}
      <Route path="/dashboard">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/students">
        <ProtectedRoute><Students /></ProtectedRoute>
      </Route>
      <Route path="/classes">
        <ProtectedRoute><Classes /></ProtectedRoute>
      </Route>
      <Route path="/subjects">
        <ProtectedRoute><Subjects /></ProtectedRoute>
      </Route>
      <Route path="/exams">
        <ProtectedRoute><Exams /></ProtectedRoute>
      </Route>
      <Route path="/marks">
        <ProtectedRoute><Marks /></ProtectedRoute>
      </Route>
      <Route path="/attendance">
        <ProtectedRoute><Attendance /></ProtectedRoute>
      </Route>
      <Route path="/fees">
        <ProtectedRoute><Fees /></ProtectedRoute>
      </Route>
      <Route path="/payments">
        <ProtectedRoute><Payments /></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute><Users /></ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute><Reports /></ProtectedRoute>
      </Route>
      <Route path="/schools">
        <ProtectedRoute><Schools /></ProtectedRoute>
      </Route>

      {/* ── HeadTeacher routes ─────────────────────────────────────── */}
      <Route path="/headteacher">
        <HeadTeacherRoute><HTDashboard /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/calendar">
        <HeadTeacherRoute><AcademicCalendar /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/teachers">
        <HeadTeacherRoute><TeacherManagement /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/students">
        <HeadTeacherRoute><HTStudents /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/exams">
        <HeadTeacherRoute><ExamManagement /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/performance">
        <HeadTeacherRoute><PerformanceReports /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/report-cards">
        <HeadTeacherRoute><ReportCards /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/print-ids">
        <HeadTeacherRoute><PrintIDs /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/promotion">
        <HeadTeacherRoute><PromotionStudio /></HeadTeacherRoute>
      </Route>
      <Route path="/headteacher/grouping">
        <HeadTeacherRoute><GroupingStudio /></HeadTeacherRoute>
      </Route>

      {/* ── Class Teacher routes ────────────────────────────────────── */}
      <Route path="/classteacher">
        <ClassTeacherRoute><CTDashboard /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/students">
        <ClassTeacherRoute><CTStudents /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/attendance">
        <ClassTeacherRoute><CTAttendance /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/marks">
        <ClassTeacherRoute><CTMarks /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/performance">
        <ClassTeacherRoute><ClassPerformance /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/report-cards">
        <ClassTeacherRoute><CTReportCards /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/communication">
        <ClassTeacherRoute><ParentCommunication /></ClassTeacherRoute>
      </Route>
      <Route path="/classteacher/reports">
        <ClassTeacherRoute>
          <CTLayout><ReportsHub /></CTLayout>
        </ClassTeacherRoute>
      </Route>

      {/* ── Bursar routes ──────────────────────────────────────────── */}
      <Route path="/bursar">
        <BursarRoute><BursarDashboard /></BursarRoute>
      </Route>
      <Route path="/bursar/payments">
        <BursarRoute><PaymentsReceived /></BursarRoute>
      </Route>
      <Route path="/bursar/fees">
        <BursarRoute><FeeManagement /></BursarRoute>
      </Route>
      <Route path="/bursar/reports">
        <BursarRoute><FinancialReports /></BursarRoute>
      </Route>
      <Route path="/bursar/reconciliation">
        <BursarRoute><Reconciliation /></BursarRoute>
      </Route>
      <Route path="/bursar/bank-statements">
        <BursarRoute><BankStatements /></BursarRoute>
      </Route>
      <Route path="/bursar/receipts">
        <BursarRoute><ReceiptsPage /></BursarRoute>
      </Route>
      <Route path="/bursar/grouping">
        <BursarRoute><GroupingStudio /></BursarRoute>
      </Route>

      {/* ── Director routes ────────────────────────────────────────── */}
      <Route path="/director">
        <DirectorRoute><DirectorDashboard /></DirectorRoute>
      </Route>
      <Route path="/director/school-setup">
        <DirectorRoute><SchoolSetup /></DirectorRoute>
      </Route>
      <Route path="/director/staff">
        <DirectorRoute><StaffManagement /></DirectorRoute>
      </Route>
      <Route path="/director/students">
        <DirectorRoute><StudentManagement /></DirectorRoute>
      </Route>
      <Route path="/director/academic">
        <DirectorRoute><AcademicSetup /></DirectorRoute>
      </Route>
      <Route path="/director/fees">
        <DirectorRoute><FeesManagement /></DirectorRoute>
      </Route>
      <Route path="/director/reports">
        <DirectorRoute><DirectorReports /></DirectorRoute>
      </Route>
      <Route path="/director/report-studio">
        <DirectorRoute><ReportStudio /></DirectorRoute>
      </Route>
      <Route path="/director/financial">
        <DirectorRoute><FinancialSummary /></DirectorRoute>
      </Route>
      <Route path="/director/promotion">
        <DirectorRoute><PromotionStudio /></DirectorRoute>
      </Route>
      <Route path="/director/grouping">
        <DirectorRoute><GroupingStudio /></DirectorRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SchoolProvider>
            <Toaster />
            <Router />
          </SchoolProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
