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
import { EduPayLogo } from "@/components/ui/EduPayLogo";
import { Lock, User, ArrowRight, Phone, Loader2 } from "lucide-react";

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
  director:        "Director",
  head_teacher:    "Head Teacher",
  class_teacher:   "Class Teacher",
  subject_teacher: "Subject Teacher",
  bursar:          "Bursar",
};

const ROLE_STYLE: Record<string, { pill: string; btn: string; card: string }> = {
  director:        { pill: "bg-orange-100 text-orange-700",  btn: "bg-orange-500 hover:bg-orange-600",  card: "border-orange-100 bg-orange-50/40"  },
  head_teacher:    { pill: "bg-blue-100 text-blue-700",      btn: "bg-blue-500 hover:bg-blue-600",      card: "border-blue-100 bg-blue-50/40"      },
  class_teacher:   { pill: "bg-emerald-100 text-emerald-700",btn: "bg-emerald-500 hover:bg-emerald-600",card: "border-emerald-100 bg-emerald-50/40"},
  subject_teacher: { pill: "bg-purple-100 text-purple-700",  btn: "bg-purple-500 hover:bg-purple-600",  card: "border-purple-100 bg-purple-50/40"  },
  bursar:          { pill: "bg-teal-100 text-teal-700",      btn: "bg-teal-500 hover:bg-teal-600",      card: "border-teal-100 bg-teal-50/40"      },
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
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
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
        const [ur, sr] = await Promise.all([fetch("/api/users"), fetch("/api/schools")]);
        const users = await ur.json();
        const schools = await sr.json();
        const sm: Record<string, { name: string; abbr: string }> = Object.fromEntries(
          schools.map((s: any) => [s.id, { name: s.name, abbr: s.abbreviation }])
        );
        setStaffAccounts(
          users
            .filter((u: any) => u.role !== "super_admin" && u.role !== "admin")
            .map((u: any) => ({
              username: u.username,
              role: u.role,
              name: `${u.first_name} ${u.last_name}`,
              schoolCode: sm[u.school_id]?.abbr || "?",
              schoolName: sm[u.school_id]?.name || "Unknown School",
            }))
            .sort((a: StaffAccount, b: StaffAccount) =>
              a.schoolName.localeCompare(b.schoolName) || a.role.localeCompare(b.role)
            )
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleSignIn = async (username: string, password: string, label?: string) => {
    setLoading(true);
    setActiveUsername(username);
    try {
      const authUser = await signIn(username, password);
      const profile = await getUserProfile(authUser.uid);
      toast({ title: label ? `Welcome, ${label}!` : "Welcome back!", description: "Loading your dashboard..." });
      setTimeout(() => navigate(redirectForRole(profile?.role ?? "")), 300);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
      setActiveUsername(null);
    }
  };

  const schoolNames = Array.from(new Set(staffAccounts.map((a) => a.schoolName)));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top bar ── */}
      <header className="bg-gradient-to-r from-blue-900 to-slate-900 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <EduPayLogo size={36} />
          <div>
            <span className="text-white font-extrabold text-lg tracking-tight">EduPay</span>
            <span className="ml-2 text-xs text-blue-300 font-medium border border-blue-500/40 rounded px-1.5 py-0.5">
              Demo Portal
            </span>
          </div>
        </div>
        <Link href="/login">
          <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-200 hover:bg-blue-800 hover:text-white bg-transparent text-xs h-8">
            Staff Login →
          </Button>
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Login form ── */}
        <aside className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">
          <div className="flex-1 p-8 xl:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your username and password</p>
            </div>

            <form
              onSubmit={form.handleSubmit((d) => handleSignIn(d.username, d.password))}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g., dr-eds"
                    {...form.register("username")}
                    className="h-11 pl-10 font-mono text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    autoFocus
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    {...form.register("password")}
                    className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20"
              >
                {loading && !activeUsername ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </form>

            {/* Username guide */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Username Format</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
                {Object.entries({ dr: "Director", ht: "Head Teacher", ct: "Class Teacher", st: "Subj. Teacher", bsr: "Bursar" }).map(
                  ([code, label]) => (
                    <div key={code} className="flex items-center gap-1.5">
                      <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-blue-700">{code}</code>
                      <span className="text-slate-500">→ {label}</span>
                    </div>
                  )
                )}
              </div>
              <p className="mt-2.5 text-xs text-slate-500 border-t border-slate-200 pt-2">
                Example: <code className="bg-white px-1 rounded text-blue-600">dr-eds</code> = Director, EDS school
              </p>
            </div>
          </div>

          <div className="px-8 xl:px-10 py-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              Support: <span className="font-medium text-gray-500">0742 751 956</span>
            </p>
          </div>
        </aside>

        {/* ── Right: Demo accounts ── */}
        <main className="flex-1 overflow-y-auto p-6 xl:p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Demo Accounts</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Click <strong>Log In</strong> on any card to access instantly — password for all demos is{" "}
                  <code className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">demo123</code>
                </p>
              </div>
            </div>

            {staffAccounts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {schoolNames.map((schoolName) => {
                  const accounts = staffAccounts.filter((a) => a.schoolName === schoolName);
                  const code = accounts[0]?.schoolCode;
                  return (
                    <section key={schoolName}>
                      {/* School header row */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-900 to-slate-800 text-white rounded-full pl-2 pr-3 py-1">
                          <EduPayLogo size={22} />
                          <span className="text-xs font-bold tracking-wide">{code}</span>
                        </div>
                        <h4 className="font-semibold text-gray-800 text-sm">{schoolName}</h4>
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Account cards grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {accounts.map((acc) => {
                          const style = ROLE_STYLE[acc.role] || {
                            pill: "bg-gray-100 text-gray-700",
                            btn: "bg-gray-500 hover:bg-gray-600",
                            card: "border-gray-100 bg-gray-50/40",
                          };
                          const isActive = activeUsername === acc.username;

                          return (
                            <div
                              key={acc.username}
                              className={`rounded-2xl border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${style.card}`}
                            >
                              {/* Role pill + name */}
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.pill}`}>
                                  {ROLE_LABELS[acc.role] || acc.role}
                                </span>
                                <span className="text-xs text-gray-400 text-right leading-tight">{acc.name}</span>
                              </div>

                              {/* Credential rows */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Username</span>
                                  <code className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono text-gray-800">
                                    {acc.username}
                                  </code>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Password</span>
                                  <code className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded font-mono text-gray-800">
                                    demo123
                                  </code>
                                </div>
                              </div>

                              {/* Login button */}
                              <button
                                onClick={() => handleSignIn(acc.username, "demo123", ROLE_LABELS[acc.role])}
                                disabled={loading}
                                className={`mt-auto w-full h-9 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${style.btn} disabled:opacity-60`}
                              >
                                {isActive ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing in...</>
                                ) : (
                                  <>Log In <ArrowRight className="w-3.5 h-3.5" /></>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                {/* Footer note */}
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 text-center">
                  <strong>Super Admin</strong> credentials are managed privately by SKYVALE Technologies.
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
