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
import { ArrowLeft, Phone } from "lucide-react";

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
      const dest = redirectForRole(profile.role ?? "");
      toast({
        title: "Welcome back!",
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
            Back to Home
          </Button>
        </Link>

        <Card className="border border-blue-100 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-3">
            <img src="/logo.png" alt="EduPay" className="h-16 mx-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">EduPay</h1>
              <p className="text-gray-600 text-sm mt-1">School Management System</p>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form
              onSubmit={form.handleSubmit((d) =>
                handleSignIn(d.username, d.password)
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
                  autoFocus
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

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-center text-xs text-gray-600 mb-3">
                New user? Try the demo with test accounts
              </p>
              <Link href="/demo-login">
                <Button variant="outline" className="w-full h-10">
                  View Demo Accounts
                </Button>
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" />
                Support: 0742 751 956
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
