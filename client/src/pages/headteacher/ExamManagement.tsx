import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, ClipboardList, Search, Lock, Play, Eye, Pencil, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'bg-gray-100 text-gray-600' },
  published:   { label: 'Published',   color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  closed:      { label: 'Closed',      color: 'bg-red-100 text-red-600' },
};

const EXAM_TYPES = ['beginning_of_term','midterm','end_of_term','assignment','quiz','mock','uneb'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const emptyForm = {
  title: '', term: 'Term 1', examType: 'end_of_term', examDate: '',
  duration: '120', totalMarks: '100', passingMarks: '50', description: '',
  classId: '', subjectId: '',
};

export default function ExamManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: exams = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
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
  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/exams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams', schoolId] });
      toast({ title: 'Exam created' });
      setShowForm(false); setEditing(null); setForm(emptyForm);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest('PUT', `/api/exams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams', schoolId] });
      toast({ title: 'Exam updated' });
      setShowForm(false); setEditing(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateStatus = (id: string, status: string) => {
    updateMut.mutate({ id, data: { status } });
  };

  const filtered = exams.filter((e: any) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openEdit = (exam: any) => {
    setEditing(exam);
    setForm({
      title: exam.title, term: exam.term || 'Term 1',
      examType: exam.exam_type, examDate: exam.exam_date?.substring(0,10) || '',
      duration: String(exam.duration), totalMarks: String(exam.total_marks),
      passingMarks: String(exam.passing_marks), description: exam.description || '',
      classId: exam.class_id || '', subjectId: exam.subject_id || '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title || !form.examDate) return toast({ variant: 'destructive', title: 'Title and date required' });
    const payload = {
      title: form.title, term: form.term, examType: form.examType, examDate: form.examDate,
      duration: parseInt(form.duration), totalMarks: parseInt(form.totalMarks),
      passingMarks: parseInt(form.passingMarks), description: form.description,
      classId: form.classId || null, subjectId: form.subjectId || null,
      schoolId, status: 'draft',
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const counts = { draft: 0, published: 0, in_progress: 0, closed: 0 };
  exams.forEach((e: any) => { if (e.status && counts[e.status as keyof typeof counts] !== undefined) counts[e.status as keyof typeof counts]++; });

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Exam Management</h1>
            <p className="text-sm text-gray-500">{exams.length} exams total</p>
          </div>
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" />Create Exam
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {Object.entries(counts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${statusFilter === status ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <p className="text-xl font-bold text-gray-800">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{status.replace(/_/g,' ')}</p>
            </button>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search exams..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading exams...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No exams found. Create your first exam.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((exam: any) => {
                  const sc = STATUS_CONFIG[exam.status || 'draft'];
                  const examMarks = marks.filter((m: any) => m.exam_id === exam.id);
                  const isClosed = exam.status === 'closed';
                  return (
                    <div key={exam.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{exam.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{exam.exam_date}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-500">{exam.exam_type?.replace(/_/g,' ')}</span>
                              {exam.term && <><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{exam.term}</span></>}
                              {exam.class_name && <Badge className="text-[10px] bg-blue-50 text-blue-600">{exam.class_name}</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-gray-400">{exam.total_marks} marks · {exam.duration} min</span>
                              <span className="text-xs text-emerald-600">{examMarks.length} marks recorded</span>
                              {isClosed && <span className="flex items-center gap-1 text-xs text-red-500"><Lock className="w-3 h-3" />Marks entry closed</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                          <div className="flex gap-1">
                            {exam.status === 'draft' && (
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => updateStatus(exam.id, 'published')}>
                                <Eye className="w-3 h-3 mr-1" />Publish
                              </Button>
                            )}
                            {exam.status === 'published' && (
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-amber-600" onClick={() => updateStatus(exam.id, 'in_progress')}>
                                <Play className="w-3 h-3 mr-1" />Start
                              </Button>
                            )}
                            {exam.status === 'in_progress' && (
                              <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-red-600" onClick={() => updateStatus(exam.id, 'closed')}>
                                <Lock className="w-3 h-3 mr-1" />Close
                              </Button>
                            )}
                            {!isClosed && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(exam)}>
                                <Pencil className="w-3.5 h-3.5 text-gray-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={open => { if(!open){setShowForm(false);setEditing(null);} }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Exam' : 'Create New Exam'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Exam Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. End of Term 1 Examinations 2025" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term *</Label>
                <Select value={form.term} onValueChange={v=>setForm(f=>({...f,term:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exam Type *</Label>
                <Select value={form.examType} onValueChange={v=>setForm(f=>({...f,examType:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAM_TYPES.map(t=><SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Exam Date *</Label><Input type="date" value={form.examDate} onChange={e=>setForm(f=>({...f,examDate:e.target.value}))} /></div>
              <div><Label>Duration (minutes)</Label><Input type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Marks</Label><Input type="number" value={form.totalMarks} onChange={e=>setForm(f=>({...f,totalMarks:e.target.value}))} /></div>
              <div><Label>Passing Marks</Label><Input type="number" value={form.passingMarks} onChange={e=>setForm(f=>({...f,passingMarks:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class (optional)</Label>
                <Select value={form.classId || 'all'} onValueChange={v=>setForm(f=>({...f,classId:v==='all'?'':v}))}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c:any)=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject (optional)</Label>
                <Select value={form.subjectId || 'all'} onValueChange={v=>setForm(f=>({...f,subjectId:v==='all'?'':v}))}>
                  <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((s:any)=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Saving...' : editing ? 'Update Exam' : 'Create Exam'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HTLayout>
  );
}
