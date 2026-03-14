import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Calendar, Lock } from 'lucide-react';
import { format } from 'date-fns';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const EXAM_TYPES = ['Beginning of Term', 'Midterm', 'End of Term', 'Mock', 'UNEB'];
const YEARS = ['2024', '2025', '2026'];

export default function Exams() {
  const { profile } = useAuth();
  const { canCreate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', term: 'Term 1', examType: 'End of Term',
    academicYear: '2025', startDate: '', endDate: '', maxMarks: '100',
  });

  const { data: exams = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/exams', {
      title: data.name,
      description: data.examType,
      examDate: data.startDate || new Date().toISOString().split('T')[0],
      duration: 180,
      totalMarks: parseInt(data.maxMarks),
      passingMarks: Math.floor(parseInt(data.maxMarks) * 0.5),
      examType: data.examType,
      schoolId: data.schoolId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams', schoolId] });
      toast({ title: 'Exam created successfully' });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const examTypeLabel: Record<string, string> = {
    beginning_of_term: 'Beginning of Term',
    midterm: 'Midterm',
    end_of_term: 'End of Term',
    mock: 'Mock',
    uneb: 'UNEB',
    quiz: 'Quiz',
    final: 'Final',
    assignment: 'Assignment',
  };

  const examTypeColor: Record<string, string> = {
    end_of_term: 'bg-blue-100 text-blue-700',
    midterm: 'bg-yellow-100 text-yellow-700',
    beginning_of_term: 'bg-green-100 text-green-700',
    mock: 'bg-purple-100 text-purple-700',
    uneb: 'bg-red-100 text-red-700',
    quiz: 'bg-gray-100 text-gray-700',
    final: 'bg-indigo-100 text-indigo-700',
    assignment: 'bg-teal-100 text-teal-700',
  };

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
            <p className="text-gray-500 text-sm mt-1">{exams.length} exams configured</p>
          </div>
          {canCreate('exams') && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> New Exam</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, schoolId, maxMarks: parseInt(form.maxMarks) }); }} className="space-y-4 mt-2">
                  <div>
                    <Label>Exam Name *</Label>
                    <Input placeholder="e.g. End of Term 2 Examinations" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Term</Label>
                      <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Select value={form.academicYear} onValueChange={v => setForm(f => ({ ...f, academicYear: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Exam Type</Label>
                    <Select value={form.examType} onValueChange={v => setForm(f => ({ ...f, examType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" value={form.endDate}
                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Max Marks</Label>
                    <Input type="number" value={form.maxMarks}
                      onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Exam'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <Card><CardContent className="h-40 animate-pulse bg-gray-50 rounded mt-4" /></Card>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No exams configured</h3>
              <p className="text-gray-500 text-sm mt-1">Create exams to start entering marks.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam: any) => (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base leading-snug">{exam.title}</CardTitle>
                    <Badge className={`text-xs border-0 shrink-0 ml-2 ${examTypeColor[exam.exam_type] || 'bg-gray-100 text-gray-700'}`}>
                      {examTypeLabel[exam.exam_type] || exam.exam_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {exam.description && (
                    <p className="text-sm text-gray-500 mb-2">{exam.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Max marks: <span className="font-medium text-gray-700">{exam.total_marks}</span></span>
                    <span>Pass: <span className="font-medium text-gray-700">{exam.passing_marks}</span></span>
                    {exam.duration && <span>{exam.duration} min</span>}
                  </div>
                  {exam.exam_date && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(exam.exam_date), 'MMMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
