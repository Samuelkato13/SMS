import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Search, BookOpen, UserCheck, ShieldAlert, Pencil, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLE_LABELS: Record<string,string> = {
  class_teacher: 'Class Teacher', subject_teacher: 'Subject Teacher',
  head_teacher: 'Head Teacher', admin: 'Admin', bursar: 'Bursar',
};
const ROLE_COLORS: Record<string,string> = {
  class_teacher: 'bg-blue-100 text-blue-700',
  subject_teacher: 'bg-purple-100 text-purple-700',
  head_teacher: 'bg-emerald-100 text-emerald-700',
};

const CREATABLE = ['class_teacher', 'subject_teacher'];

const emptyForm = { firstName: '', lastName: '', email: '', role: 'class_teacher', phone: '', department: '', password: '' };

export default function TeacherManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [assignDialog, setAssignDialog] = useState<'class' | 'subject' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [assignForm, setAssignForm] = useState({ teacherId: '', classId: '', subjectIds: [] as string[] });

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const teachers = users.filter((u: any) => ['class_teacher', 'subject_teacher', 'head_teacher'].includes(u.role));
  const filtered = teachers.filter((u: any) =>
    !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', schoolId] });
      toast({ title: 'Teacher account created' });
      setShowAdd(false); setForm(emptyForm);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const assignClassMut = useMutation({
    mutationFn: ({ classId, teacherId }: any) => apiRequest('PUT', `/api/classes/${classId}`, { classTeacherId: teacherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', schoolId] });
      toast({ title: 'Class teacher assigned' });
      setAssignDialog(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const assignSubjectMut = useMutation({
    mutationFn: ({ subjectId, teacherId }: any) => apiRequest('PUT', `/api/subjects/${subjectId}`, { teacherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      toast({ title: 'Subject teacher assigned' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const handleCreate = () => {
    if (!form.firstName || !form.email) return toast({ variant: 'destructive', title: 'Name and email required' });
    if (!form.password) return toast({ variant: 'destructive', title: 'Password is required for new teachers' });
    if (!CREATABLE.includes(form.role)) return toast({ variant: 'destructive', title: 'Can only create Class Teacher or Subject Teacher' });
    createMut.mutate({ ...form, schoolId });
  };

  const classTCount = teachers.filter((u:any) => u.role === 'class_teacher').length;
  const subjTCount = teachers.filter((u:any) => u.role === 'subject_teacher').length;
  const unassignedClasses = classes.filter((c:any) => !c.class_teacher_id);

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Teacher Management</h1>
            <p className="text-sm text-gray-500">{teachers.length} staff members</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setAssignDialog('class')}>
              <UserCheck className="w-4 h-4" />Assign Class Teacher
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setAssignDialog('subject')}>
              <BookOpen className="w-4 h-4" />Assign Subject
            </Button>
            <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" />Add Teacher
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm text-center p-4">
            <p className="text-2xl font-bold text-blue-600">{classTCount}</p>
            <p className="text-xs text-gray-500 mt-1">Class Teachers</p>
          </Card>
          <Card className="border-0 shadow-sm text-center p-4">
            <p className="text-2xl font-bold text-purple-600">{subjTCount}</p>
            <p className="text-xs text-gray-500 mt-1">Subject Teachers</p>
          </Card>
          <Card className="border-0 shadow-sm text-center p-4">
            <p className={`text-2xl font-bold ${unassignedClasses.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{unassignedClasses.length}</p>
            <p className="text-xs text-gray-500 mt-1">Classes without Class Teacher</p>
          </Card>
        </div>

        {unassignedClasses.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              {unassignedClasses.map((c:any)=>c.name).join(', ')} {unassignedClasses.length===1?'has':'have'} no class teacher assigned.
              <button onClick={() => setAssignDialog('class')} className="ml-2 font-semibold underline">Assign now →</button>
            </p>
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search teachers..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading teachers...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No teachers found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Staff ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Class/Dept</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((t: any) => {
                    const cls = classes.find((c:any) => c.class_teacher_id === t.id);
                    const subjs = subjects.filter((s:any) => s.teacher_id === t.id);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">
                              {t.first_name?.charAt(0)}{t.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{t.first_name} {t.last_name}</p>
                              <p className="text-xs text-gray-400">{t.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{t.username || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${ROLE_COLORS[t.role] || 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[t.role] || t.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-xs text-gray-500">
                            {cls && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{cls.name}</span>}
                            {subjs.length > 0 && subjs.map((s:any) => (
                              <span key={s.id} className="ml-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{s.name}</span>
                            ))}
                            {!cls && subjs.length === 0 && <span className="text-gray-400">Not assigned</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Teacher Account</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} /></div>
              <div><Label>Last Name *</Label><Input value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} /></div>
            </div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v=>setForm(f=>({...f,role:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_teacher">Class Teacher</SelectItem>
                    <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="07XX..." /></div>
            </div>
            <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Set login password" /></div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-xs text-amber-700 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              You can only create Class Teachers and Subject Teachers.
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={createMut.isPending}>
                {createMut.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog === 'class'} onOpenChange={open => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Class Teacher</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-500">Select a class and the teacher to assign as class teacher. Only one class teacher per class is allowed.</p>
            <div>
              <Label>Select Class *</Label>
              <Select value={assignForm.classId} onValueChange={v=>setAssignForm(f=>({...f,classId:v}))}>
                <SelectTrigger><SelectValue placeholder="Choose class..." /></SelectTrigger>
                <SelectContent>
                  {classes.map((c:any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.teacher_name ? `(Current: ${c.teacher_name})` : '(No teacher)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Teacher *</Label>
              <Select value={assignForm.teacherId} onValueChange={v=>setAssignForm(f=>({...f,teacherId:v}))}>
                <SelectTrigger><SelectValue placeholder="Choose teacher..." /></SelectTrigger>
                <SelectContent>
                  {teachers.filter((t:any)=>t.role==='class_teacher'||t.role==='head_teacher').map((t:any) => (
                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name} ({ROLE_LABELS[t.role]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!assignForm.classId || !assignForm.teacherId || assignClassMut.isPending}
                onClick={() => assignClassMut.mutate({ classId: assignForm.classId, teacherId: assignForm.teacherId })}
              >
                {assignClassMut.isPending ? 'Assigning...' : 'Assign Teacher'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog === 'subject'} onOpenChange={open => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Subject Teacher</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Select Subject *</Label>
              <Select value={assignForm.classId} onValueChange={v=>setAssignForm(f=>({...f,classId:v}))}>
                <SelectTrigger><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s:any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} {s.teacher_name ? `(${s.teacher_name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Teacher *</Label>
              <Select value={assignForm.teacherId} onValueChange={v=>setAssignForm(f=>({...f,teacherId:v}))}>
                <SelectTrigger><SelectValue placeholder="Choose teacher..." /></SelectTrigger>
                <SelectContent>
                  {teachers.filter((t:any)=>t.role==='subject_teacher'||t.role==='class_teacher').map((t:any) => (
                    <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!assignForm.classId || !assignForm.teacherId || assignSubjectMut.isPending}
                onClick={() => assignSubjectMut.mutate({ subjectId: assignForm.classId, teacherId: assignForm.teacherId })}
              >
                {assignSubjectMut.isPending ? 'Assigning...' : 'Assign Teacher'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HTLayout>
  );
}
