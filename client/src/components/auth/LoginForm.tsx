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
import { Badge } from "@/components/ui/badge";
import { GraduationCap, User, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  {
    username: "dr-eds",
    role: "Director",
    color: "bg-orange-600 hover:bg-orange-700",
    description: "School-level management",
  },
  {
    username: "ht-eds",
    role: "Head Teacher",
    color: "bg-blue-600 hover:bg-blue-700",
    description: "Academic oversight",
  },
  {
    username: "ct-eds",
    role: "Class Teacher",
    color: "bg-green-600 hover:bg-green-700",
    description: "Class management",
  },
  {
    username: "st-eds",
    role: "Subject Teacher",
    color: "bg-purple-600 hover:bg-purple-700",
    description: "Marks management",
  },
  {
    username: "bsr-eds",
    role: "Bursar",
    color: "bg-teal-600 hover:bg-teal-700",
    description: "Fee collection",
  },
];

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
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleSignIn = async (
    username: string,
    password: string,
    roleLabel?: string,
  ) => {
    setLoading(true);
    try {
      const authUser = await signIn(username, password);
      const profile = await getUserProfile(
        authUser.uid,
        authUser.email ?? undefined,
      );
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
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl inline-flex">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EduPay
              </h1>
              <p className="text-gray-500 mt-1">School Management Platform</p>
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
                  className="h-11"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.username.message}
                  </p>
                )}
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

              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <div key={account.username} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-600" />
                        <span className="font-bold text-gray-800 text-sm">{account.role}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{account.description}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="text-gray-600">Username:</span>
                      <code className="bg-white px-1.5 py-0.5 rounded font-mono text-gray-700 border border-gray-200">{account.username}</code>
                      <span className="text-gray-600">Pass:</span>
                      <code className="bg-white px-1.5 py-0.5 rounded font-mono text-gray-700 border border-gray-200">demo123</code>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        handleSignIn(account.username, "demo123", account.role)
                      }
                      className={`w-full h-8 text-white text-xs font-medium ${account.color}`}
                      disabled={loading}
                    >
                      Sign In
                    </Button>
                  </div>
                ))}
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
