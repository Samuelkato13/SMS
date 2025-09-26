import { Switch, Route } from "wouter";
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
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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

  return <Layout>{children}</Layout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingOnly} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/students">
        <ProtectedRoute>
          <Students />
        </ProtectedRoute>
      </Route>
      <Route path="/schools">
        <ProtectedRoute>
          <Schools />
        </ProtectedRoute>
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
