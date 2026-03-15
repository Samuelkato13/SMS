import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { signIn, getUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, ArrowLeft, BookOpen } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface StaffAccount {
  username: string;
  role: string;
  name: string;
  schoolCode: string;
  schoolName: string;
  color: string;
  description: string;
}

// Color mapping for roles
const roleColors: Record<string, string> = {
  director: "bg-orange-600 hover:bg-orange-700",
  head_teacher: "bg-blue-600 hover:bg-blue-700",
  class_teacher: "bg-green-600 hover:bg-green-700",
  subject_teacher: "bg-purple-600 hover:bg-purple-700",
  bursar: "bg-teal-600 hover:bg-teal-700",
};

const roleDescriptions: Record<string, string> = {
  director: "School-level management",
  head_teacher: "Academic oversight",
  class_teacher: "Class management",
  subject_teacher: "Marks & assessments",
  bursar: "Fee collection & payments",
};

const redirectForRole = (role: string) => {
  switch (role) {
    case "super_admin": return "/admin";
    case "director":    return "/director";
    case "head_teacher": return "/headteacher";
    case "class_teacher": return "/classteacher";
    case "bursar":      return "/bursar";
    case "subject_teacher": return "/dashboard";
    default:            return "/dashboard";
  }
};

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // Load all staff accounts from API on mount
  useEffect(() => {
    (async () => {
      try {
        const [usersRes, schoolsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/schools"),
        ]);
        const users = await usersRes.json();
        const schools = await schoolsRes.json();

        const schoolMap = Object.fromEntries(
          schools.map((s: any) => [s.id, { name: s.name, abbr: s.abbreviation }])
        );

        const accounts = users
          .filter((u: any) => u.role !== "super_admin")
          .map((u: any) => ({
            username: u.username,
            role: u.role,
            name: `${u.first_name} ${u.last_name}`,
            schoolCode: schoolMap[u.school_id]?.abbr || "?",
            schoolName: schoolMap[u.school_id]?.name || "Unknown School",
            color: roleColors[u.role] || "bg-gray-600",
            description: roleDescriptions[u.role] || "Staff member",
          }))
          .sort((a: StaffAccount, b: StaffAccount) => 
            a.schoolName.localeCompare(b.schoolName) || 
            a.role.localeCompare(b.role)
          );

        setStaffAccounts(accounts);
      } catch (err) {
        console.error("Failed to load demo accounts:", err);
      }
    })();
  }, []);

  const handleSignIn = async (
    username: string,
    password: string,
    roleLabel?: string,
  ) => {
    setLoading(true);
    try {
      const authUser = await signIn(username, password);
      const profile = await getUserProfile(authUser.uid);
      const dest = redirectForRole(profile?.role ?? "");
      toast({
        title: roleLabel ? `Welcome, ${roleLabel}!` : "Welcome back!",
        description: "Redirecting to your dashboard...",
      });
      setTimeout(() => navigate(dest), 200);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md space-y-4">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to EduPay
          </Button>
        </Link>

        <Card className="border border-blue-100 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-3">
            <img src="/logo.png" alt="EduPay" className="h-16 mx-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">EduPay</h1>
              <p className="text-gray-600 text-sm mt-1">Demo Accounts - All Schools</p>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form
              onSubmit={form.handleSubmit((d) =>
                handleSignIn(d.username, d.password),
              )}
              className="space-y-4"
            >
              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g., dr-eds"
                  {...form.register("username")}
                  className="h-11 font-mono"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.username.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Format: role-schoolcode (e.g., dr-eds, ht-hs)
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register("password")}
                  className="h-11"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-400 font-medium">
                    Demo Accounts
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {staffAccounts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading demo accounts...
                  </div>
                ) : (
                  <>
                    {Array.from(new Set(staffAccounts.map((a) => a.schoolName))).map(
                      (schoolName) => (
                        <div key={schoolName} className="border-t border-gray-200 pt-3 first:border-t-0 first:pt-0">
                          <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {staffAccounts.find((a) => a.schoolName === schoolName)?.schoolCode || "?"} - {schoolName}
                          </h4>
                          <div className="space-y-1.5">
                            {staffAccounts
                              .filter((a) => a.schoolName === schoolName)
                              .map((account) => (
                                <div
                                  key={`${account.username}`}
                                  className="bg-gray-50 rounded p-2 border border-gray-100 text-xs"
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                      <span className="font-bold text-gray-800">
                                        {account.role.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                    <span className="text-gray-500 text-[9px]">{account.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 mb-1 text-gray-600 flex-wrap">
                                    <code className="bg-white px-1 py-0.5 rounded font-mono text-gray-700 border border-gray-200">
                                      {account.username}
                                    </code>
                                    <span>/</span>
                                    <code className="bg-white px-1 py-0.5 rounded font-mono text-gray-700 border border-gray-200">
                                      demo123
                                    </code>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() =>
                                      handleSignIn(
                                        account.username,
                                        "demo123",
                                        account.role.replace(/_/g, " ")
                                      )
                                    }
                                    className={`w-full h-6 text-white text-[10px] font-medium ${account.color}`}
                                    disabled={loading}
                                  >
                                    Log In
                                  </Button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-center">
                <p className="font-semibold">Super Admin login managed separately</p>
              </div>

              <div className="bg-green-50 rounded-lg p-3 text-xs border border-green-200">
                <p className="font-semibold text-green-700 mb-2">
                  How to use demo accounts:
                </p>
                <ul className="text-green-600 space-y-1">
                  <li>✓ Use username format: <code className="bg-white px-1 rounded">role-code</code></li>
                  <li>✓ Password for all: <code className="bg-white px-1 rounded">demo123</code></li>
                  <li>✓ Or click any "Sign In" button above</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <a
            href="#demo"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Request access at edupayapp.com
          </a>
        </p>
      </div>
    </div>
  );
};
