import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserX, ChevronLeft, ChevronRight, Users, Pencil, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  director: 'bg-orange-100 text-orange-700',
  head_teacher: 'bg-purple-100 text-purple-700',
  class_teacher: 'bg-green-100 text-green-700',
  subject_teacher: 'bg-teal-100 text-teal-700',
  bursar: 'bg-blue-100 text-blue-700',
  super_admin: 'bg-indigo-100 text-indigo-700',
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', director: 'Director', head_teacher: 'Head Teacher',
  class_teacher: 'Class Teacher', subject_teacher: 'Subject Teacher',
  bursar: 'Bursar', super_admin: 'Super Admin',
};
const ALL_ROLES = ['director', 'head_teacher', 'class_teacher', 'subject_teacher', 'bursar'];
const PAGE_SIZE = 15;

const emptyForm = { firstName: '', lastName: '', email: '', role: 'director', schoolId: '', password: '', username: '' };

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [showCreds, setShowCreds] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ username: '', password: '', firstName: '', lastName: '' });
  const [showPass, setShowPass] = useState(false);
  const [generatingUsername, setGeneratingUsername] = useState(false);

  const { data: users = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/admin/users'] });
  const { data: schools = [] } = useQuery<any[]>({ queryKey: ['/api/admin/schools'] });

  // Auto-generate username preview when role or school changes
  useEffect(() => {
    if (!form.role || !form.schoolId || !showCreate) return;
    setGeneratingUsername(true);
    fetch(`/api/admin/generate-username?role=${form.role}&schoolId=${form.schoolId}`)
      .then(r => r.json())
      .then(d => { if (d.username) setForm(f => ({ ...f, username: d.username })); })
      .catch(() => {})
      .finally(() => setGeneratingUsername(false));
  }, [form.role, form.schoolId, showCreate]);

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/users', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setShowCreate(false);
      setForm(emptyForm);
      setShowCreds({ username: data.username, email: data.email, tempPassword: form.password, name: `${data.first_name} ${data.last_name}`, role: data.role });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest('PUT', `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User updated successfully' });
      setEditTarget(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'User deactivated' });
      setDeactivateTarget(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const filtered = users.filter(u => {
    const matchSearch = search === '' ||
      `${u.first_name} ${u.last_name} ${u.email} ${u.username ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSchool = schoolFilter === 'all' || u.school_id === schoolFilter;
    return matchSearch && matchRole && matchSchool;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = () => {
    if (!form.firstName || !form.email || !form.schoolId || !form.password)
      return toast({ variant: 'destructive', title: 'All fields are required' });
    createMut.mutate(form);
  };

  const handleEdit = () => {
    if (!editTarget) return;
    const data: any = {};
    if (editForm.username) data.username = editForm.username;
    if (editForm.password) data.password = editForm.password;
    if (editForm.firstName) data.firstName = editForm.firstName;
    if (editForm.lastName !== undefined) data.lastName = editForm.lastName;
    editMut.mutate({ id: editTarget.id, data });
  };

  const openEdit = (u: any) => {
    setEditTarget(u);
    setEditForm({ username: u.username ?? '', password: '', firstName: u.first_name ?? '', lastName: u.last_name ?? '' });
    setShowPass(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">All Users</h1>
            <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''} across all schools</p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />Create User
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name, email or username..." className="pl-9 h-9" />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={schoolFilter} onValueChange={v => { setSchoolFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-48"><SelectValue placeholder="All Schools" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">School</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-5 py-3">
                        <div className="animate-pulse h-4 bg-gray-100 rounded" />
                      </td></tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No users found
                    </td></tr>
                  ) : paged.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 text-xs font-bold">{(u.first_name ?? 'U')[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.username ? (
                          <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{u.username}</code>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">⚠ No username</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.school_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={u.is_active ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.role !== 'super_admin' && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}
                              className="h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1 text-xs">
                              <Pencil className="w-3 h-3" />Edit
                            </Button>
                          )}
                          {u.role !== 'super_admin' && u.is_active && (
                            <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(u)}
                              className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 text-xs">
                              <UserX className="w-3 h-3" />Off
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Account</DialogTitle>
            <p className="text-xs text-gray-500 mt-1">Username is auto-generated from role + school code. You can customise it.</p>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>School *</Label>
                <Select value={form.schoolId} onValueChange={v => setForm(f => ({ ...f, schoolId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                Username
                {generatingUsername && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
              </Label>
              <Input value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                placeholder="e.g. dr-sms" className="font-mono" />
              <p className="text-xs text-gray-400">Auto-generated from role + school code. Can be changed.</p>
            </div>
            <div className="space-y-1">
              <Label>Temporary Password *</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="User logs in with this" className="pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {createMut.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User — {editTarget?.first_name} {editTarget?.last_name}</DialogTitle>
            <p className="text-xs text-gray-500 mt-1">
              Role: <strong>{ROLE_LABELS[editTarget?.role] ?? editTarget?.role}</strong> &nbsp;|&nbsp;
              School: <strong>{editTarget?.school_name ?? '—'}</strong>
            </p>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Username</Label>
              <Input value={editForm.username}
                onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                className="font-mono" placeholder="e.g. dr-sms" />
              <p className="text-xs text-gray-400">This is what the user types to log in.</p>
            </div>
            <div className="space-y-1">
              <Label>New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter new password..." className="pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editMut.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {editMut.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog — shown after user creation */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-700">User Account Created!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these login details with <strong>{showCreds?.name}</strong> ({ROLE_LABELS[showCreds?.role] ?? showCreds?.role}):
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1">zaabupayapp.com/login</code>
                  <button onClick={() => copyToClipboard("zaabupayapp.com/login")}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Username</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-indigo-700 font-bold">{showCreds?.username}</code>
                  <button onClick={() => copyToClipboard(showCreds?.username ?? '')}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Password</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-green-700 font-bold">{showCreds?.tempPassword}</code>
                  <button onClick={() => copyToClipboard(showCreds?.tempPassword ?? '')}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              Remind them to change their password after first login.
            </p>
            <Button className="w-full" onClick={() => setShowCreds(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate {deactivateTarget?.first_name} {deactivateTarget?.last_name}? They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => deactivateMut.mutate(deactivateTarget?.id)}>
              {deactivateMut.isPending ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
