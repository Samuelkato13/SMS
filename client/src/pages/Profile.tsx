import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, User as UserIcon, Mail, Phone, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'System Admin',
  director: 'Director',
  head_teacher: 'Head Teacher',
  class_teacher: 'Class Teacher',
  subject_teacher: 'Subject Teacher',
  bursar: 'Bursar',
};

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/auth/change-password', {
        userId: profile?.id,
        currentPassword,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: any) => {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to change password';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please confirm your new password.',
        variant: 'destructive',
      });
      return;
    }
    changePasswordMutation.mutate();
  };

  const initials = `${profile?.firstName?.charAt(0) ?? ''}${profile?.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and security settings</p>
      </div>

      {/* ── Account info ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" /> Account Information
          </CardTitle>
          <CardDescription>Your profile details on ZaabuPay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold">
              {initials || <UserIcon className="w-7 h-7" />}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {profile?.firstName} {profile?.lastName}
              </p>
              {profile?.role && (
                <Badge className="mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                  {ROLE_LABEL[profile.role] ?? profile.role}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Username" value={profile?.username} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={profile?.email} />
            <InfoRow
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Role"
              value={profile?.role ? ROLE_LABEL[profile.role] ?? profile.role : '-'}
            />
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Status"
              value={profile?.isActive === false ? 'Inactive' : 'Active'}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Change password ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </CardTitle>
          <CardDescription>
            New accounts start with the default password <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Password@2026!</code>. We recommend changing it after your first sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <PasswordField
              id="currentPassword"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)}
            />
            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              helper="At least 8 characters. Use a mix of letters, numbers and symbols."
            />
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((s) => !s)}
            />

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full sm:w-auto"
            >
              {changePasswordMutation.isPending ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value || '-'}</p>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  helper,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  helper?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className="pr-10"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
}
