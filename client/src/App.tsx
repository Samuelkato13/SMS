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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, isSuperAdmin } = useAuth();
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
    return <Login />;
  }

  // Super admins should be in /admin, not the school system
  if (isSuperAdmin) {
    setTimeout(() => navigate('/admin'), 0);
    return null;
  }

  return <Layout>{children}</Layout>;
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
    return <Login />;
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
      <Route path="/login" component={Login} />

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
