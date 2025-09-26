import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn, isDemoMode } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BookOpen, User } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAsAdmin = async () => {
    setLoading(true);
    try {
      await signIn("admin@demo.com", "demo123");
      toast({
        title: "Success",
        description: "Logged in as Admin for demo",
      });
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-blue-50">
      <Card className="w-full max-w-md glassmorphism border-white/20 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">EduManage Pro</h1>
            <p className="text-gray-600 mt-2">Modern School Management System</p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
                className="h-12 border-gray-300 focus:ring-primary focus:border-primary"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register('password')}
                className="h-12 border-gray-300 focus:ring-primary focus:border-primary"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary hover:text-primary/80">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-medium"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {isDemoMode() && (
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Demo Mode Active</p>
                <p className="text-xs text-gray-500 mt-1">No Firebase setup required</p>
              </div>
              
              <Button 
                type="button" 
                onClick={quickLoginAsAdmin}
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium"
                disabled={loading}
                data-testid="button-quick-admin-login"
              >
                <User className="w-4 h-4 mr-2" />
                {loading ? 'Logging in...' : 'Quick Login as Admin'}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Available Demo Accounts:</p>
                <div className="space-y-1 text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between">
                    <span><strong>Admin:</strong> admin@demo.com</span>
                    <span className="text-gray-400">demo123</span>
                  </div>
                  <div className="flex justify-between">
                    <span><strong>Director:</strong> director@demo.com</span>
                    <span className="text-gray-400">demo123</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
