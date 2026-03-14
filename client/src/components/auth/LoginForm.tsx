import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { signIn, isDemoMode } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, User, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', role: 'Admin', color: 'bg-red-600 hover:bg-red-700', description: 'Full system access, manage all schools' },
  { email: 'director@demo.com', role: 'Director', color: 'bg-orange-600 hover:bg-orange-700', description: 'School-level management' },
  { email: 'headteacher@demo.com', role: 'Head Teacher', color: 'bg-blue-600 hover:bg-blue-700', description: 'Academic oversight' },
  { email: 'classteacher@demo.com', role: 'Class Teacher', color: 'bg-green-600 hover:bg-green-700', description: 'Class & attendance management' },
  { email: 'subjectteacher@demo.com', role: 'Subject Teacher', color: 'bg-purple-600 hover:bg-purple-700', description: 'Marks & subject management' },
  { email: 'bursar@demo.com', role: 'Bursar', color: 'bg-teal-600 hover:bg-teal-700', description: 'Fee collection & payments' },
];

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      toast({ title: "Welcome back!", description: "Redirecting to your dashboard..." });
      setTimeout(() => navigate('/dashboard'), 200);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string, role: string) => {
    setLoading(true);
    try {
      await signIn(email, "demo123");
      toast({ title: `Welcome, ${role}!`, description: "Loading your dashboard..." });
      setTimeout(() => navigate('/dashboard'), 200);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Login Failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md space-y-4">
        {/* Back to landing */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 mb-2">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...form.register('email')}
                  className="h-11"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register('password')}
                  className="h-11"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {isDemoMode() && (
              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-gray-400 font-medium">Demo Mode — Try Any Role</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <Button 
                      key={account.email}
                      type="button" 
                      onClick={() => quickLogin(account.email, account.role)}
                      className={`h-auto py-2 px-3 text-white text-xs font-medium flex flex-col items-start gap-0.5 ${account.color}`}
                      disabled={loading}
                    >
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-bold">{account.role}</span>
                      </div>
                      <span className="text-white/80 text-[10px] leading-tight text-left">{account.description}</span>
                    </Button>
                  ))}
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-blue-700 mb-1">Demo Credentials</p>
                  <p className="text-blue-600">All accounts use password: <strong>demo123</strong></p>
                  <p className="text-gray-500 mt-1">Click any role button above for instant access</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <a href="#demo" className="text-blue-600 hover:text-blue-700 font-medium">
            Request access at edupay.com
          </a>
        </p>
      </div>
    </div>
  );
};
