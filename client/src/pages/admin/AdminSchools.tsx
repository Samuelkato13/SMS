import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Ban, Trash2, ChevronLeft, ChevronRight, School, MoreHorizontal, Landmark, Image, Copy, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-200',
  trial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  suspended: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
};
const PLAN_COLORS: Record<string, string> = {
  enterprise: 'bg-purple-100 text-purple-700',
  professional: 'bg-blue-100 text-blue-700',
  basic: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
};

const PAGE_SIZE = 10;

const SCHOOL_TYPES = [
  { value: 'nursery',          label: 'Nursery Only' },
  { value: 'primary',          label: 'Primary Only' },
  { value: 'secondary',        label: 'Secondary Only' },
  { value: 'nursery_primary',  label: 'Nursery & Primary' },
  { value: 'primary_secondary',label: 'Primary & Secondary' },
  { value: 'all',              label: 'Nursery, Primary & Secondary' },
];

const SECTION_TYPES = [
  { value: 'day',         label: 'Day Only' },
  { value: 'boarding',    label: 'Boarding Only' },
  { value: 'day_boarding',label: 'Day & Boarding' },
];

const emptyForm = {
  name: '', abbreviation: '', subdomain: '', email: '', phone: '', address: '',
  status: 'trial', motto: '', schoolType: '', sectionType: '', logoUrl: '',
  bankName: '', bankAccountTitle: '', bankAccountType: '', bankAccountNumber: '',
  directorFirstName: '', directorLastName: '', directorEmail: '', directorPassword: '',
};

export default function AdminSchools() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState<{ action: 'suspend' | 'delete'; school: any } | null>(null);
  const [showCreds, setShowCreds] = useState<any>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!' });
  };

  const { data: schools = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/admin/schools'] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/schools', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'School created successfully' });
      setShowForm(false);
      setForm(emptyForm);
      if (data.directorCredentials) setShowCreds({ schoolName: data.name, ...data.directorCredentials });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest('PUT', `/api/admin/schools/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      toast({ title: 'School updated successfully' });
      setShowForm(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest('PUT', `/api/admin/schools/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      toast({ title: 'School status updated' });
      setConfirm(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/schools/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'School deleted' });
      setConfirm(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const filtered = schools.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.subdomain?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name ?? '', abbreviation: s.abbreviation ?? '', subdomain: s.subdomain ?? '',
      email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', status: s.status ?? 'active',
      motto: s.motto ?? '', schoolType: s.school_type ?? '', sectionType: s.section_type ?? '', logoUrl: s.logo_url ?? '',
      bankName: s.bank_name ?? '', bankAccountTitle: s.bank_account_title ?? '',
      bankAccountType: s.bank_account_type ?? '', bankAccountNumber: s.bank_account_number ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) return toast({ variant: 'destructive', title: 'School name and email are required' });
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Schools Management</h1>
            <p className="text-sm text-gray-500">{schools.length} school{schools.length !== 1 ? 's' : ''} on the platform</p>
          </div>
          <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />
            Add New School
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search schools..." className="pl-9 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">School</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subdomain</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Users</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={7} className="px-5 py-3">
                        <div className="animate-pulse h-4 bg-gray-100 rounded" />
                      </td></tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                      <School className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No schools found
                    </td></tr>
                  ) : paged.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.abbreviation} className="w-8 h-8 rounded-lg object-contain border border-gray-100" />
                          ) : (
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 text-xs font-bold">{(s.abbreviation ?? s.name ?? 'S').slice(0, 2)}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.subdomain || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {s.school_type ? (
                            <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {SCHOOL_TYPES.find(t => t.value === s.school_type)?.label ?? s.school_type}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                          {s.section_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap border ${
                              s.section_type === 'boarding' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              s.section_type === 'day_boarding' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }`}>
                              {SECTION_TYPES.find(t => t.value === s.section_type)?.label ?? s.section_type}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{s.user_count ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${PLAN_COLORS[s.plan ?? 'trial']}`}>{s.plan ?? 'trial'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border ${STATUS_COLORS[s.status ?? 'active']}`}>{s.status ?? 'active'}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirm({ action: 'suspend', school: s })}
                              className="text-yellow-700"
                            >
                              <Ban className="w-3.5 h-3.5 mr-2" />
                              {s.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirm({ action: 'delete', school: s })}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit School' : 'Add New School'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className={`w-full grid mb-3 ${editing ? 'grid-cols-3' : 'grid-cols-4'}`}>
              <TabsTrigger value="general" className="text-xs gap-1"><School className="w-3 h-3" />General</TabsTrigger>
              {!editing && <TabsTrigger value="director" className="text-xs gap-1"><User className="w-3 h-3" />Director</TabsTrigger>}
              <TabsTrigger value="identity" className="text-xs gap-1"><Image className="w-3 h-3" />Identity</TabsTrigger>
              <TabsTrigger value="bank" className="text-xs gap-1"><Landmark className="w-3 h-3" />Bank</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>School Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="St. Mary's School" />
                </div>
                <div className="space-y-1">
                  <Label>Abbreviation</Label>
                  <Input value={form.abbreviation} onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value }))} placeholder="SMS" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>School Type</Label>
                  <Select value={form.schoolType} onValueChange={v => setForm(f => ({ ...f, schoolType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {SCHOOL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Section Type</Label>
                  <Select value={form.sectionType} onValueChange={v => setForm(f => ({ ...f, sectionType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Day / Boarding..." /></SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Subdomain</Label>
                <Input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="stmarys" />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@school.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000000" />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Kampala, Uganda" />
              </div>
            </TabsContent>

            {/* Director Tab (new school only) */}
            {!editing && (
              <TabsContent value="director" className="space-y-3 mt-0">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  A Director account will be created automatically. Fill in details or leave blank to use school email and auto-generate a password.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Director First Name</Label>
                    <Input value={form.directorFirstName} onChange={e => setForm(f => ({ ...f, directorFirstName: e.target.value }))} placeholder="e.g. John" />
                  </div>
                  <div className="space-y-1">
                    <Label>Director Last Name</Label>
                    <Input value={form.directorLastName} onChange={e => setForm(f => ({ ...f, directorLastName: e.target.value }))} placeholder="e.g. Mukasa" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Director Email (defaults to school email)</Label>
                  <Input type="email" value={form.directorEmail} onChange={e => setForm(f => ({ ...f, directorEmail: e.target.value }))} placeholder="director@school.com (optional)" />
                </div>
                <div className="space-y-1">
                  <Label>Temporary Password (auto-generated if blank)</Label>
                  <Input type="text" value={form.directorPassword} onChange={e => setForm(f => ({ ...f, directorPassword: e.target.value }))} placeholder="Leave blank to auto-generate" />
                </div>
              </TabsContent>
            )}

            {/* Identity Tab */}
            <TabsContent value="identity" className="space-y-3 mt-0">
              <div className="space-y-1">
                <Label>School Motto</Label>
                <Input value={form.motto} onChange={e => setForm(f => ({ ...f, motto: e.target.value }))} placeholder="e.g. Excellence in Education" />
              </div>
              <div className="space-y-1">
                <Label>Logo URL</Label>
                <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://school.com/logo.png" />
                <p className="text-xs text-gray-400">Paste a direct image URL (JPEG or PNG). Used in printouts and reports.</p>
              </div>
              {form.logoUrl && (
                <div className="p-3 border rounded-lg bg-gray-50 flex items-center gap-3">
                  <img src={form.logoUrl} alt="Logo preview" className="w-14 h-14 object-contain rounded border bg-white" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                  <span className="text-xs text-gray-500">Logo preview</span>
                </div>
              )}
            </TabsContent>

            {/* Bank Tab */}
            <TabsContent value="bank" className="space-y-3 mt-0">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Bank details are used on fee receipts, report cards, and payment instructions printed for parents.
              </p>
              <div className="space-y-1">
                <Label>Bank Name</Label>
                <Input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. Stanbic Bank Uganda" />
              </div>
              <div className="space-y-1">
                <Label>Account Title (Name)</Label>
                <Input value={form.bankAccountTitle} onChange={e => setForm(f => ({ ...f, bankAccountTitle: e.target.value }))} placeholder="e.g. St. Mary's Primary School" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Account Type</Label>
                  <Select value={form.bankAccountType} onValueChange={v => setForm(f => ({ ...f, bankAccountType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Account</SelectItem>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} placeholder="9030012345678" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Director Credentials Dialog */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-green-700">School & Director Account Created!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these login details with the director of <strong>{showCreds?.schoolName}</strong>:
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
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-blue-700">{showCreds?.email}</code>
                  <button onClick={() => copyToClipboard(showCreds?.email ?? '')}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-green-700 font-bold">{showCreds?.tempPassword}</code>
                  <button onClick={() => copyToClipboard(showCreds?.tempPassword ?? '')}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              The director should change the password after first login. The director can then add more users from their dashboard.
            </p>
            <Button className="w-full" onClick={() => setShowCreds(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === 'delete' ? 'Delete School' : 'Change School Status'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'delete'
                ? `Are you sure you want to delete "${confirm?.school?.name}"? This action cannot be undone.`
                : confirm?.school?.status === 'suspended'
                  ? `Reactivate "${confirm?.school?.name}"? They will regain access immediately.`
                  : `Suspend "${confirm?.school?.name}"? All users at this school will lose access.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirm?.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
              onClick={() => {
                if (confirm?.action === 'delete') deleteMut.mutate(confirm.school.id);
                else statusMut.mutate({ id: confirm?.school?.id, status: confirm?.school?.status === 'suspended' ? 'active' : 'suspended' });
              }}
            >
              {statusMut.isPending || deleteMut.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
