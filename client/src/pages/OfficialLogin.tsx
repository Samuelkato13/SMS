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
import { Phone, Lock, User } from "lucide-react";

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
      toast({ title: `Welcome back, ${profile.firstName}!`, description: "Redirecting to your dashboard..." });
      setTimeout(() => navigate(redirectForRole(profile.role ?? "")), 300);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a1628] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative z-10 text-center">
          <img src="/logo.png" alt="EduPay" className="h-32 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-white mb-3">EduPay</h1>
          <p className="text-blue-300 text-lg mb-8">School Management System</p>
          <div className="space-y-4 text-left">
            {[
              "Multi-school management",
              "Fees & mobile money payments",
              "Marks, exams & report cards",
              "Attendance tracking",
              "Works offline too",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-gray-300">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-12 text-center">
          <p className="text-gray-500 text-xs">Powered by SKYVALE Technologies Uganda Limited</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="bg-[#0a1628] rounded-2xl p-4 inline-block mb-3">
            <img src="/logo.png" alt="EduPay" className="h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduPay</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1 text-sm">Sign in to access your school dashboard</p>
          </div>

          <form onSubmit={form.handleSubmit((d) => handleSignIn(d.username, d.password))} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g., dr-eds, ht-hs"
                  {...form.register("username")}
                  className="h-12 pl-10 bg-white border-gray-300 focus:border-blue-500 font-mono text-sm"
                  autoFocus
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-red-600">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register("password")}
                  className="h-12 pl-10 bg-white border-gray-300 focus:border-blue-500"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-lg"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to explore first?{" "}
              <Link href="/demo-login" className="text-blue-600 hover:text-blue-700 font-medium">
                View demo accounts →
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Phone className="w-3 h-3" />
              Need help? Call 0742 751 956
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
