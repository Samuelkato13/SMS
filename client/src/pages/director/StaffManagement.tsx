import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
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
import { Plus, Search, Pencil, UserX, ChevronLeft, ChevronRight, Users, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ROLE_COLORS: Record<string, string> = {
  head_teacher: 'bg-purple-100 text-purple-700', class_teacher: 'bg-green-100 text-green-700',
  subject_teacher: 'bg-teal-100 text-teal-700', bursar: 'bg-blue-100 text-blue-700', admin: 'bg-red-100 text-red-700',
};
const ROLE_LABELS: Record<string, string> = {
  head_teacher: 'Head Teacher', class_teacher: 'Class Teacher', subject_teacher: 'Subject Teacher', bursar: 'Bursar', admin: 'Admin',
};
const PAGE_SIZE = 12;
const emptyForm = { firstName: '', lastName: '', email: '', role: 'class_teacher', department: '', phone: '', password: '', username: '' };

export default function StaffManagement() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [showCreds, setShowCreds] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const staff = users.filter((u: any) => u.role !== 'super_admin' && u.role !== 'director');

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast({ title: 'Copied!' }); };

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/users', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', schoolId] });
      setShowForm(false);
      setShowCreds({ username: data.username, email: data.email, tempPassword: form.password, name: `${data.first_name} ${data.last_name}`, role: data.role });
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest('PUT', `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', schoolId] });
      toast({ title: 'Staff updated' });
      setShowForm(false); setEditing(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => apiRequest('PUT', `/api/users/${id}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', schoolId] });
      toast({ title: 'Staff member deactivated' });
      setDeactivateTarget(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const filtered = staff.filter(u => {
    const matchSearch = !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ firstName: u.first_name ?? '', lastName: u.last_name ?? '', email: u.email ?? '', role: u.role ?? 'class_teacher', department: u.department ?? '', phone: u.phone ?? '', password: '', username: u.username ?? '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.firstName || !form.email) return toast({ variant: 'destructive', title: 'First name and email required' });
    if (!editing && !form.password) return toast({ variant: 'destructive', title: 'Password required for new staff' });
    if (['director', 'super_admin'].includes(form.role)) return toast({ variant: 'destructive', title: 'Cannot assign that role' });
    const payload = { ...form, schoolId };
    if (editing) updateMut.mutate({ id: editing.id, data: { ...payload, username: form.username || undefined } });
    else createMut.mutate(payload);
  };

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-500">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />Add Staff</Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search staff..." className="pl-9 h-9" />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="head_teacher">Head Teacher</SelectItem>
                  <SelectItem value="class_teacher">Class Teacher</SelectItem>
                  <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                  <SelectItem value="bursar">Bursar</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {['Name', 'Username', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                  )) : paged.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400"><Users className="w-8 h-8 mx-auto mb-2 opacity-40" />No staff found</td></tr>
                  ) : paged.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-bold">{(u.first_name ?? 'S')[0]}</span>
                          </div>
                          <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.username
                          ? <code className="text-xs bg-gray-100 text-indigo-700 px-2 py-0.5 rounded font-mono">{u.username}</code>
                          : <span className="text-xs text-red-500">⚠ No username</span>}
                      </td>
                      <td className="px-4 py-3"><Badge className={`text-xs ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role] ?? u.role}</Badge></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.department ?? '—'}</td>
                      <td className="px-4 py-3"><Badge className={u.is_active ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></Button>
                          {u.is_active && u.role !== 'director' && (
                            <Button variant="ghost" size="sm" onClick={() => setDeactivateTarget(u)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"><UserX className="w-3.5 h-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t">
                <p className="text-xs text-gray-500">{((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="h-7 w-7 p-0"><ChevronLeft className="w-3 h-3" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="h-7 w-7 p-0"><ChevronRight className="w-3 h-3" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="head_teacher">Head Teacher</SelectItem>
                  <SelectItem value="class_teacher">Class Teacher</SelectItem>
                  <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                  <SelectItem value="bursar">Bursar</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Sciences, Languages" /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000000" /></div>
            {editing && (
              <div className="space-y-1">
                <Label>Username</Label>
                <Input value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') }))}
                  className="font-mono" placeholder="e.g. ct-sms" />
                <p className="text-xs text-gray-400">This is what the user types to log in. Only change if needed.</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMut.isPending || updateMut.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog — shown after creating a new staff member */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-green-700">Staff Account Created!</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these login details with <strong>{showCreds?.name}</strong>:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1">zaabupayapp.com/login</code>
                  <button onClick={() => copyToClipboard('zaabupayapp.com/login')}><Copy size={14} className="text-gray-500" /></button>
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
              Remind them to change the password after first login.
            </p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setShowCreds(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Deactivate Staff Member</AlertDialogTitle>
            <AlertDialogDescription>Deactivate {deactivateTarget?.first_name} {deactivateTarget?.last_name}? They will lose system access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deactivateMut.mutate(deactivateTarget?.id)}>
              {deactivateMut.isPending ? 'Processing...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DirectorLayout>
  );
}
