import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Award, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_PRIMARY_GRADES = [
  { label: 'D1', min: 95, max: 100, points: 1, descriptor: 'Excellent' },
  { label: 'D2', min: 85, max: 94, points: 2, descriptor: 'Very Good' },
  { label: 'C3', min: 75, max: 84, points: 3, descriptor: 'Good' },
  { label: 'C4', min: 65, max: 74, points: 4, descriptor: 'Satisfactory' },
  { label: 'C5', min: 55, max: 64, points: 5, descriptor: 'Satisfactory' },
  { label: 'C6', min: 45, max: 54, points: 6, descriptor: 'Below Average' },
  { label: 'P7', min: 40, max: 44, points: 7, descriptor: 'Pass' },
  { label: 'F8', min: 0,  max: 39, points: 8, descriptor: 'Fail' },
];

const DEFAULT_SECONDARY_GRADES = [
  { label: 'A*', min: 90, max: 100, points: 1, descriptor: 'Exceptional' },
  { label: 'A',  min: 80, max: 89, points: 2, descriptor: 'Excellent' },
  { label: 'B',  min: 70, max: 79, points: 3, descriptor: 'Good' },
  { label: 'C',  min: 60, max: 69, points: 4, descriptor: 'Credit' },
  { label: 'D',  min: 50, max: 59, points: 5, descriptor: 'Pass' },
  { label: 'E',  min: 40, max: 49, points: 6, descriptor: 'Fair' },
  { label: 'O',  min: 35, max: 39, points: 7, descriptor: 'Below Pass' },
  { label: 'F',  min: 0,  max: 34, points: 8, descriptor: 'Fail' },
];

export default function AcademicSetup() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const [showAddExam, setShowAddExam] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examType: 'End-term', term: 'Term I', academicYear: '' });

  const { data: exams = [], isLoading: loadingExams } = useQuery<any[]>({ queryKey: ['/api/exams', schoolId], queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: gradingSystems = [] } = useQuery<any[]>({ queryKey: ['/api/grading-systems', schoolId], queryFn: () => fetch(`/api/grading-systems?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const createExamMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/exams', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/exams', schoolId] }); toast({ title: 'Exam created' }); setShowAddExam(false); setExamForm({ name: '', examType: 'End-term', term: 'Term I', academicYear: '' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const createGradingMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/grading-systems', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/grading-systems', schoolId] }); toast({ title: 'Grading system saved' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteExamMut = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/exams/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/exams', schoolId] }); toast({ title: 'Exam deleted' }); },
  });

  const handleSaveGrading = (section: string, grades: any[]) => {
    createGradingMut.mutate({ schoolId, sectionName: section, name: `${section} Grading`, gradeRanges: grades });
  };

  const GradeTable = ({ section, defaultGrades }: { section: string; defaultGrades: any[] }) => {
    const existing = gradingSystems.find((g: any) => g.section_name === section);
    const [grades, setGrades] = useState<any[]>(existing?.grade_ranges ?? defaultGrades);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{section} Section Grading</p>
          {existing && <Badge className="bg-green-100 text-green-700 text-xs">Configured</Badge>}
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b">
              {['Grade', 'Min %', 'Max %', 'Points', 'Descriptor'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y">
              {grades.map((g, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2"><Input value={g.label} onChange={e => { const n = [...grades]; n[i] = { ...g, label: e.target.value }; setGrades(n); }} className="h-6 text-xs w-14" /></td>
                  <td className="px-3 py-2"><Input type="number" value={g.min} onChange={e => { const n = [...grades]; n[i] = { ...g, min: +e.target.value }; setGrades(n); }} className="h-6 text-xs w-16" /></td>
                  <td className="px-3 py-2"><Input type="number" value={g.max} onChange={e => { const n = [...grades]; n[i] = { ...g, max: +e.target.value }; setGrades(n); }} className="h-6 text-xs w-16" /></td>
                  <td className="px-3 py-2"><Input type="number" value={g.points} onChange={e => { const n = [...grades]; n[i] = { ...g, points: +e.target.value }; setGrades(n); }} className="h-6 text-xs w-14" /></td>
                  <td className="px-3 py-2"><Input value={g.descriptor} onChange={e => { const n = [...grades]; n[i] = { ...g, descriptor: e.target.value }; setGrades(n); }} className="h-6 text-xs w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button size="sm" onClick={() => handleSaveGrading(section, grades)} disabled={createGradingMut.isPending} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
          {createGradingMut.isPending ? 'Saving...' : 'Save Grading System'}
        </Button>
      </div>
    );
  };

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Academic Setup</h1>
          <p className="text-sm text-gray-500">Configure grading systems and manage examinations</p>
        </div>

        <Tabs defaultValue="grading">
          <TabsList>
            <TabsTrigger value="grading" className="gap-2"><Award className="w-3.5 h-3.5" />Grading Systems</TabsTrigger>
            <TabsTrigger value="exams" className="gap-2"><BookOpen className="w-3.5 h-3.5" />Examinations</TabsTrigger>
          </TabsList>

          <TabsContent value="grading" className="mt-4">
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Primary / Nursery</CardTitle></CardHeader>
                <CardContent className="px-5 pb-5"><GradeTable section="Primary" defaultGrades={DEFAULT_PRIMARY_GRADES} /></CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Secondary</CardTitle></CardHeader>
                <CardContent className="px-5 pb-5"><GradeTable section="Secondary" defaultGrades={DEFAULT_SECONDARY_GRADES} /></CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exams" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Examinations ({exams.length})</CardTitle>
                <Button size="sm" onClick={() => setShowAddExam(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Exam</Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {['Name', 'Type', 'Term', 'Academic Year', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingExams ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>) :
                       exams.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />No exams configured</td></tr> :
                       exams.map((exam: any) => (
                        <tr key={exam.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">{exam.name}</td>
                          <td className="px-4 py-3"><Badge className="bg-purple-100 text-purple-700 text-xs">{exam.exam_type ?? '—'}</Badge></td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{exam.term ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{exam.academic_year ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" onClick={() => deleteExamMut.mutate(exam.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAddExam} onOpenChange={setShowAddExam}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Examination</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Exam Name *</Label><Input value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. End of Term I Exam" /></div>
            <div className="space-y-1"><Label>Type</Label>
              <Select value={examForm.examType} onValueChange={v => setExamForm(f => ({ ...f, examType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Opener">Opener</SelectItem>
                  <SelectItem value="Mid-term">Mid-term</SelectItem>
                  <SelectItem value="End-term">End-term</SelectItem>
                  <SelectItem value="Test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Term</Label>
              <Select value={examForm.term} onValueChange={v => setExamForm(f => ({ ...f, term: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term I">Term I</SelectItem>
                  <SelectItem value="Term II">Term II</SelectItem>
                  <SelectItem value="Term III">Term III</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Academic Year</Label><Input value={examForm.academicYear} onChange={e => setExamForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2025/2026" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExam(false)}>Cancel</Button>
            <Button onClick={() => { if (examForm.name) createExamMut.mutate({ ...examForm, schoolId }); }} disabled={!examForm.name || createExamMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createExamMut.isPending ? 'Creating...' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
