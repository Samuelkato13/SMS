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
import { Lock, User, School, ChevronRight, Phone } from "lucide-react";

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
}

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  head_teacher: "Head Teacher",
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
  bursar: "Bursar",
};

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  director:        { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  head_teacher:    { bg: "bg-blue-50",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"   },
  class_teacher:   { bg: "bg-green-50",  text: "text-green-700",  badge: "bg-green-100 text-green-700" },
  subject_teacher: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-700"},
  bursar:          { bg: "bg-teal-50",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700"   },
};

const redirectForRole = (role: string) => {
  switch (role) {
    case "super_admin":     return "/admin";
    case "director":        return "/director";
    case "head_teacher":    return "/headteacher";
    case "class_teacher":   return "/classteacher";
    case "bursar":          return "/bursar";
    case "subject_teacher": return "/dashboard";
    default:                return "/dashboard";
  }
};

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, schoolsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/schools"),
        ]);
        const users = await usersRes.json();
        const schools = await schoolsRes.json();

        const schoolMap: Record<string, { name: string; abbr: string }> = Object.fromEntries(
          schools.map((s: any) => [s.id, { name: s.name, abbr: s.abbreviation }])
        );

        const accounts: StaffAccount[] = users
          .filter((u: any) => u.role !== "super_admin" && u.role !== "admin")
          .map((u: any) => ({
            username: u.username,
            role: u.role,
            name: `${u.first_name} ${u.last_name}`,
            schoolCode: schoolMap[u.school_id]?.abbr || "?",
            schoolName: schoolMap[u.school_id]?.name || "Unknown School",
          }))
          .sort((a: StaffAccount, b: StaffAccount) =>
            a.schoolName.localeCompare(b.schoolName) || a.role.localeCompare(b.role)
          );

        setStaffAccounts(accounts);
      } catch (err) {
        console.error("Failed to load demo accounts:", err);
      }
    })();
  }, []);

  const handleSignIn = async (username: string, password: string, roleLabel?: string) => {
    setLoading(true);
    setLoadingUsername(username);
    try {
      const authUser = await signIn(username, password);
      const profile = await getUserProfile(authUser.uid);
      toast({
        title: roleLabel ? `Welcome, ${roleLabel}!` : "Welcome back!",
        description: "Redirecting to your dashboard...",
      });
      setTimeout(() => navigate(redirectForRole(profile?.role ?? "")), 300);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
      setLoadingUsername(null);
    }
  };

  const schoolNames = Array.from(new Set(staffAccounts.map((a) => a.schoolName)));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-[#0a1628] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="EduPay" className="h-9" />
          <div>
            <span className="text-white font-bold text-lg">EduPay</span>
            <span className="text-blue-400 text-xs ml-2">Demo Environment</span>
          </div>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm" className="border-blue-400 text-blue-300 hover:bg-blue-900 bg-transparent text-xs">
            Official Login →
          </Button>
        </Link>
      </div>

      <div className="flex flex-1">
        {/* Left — Login form */}
        <div className="w-full lg:w-[380px] bg-white border-r border-gray-200 flex flex-col">
          <div className="flex-1 p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500 text-sm mt-1">Use your username and password</p>
            </div>

            <form
              onSubmit={form.handleSubmit((d) => handleSignIn(d.username, d.password))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g., dr-eds"
                    {...form.register("username")}
                    className="h-11 pl-10 font-mono text-sm border-gray-300"
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-red-600">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    {...form.register("password")}
                    className="h-11 pl-10 border-gray-300"
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={loading}
              >
                {loading && !loadingUsername ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-2">Username format:</p>
              <div className="space-y-1 text-xs text-blue-700">
                <p><code className="bg-white px-1 rounded">dr</code> = Director</p>
                <p><code className="bg-white px-1 rounded">ht</code> = Head Teacher</p>
                <p><code className="bg-white px-1 rounded">ct</code> = Class Teacher</p>
                <p><code className="bg-white px-1 rounded">st</code> = Subject Teacher</p>
                <p><code className="bg-white px-1 rounded">bsr</code> = Bursar</p>
                <p className="mt-2 pt-2 border-t border-blue-200">
                  Example: <code className="bg-white px-1 rounded">dr-eds</code> = Director of EDS school
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              Support: 0742 751 956
            </p>
          </div>
        </div>

        {/* Right — Demo accounts */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Demo Accounts</h3>
              <p className="text-sm text-gray-500 mt-1">
                Click any account below to log in instantly. All demo accounts use password{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">demo123</code>
              </p>
            </div>

            {staffAccounts.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {schoolNames.map((schoolName) => {
                  const schoolAccounts = staffAccounts.filter((a) => a.schoolName === schoolName);
                  const schoolCode = schoolAccounts[0]?.schoolCode;
                  return (
                    <div key={schoolName}>
                      {/* School header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-[#0a1628] text-white text-xs font-bold px-2 py-1 rounded">
                          {schoolCode}
                        </div>
                        <h4 className="font-semibold text-gray-800 text-sm">{schoolName}</h4>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Staff cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {schoolAccounts.map((account) => {
                          const colors = ROLE_COLORS[account.role] || {
                            bg: "bg-gray-50",
                            text: "text-gray-700",
                            badge: "bg-gray-100 text-gray-700",
                          };
                          const isLoggingIn = loadingUsername === account.username;
                          return (
                            <div
                              key={account.username}
                              className={`${colors.bg} rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                    {ROLE_LABELS[account.role] || account.role}
                                  </span>
                                  <p className="text-gray-600 text-xs mt-1.5">{account.name}</p>
                                </div>
                                <School className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              </div>

                              <div className="space-y-1.5 mb-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Username</span>
                                  <code className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                                    {account.username}
                                  </code>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Password</span>
                                  <code className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">
                                    demo123
                                  </code>
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  handleSignIn(
                                    account.username,
                                    "demo123",
                                    ROLE_LABELS[account.role] || account.role
                                  )
                                }
                                disabled={loading}
                                className={`w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold text-white transition-opacity ${
                                  isLoggingIn ? "opacity-70" : "hover:opacity-90"
                                } ${
                                  account.role === "director" ? "bg-orange-500" :
                                  account.role === "head_teacher" ? "bg-blue-500" :
                                  account.role === "class_teacher" ? "bg-green-500" :
                                  account.role === "subject_teacher" ? "bg-purple-500" :
                                  "bg-teal-500"
                                }`}
                              >
                                {isLoggingIn ? (
                                  "Signing in..."
                                ) : (
                                  <>
                                    Log in as {ROLE_LABELS[account.role] || account.role}
                                    <ChevronRight className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
