import { useState, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Archive, Upload, Download, Users2, ChevronLeft, ChevronRight, RotateCcw, ArrowRightSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PAGE_SIZE = 15;
const emptyForm = { firstName: '', lastName: '', dateOfBirth: '', gender: 'Male', classId: '', guardianName: '', guardianPhone: '', guardianEmail: '', medicalNotes: '' };

export default function StudentManagement() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [archiveTarget, setArchiveTarget] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [promoteClassId, setPromoteClassId] = useState('');

  const { data: students = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/students', schoolId], queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ['/api/classes', schoolId], queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/students', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/students', schoolId] }); toast({ title: 'Student added' }); setShowForm(false); setForm(emptyForm); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => apiRequest('PUT', `/api/students/${id}`, { isActive: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/students', schoolId] }); toast({ title: 'Student archived' }); setArchiveTarget(null); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => apiRequest('PUT', `/api/students/${id}`, { isActive: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/students', schoolId] }); toast({ title: 'Student restored' }); },
  });

  const promoteMut = useMutation({
    mutationFn: ({ ids, classId }: { ids: string[]; classId: string }) =>
      Promise.all(ids.map(id => apiRequest('PUT', `/api/students/${id}`, { classId }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/students', schoolId] }); toast({ title: `${selected.length} student(s) promoted` }); setShowPromote(false); setSelected([]); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const filtered = students.filter((s: any) => {
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.payment_code ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === 'all' || s.class_id === classFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? s.is_active !== false : s.is_active === false);
    return matchSearch && matchClass && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSelect = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === paged.length ? [] : paged.map((s: any) => s.id));

  const exportCSV = () => {
    const rows = [['Adm No', 'First Name', 'Last Name', 'Gender', 'Class', 'Parent', 'Phone', 'Status'],
      ...students.map((s: any) => [s.payment_code, s.first_name, s.last_name, s.gender, s.class_id, s.parent_name, s.parent_phone, s.is_active !== false ? 'Active' : 'Archived'])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'students.csv'; a.click();
  };

  const handleSave = () => {
    if (!form.firstName || !form.classId) return toast({ variant: 'destructive', title: 'Name and class required' });
    createMut.mutate({ ...form, schoolId });
  };

  const getClassName = (classId: string) => classes.find((c: any) => c.id === classId)?.name ?? '—';

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Student Management</h1>
            <p className="text-sm text-gray-500">{students.filter((s: any) => s.is_active !== false).length} active students</p>
          </div>
          <div className="flex gap-2">
            {selected.length > 0 && (
              <Button variant="outline" onClick={() => setShowPromote(true)} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                <ArrowRightSquare className="w-4 h-4" />Promote ({selected.length})
              </Button>
            )}
            <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" />Export</Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={() => toast({ title: 'CSV import', description: 'Upload processed (demo)' })} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2"><Upload className="w-4 h-4" />Import</Button>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />Add Student</Button>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search students..." className="pl-9 h-9" />
              </div>
              <Select value={classFilter} onValueChange={v => { setClassFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded" checked={selected.length === paged.length && paged.length > 0} onChange={toggleAll} /></th>
                    {['Adm No', 'Name', 'Class', 'Parent/Guardian', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                  )) : paged.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400"><Users2 className="w-8 h-8 mx-auto mb-2 opacity-40" />No students found</td></tr>
                  ) : paged.map((s: any) => (
                    <tr key={s.id} className={`hover:bg-gray-50/60 ${s.is_active === false ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3"><input type="checkbox" className="rounded" checked={selected.includes(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.payment_code ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-xs font-bold">{(s.first_name ?? 'S')[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400">{s.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{getClassName(s.class_id)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs text-gray-700">{s.guardian_name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{s.guardian_phone ?? ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge className={s.is_active !== false ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-100 text-gray-500 text-xs'}>{s.is_active !== false ? 'Active' : 'Archived'}</Badge></td>
                      <td className="px-4 py-3">
                        {s.is_active !== false
                          ? <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(s)} className="h-7 w-7 p-0 text-gray-400 hover:text-orange-500"><Archive className="w-3.5 h-3.5" /></Button>
                          : <Button variant="ghost" size="sm" onClick={() => restoreMut.mutate(s.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-green-600"><RotateCcw className="w-3.5 h-3.5" /></Button>
                        }
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

      {/* Add student dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="w-full"><TabsTrigger value="personal" className="flex-1">Personal</TabsTrigger><TabsTrigger value="parent" className="flex-1">Parent/Guardian</TabsTrigger><TabsTrigger value="other" className="flex-1">Other</TabsTrigger></TabsList>
            <TabsContent value="personal" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Class *</Label>
                <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="parent" className="space-y-3 pt-3">
              <div className="space-y-1"><Label>Parent/Guardian Name</Label><Input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} placeholder="+256 700 000000" /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.guardianEmail} onChange={e => setForm(f => ({ ...f, guardianEmail: e.target.value }))} /></div>
            </TabsContent>
            <TabsContent value="other" className="space-y-3 pt-3">
              <div className="space-y-1"><Label>Medical Notes</Label><Input value={form.medicalNotes} onChange={e => setForm(f => ({ ...f, medicalNotes: e.target.value }))} placeholder="Allergies, conditions..." /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMut.isPending ? 'Saving...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive Student</AlertDialogTitle>
            <AlertDialogDescription>Archive {archiveTarget?.first_name} {archiveTarget?.last_name}? The record will be preserved and can be restored later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-600 hover:bg-orange-700" onClick={() => archiveMut.mutate(archiveTarget?.id)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote dialog */}
      <Dialog open={showPromote} onOpenChange={setShowPromote}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Promote {selected.length} Student(s)</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Select the new class for the selected students:</p>
            <Select value={promoteClassId} onValueChange={setPromoteClassId}>
              <SelectTrigger><SelectValue placeholder="Select new class" /></SelectTrigger>
              <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromote(false)}>Cancel</Button>
            <Button onClick={() => { if (promoteClassId) promoteMut.mutate({ ids: selected, classId: promoteClassId }); }} disabled={!promoteClassId || promoteMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {promoteMut.isPending ? 'Promoting...' : 'Promote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
