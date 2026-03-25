import { useState } from "react";
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
import { Lock, User, Phone, ArrowRight } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

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

export default function OfficialLogin() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleSignIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      const authUser = await signIn(username, password);
      const profile = await getUserProfile(authUser.uid);
      if (!profile) throw new Error("Account not found. Please contact your administrator.");
      toast({ title: `Welcome, ${profile.firstName}!`, description: "Loading your dashboard..." });
      setTimeout(() => navigate(redirectForRole(profile.role ?? "")), 300);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Left Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[480px] flex-col relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/5 blur-2xl" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center">
            <ZaabuPayLogo size={68} variant="dark" />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              School Management<br />
              <span className="text-sky-300">Made Simple</span>
            </h1>
            <p className="text-blue-200 text-base leading-relaxed mb-10">
              The all-in-one platform built for Ugandan schools — manage fees, marks, attendance and more.
            </p>

            <div className="space-y-4">
              {[
                { icon: "💳", label: "Mobile money fee collection" },
                { icon: "📊", label: "Marks & report card generation" },
                { icon: "📋", label: "Attendance tracking" },
                { icon: "🏫", label: "Multi-school management" },
                { icon: "📶", label: "Works offline too" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-blue-100 text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs">
            <p className="text-[#C9A85C]/80">SKYVALE Technologies Uganda Limited</p>
            <p className="mt-1 text-blue-400">zaabupayapp.com</p>
          </div>
        </div>
      </div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex items-center">
          <ZaabuPayLogo size={64} variant="light" />
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in to your school dashboard</p>
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
                  placeholder="e.g., dr-eds, ht-hs"
                  {...form.register("username")}
                  className="h-12 pl-11 font-mono text-sm bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                  autoFocus
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.username.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                Format: <code className="bg-gray-100 px-1 rounded">role-schoolcode</code> — e.g., dr-eds (Director of EDS)
              </p>
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
                  placeholder="Enter your password"
                  {...form.register("password")}
                  className="h-12 pl-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-md shadow-blue-500/20 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Demo link */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-700 font-medium mb-2">Exploring ZaabuPay?</p>
            <Link href="/demo-login">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 underline underline-offset-2">
                View demo accounts for all roles
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Phone className="w-3 h-3" />
              Need help? Call <span className="font-medium text-gray-500">0742 751 956</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
