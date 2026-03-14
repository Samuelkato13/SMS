import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { creatableRoles } from '@/utils/permissions';
import { UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users as UsersIcon, ShieldCheck } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  director: 'Director',
  head_teacher: 'Head Teacher',
  class_teacher: 'Class Teacher',
  subject_teacher: 'Subject Teacher',
  bursar: 'Bursar',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  director: 'bg-orange-100 text-orange-700',
  head_teacher: 'bg-blue-100 text-blue-700',
  class_teacher: 'bg-green-100 text-green-700',
  subject_teacher: 'bg-purple-100 text-purple-700',
  bursar: 'bg-teal-100 text-teal-700',
};

export default function Users() {
  const { profile } = useAuth();
  const { canCreate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const myRole = (profile?.role || 'admin') as UserRole;

  const allowedToCreate = creatableRoles[myRole] || [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    firstName: string; lastName: string; email: string;
    username: string; role: UserRole; phone: string; password: string;
  }>({
    firstName: '', lastName: '', email: '', username: '',
    role: (allowedToCreate[0] || 'class_teacher') as UserRole, phone: '', password: '',
  });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', schoolId] });
      toast({ title: 'User created successfully' });
      setOpen(false);
      setForm({ firstName: '', lastName: '', email: '', username: '', role: allowedToCreate[0] || 'class_teacher', phone: '', password: '' });
    },
    onError: (e: any) => toast({ title: 'Error creating user', description: e.message, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowedToCreate.includes(form.role as UserRole)) {
      toast({ title: 'Permission denied', description: 'You cannot create this role', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ ...form, schoolId, isActive: true });
  };

  const grouped = users.reduce((acc: any, u: any) => {
    const role = u.role || 'unknown';
    if (!acc[role]) acc[role] = [];
    acc[role].push(u);
    return acc;
  }, {});

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Users</h1>
            <p className="text-gray-500 text-sm mt-1">{users.length} staff members</p>
          </div>
          {canCreate('users') && allowedToCreate.length > 0 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Staff</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Staff Account</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name *</Label>
                      <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                    </div>
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Username *</Label>
                    <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Role *</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {allowedToCreate.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input placeholder="07XX XXX XXX" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set login password" required />
                  </div>
                  {myRole === 'head_teacher' && (
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                      As Head Teacher, you can create Class Teachers and Subject Teachers.
                    </div>
                  )}
                  {myRole === 'director' && (
                    <div className="bg-orange-50 rounded-lg p-3 text-xs text-orange-700">
                      As Director, you can create Head Teacher, Teachers, and Bursar. You cannot create another Director.
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Role summary */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(grouped).map(([role, roleUsers]: any) => (
            <div key={role} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {ROLE_LABELS[role] || role}: {roleUsers.length}
            </div>
          ))}
        </div>

        {isLoading ? (
          <Card><CardContent className="h-40 animate-pulse bg-gray-50 rounded mt-4" /></Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <UsersIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No staff accounts yet</h3>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{user.email}</TableCell>
                      <TableCell className="text-gray-500 text-sm font-mono">{user.username}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border-0 ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
