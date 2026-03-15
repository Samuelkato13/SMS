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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Lock, Phone } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
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
    defaultValues: { email: "", password: "" },
  });

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const authUser = await signIn(email, password);
      const profile = await getUserProfile(authUser.uid, authUser.email ?? undefined);
      if (!profile) throw new Error("Account not found. Please contact your administrator.");
      const dest = redirectForRole(profile.role ?? "");
      toast({
        title: "Welcome back!",
        description: `Signed in as ${profile.firstName} ${profile.lastName}`,
      });
      setTimeout(() => navigate(dest), 200);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="w-full max-w-md space-y-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to EduPay
          </Button>
        </Link>

        <Card className="border-0 shadow-2xl bg-white">
          <CardHeader className="text-center space-y-4 pb-2 pt-8">
            <div className="mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl inline-flex shadow-lg">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EduPay
              </h1>
              <p className="text-gray-500 mt-1 text-sm">School Management Platform</p>
              <p className="text-gray-400 text-xs mt-0.5">by SKYVALE Technologies Uganda Limited</p>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-gray-800">Staff Sign In</h2>
              <p className="text-sm text-gray-500 mt-1">Enter the credentials provided by your school administrator</p>
            </div>

            <form
              onSubmit={form.handleSubmit((d) => handleSignIn(d.email, d.password))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yourschool.com"
                  {...form.register("email")}
                  className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  {...form.register("password")}
                  className="h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Sign In to EduPay
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="bg-blue-50 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-800 mb-1">Need help signing in?</p>
                <p className="text-blue-700 mb-2">
                  Contact your school director or the EduPay support team.
                </p>
                <div className="flex items-center gap-2 text-blue-600">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">0742 751 956</span>
                  <span className="text-blue-400">|</span>
                  <a href="mailto:support@edupayapp.com" className="hover:underline">
                    support@edupayapp.com
                  </a>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Want to try EduPay first?{" "}
                  <Link href="/demo-login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Access the demo
                  </Link>
                  {" "}or{" "}
                  <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                    request access
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} SKYVALE Technologies Uganda Limited · edupayapp.com
        </p>
      </div>
    </div>
  );
}
