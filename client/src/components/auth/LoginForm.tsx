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
import { ZaabuPayLogo } from "@/components/ui/ZaabuPayLogo";
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
}

const ROLE_LABELS: Record<string, string> = {
  director:        "Director",
  head_teacher:    "Head Teacher",
  class_teacher:   "Class Teacher",
  subject_teacher: "Subject Teacher",
  bursar:          "Bursar",
  super_admin:     "Super Admin",
};

const ROLE_STYLE: Record<string, { pill: string; btn: string; card: string; icon: string }> = {
  director:        { pill: "bg-orange-100 text-orange-700",   btn: "bg-orange-500 hover:bg-orange-600 text-white",   card: "border-orange-200 bg-orange-50",   icon: "🏫" },
  head_teacher:    { pill: "bg-blue-100 text-blue-700",       btn: "bg-blue-500 hover:bg-blue-600 text-white",       card: "border-blue-200 bg-blue-50",       icon: "📚" },
  class_teacher:   { pill: "bg-emerald-100 text-emerald-700", btn: "bg-emerald-500 hover:bg-emerald-600 text-white", card: "border-emerald-200 bg-emerald-50", icon: "🎓" },
  subject_teacher: { pill: "bg-purple-100 text-purple-700",   btn: "bg-purple-500 hover:bg-purple-600 text-white",   card: "border-purple-200 bg-purple-50",   icon: "📝" },
  bursar:          { pill: "bg-teal-100 text-teal-700",       btn: "bg-teal-500 hover:bg-teal-600 text-white",       card: "border-teal-200 bg-teal-50",       icon: "💰" },
  super_admin:     { pill: "bg-slate-700 text-white",         btn: "bg-slate-700 hover:bg-slate-800 text-white",     card: "border-slate-300 bg-slate-50",     icon: "⚙️" },
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

const getPassword = (_role: string) => "demo123";

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });


  const HARDCODED_DEMOS: StaffAccount[] = [
    { username: "dr-eds",  role: "director",        name: "Sarah Director",      schoolCode: "EDS" },
    { username: "ht-eds",  role: "head_teacher",    name: "Samuel Kato",         schoolCode: "EDS" },
    { username: "ct-eds",  role: "class_teacher",   name: "Grace Nakato",        schoolCode: "EDS" },
    { username: "st-eds",  role: "subject_teacher", name: "David Mugisha",       schoolCode: "EDS" },
    { username: "bsr-eds", role: "bursar",          name: "Christine Nabukeera", schoolCode: "EDS" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const [ur, sr] = await Promise.all([fetch("/api/users"), fetch("/api/schools")]);
        if (!ur.ok || !sr.ok) throw new Error("Failed");
        const users: any[] = await ur.json();
        const schools: any[] = await sr.json();
        const schoolMap: Record<string, string> = Object.fromEntries(schools.map((s) => [s.id, s.abbreviation]));
        const roleOrder = ["director", "head_teacher", "class_teacher", "subject_teacher", "bursar"];
        const seen = new Set<string>();
        const list: StaffAccount[] = [];
        for (const role of roleOrder) {
          const u = users.find((x) => x.role === role && x.username);
          if (u && !seen.has(role)) {
            seen.add(role);
            list.push({ username: u.username, role: u.role, name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(), schoolCode: schoolMap[u.school_id] ?? "EDS" });
          }
        }
        setAccounts(list.length > 0 ? list : HARDCODED_DEMOS);
      } catch {
        setAccounts(HARDCODED_DEMOS);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-blue-900 to-slate-900 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <ZaabuPayLogo size={56} variant="dark" />
          <span className="text-xs text-blue-300 border border-blue-500/40 rounded px-2 py-0.5 font-medium ml-2">
            Demo Portal
          </span>
        </div>
        <Link href="/login">
          <Button size="sm" variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-transparent text-xs h-8">
            ← Staff Login
          </Button>
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Login Form ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter credentials manually, or click <strong>Log In</strong> on a demo card below
            </p>

            <form
              onSubmit={form.handleSubmit((d) => handleSignIn(d.username, d.password))}
              className="space-y-4"
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
                    className="h-11 pl-10 font-mono text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
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
                    className="h-11 pl-10 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
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
          </div>
        </div>

        {/* ── Demo Accounts Grid ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Demo Accounts</h3>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">
              All demo accounts use password:{" "}
              <code className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">demo123</code>
            </span>
          </div>

          {accounts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const style = ROLE_STYLE[acc.role] ?? ROLE_STYLE.subject_teacher;
                const isActive = activeUsername === acc.username;
                const pwd = getPassword(acc.role);

                return (
                  <div
                    key={acc.username}
                    className={`rounded-2xl border-2 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all ${style.card}`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{style.icon}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.pill}`}>
                          {ROLE_LABELS[acc.role]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{acc.schoolCode}</span>
                    </div>

                    {/* Name */}
                    <p className="text-sm font-semibold text-gray-800 -mt-1">{acc.name || "—"}</p>

                    {/* Credentials */}
                    <div className="bg-white/70 rounded-xl border border-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 shrink-0">Username</span>
                        <code className="text-xs font-mono text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded truncate">
                          {acc.username}
                        </code>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 shrink-0">Password</span>
                        <code className="text-xs font-mono text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded">
                          {pwd}
                        </code>
                      </div>
                    </div>

                    {/* Login button */}
                    <button
                      onClick={() => handleSignIn(acc.username, pwd, ROLE_LABELS[acc.role])}
                      disabled={loading}
                      className={`w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${style.btn}`}
                    >
                      {isActive ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                      ) : (
                        <>Log In as {ROLE_LABELS[acc.role]} <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Phone className="w-3 h-3" />
            Support: <span className="font-medium text-gray-500">0742 751 956</span>
            <span className="mx-2">·</span>
            <span>SKYVALE Technologies Uganda Limited</span>
          </p>
        </div>
      </div>
    </div>
  );
};
