import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PenLine, Save, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GRADES = [
  { min: 90, grade: 'D1' }, { min: 80, grade: 'D2' }, { min: 70, grade: 'C3' },
  { min: 60, grade: 'C4' }, { min: 50, grade: 'C5' }, { min: 45, grade: 'C6' },
  { min: 35, grade: 'P7' }, { min: 0, grade: 'F8' },
];
function calcGrade(score: number, total: number) {
  const pct = (score / total) * 100;
  return GRADES.find(g => pct >= g.min)?.grade || 'F8';
}

export default function CTMarks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id && s.is_active !== false);

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: existingMarks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId, myClass?.id, selectedExam, selectedSubject],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}&classId=${myClass?.id}&examId=${selectedExam}&subjectId=${selectedSubject}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id && !!selectedExam && !!selectedSubject,
  });

  const classSubjects = subjects; // show all school subjects, teacher can select any
  const activeExams = exams.filter((e: any) => e.status === 'published' || e.status === 'in_progress' || e.status === 'draft');
  const selectedExamObj = exams.find((e: any) => e.id === selectedExam);
  const isClosed = selectedExamObj?.status === 'closed';

  useEffect(() => {
    if (existingMarks.length) {
      const init: Record<string, string> = {};
      existingMarks.forEach((m: any) => { init[m.student_id] = String(m.marks_obtained); });
      setEntries(init);
    } else {
      setEntries({});
    }
  }, [existingMarks.length, selectedExam, selectedSubject]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/marks/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks', schoolId, myClass?.id] });
      toast({ title: 'Marks saved successfully' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const handleSave = () => {
    if (!selectedSubject || !selectedExam || !myClass) return;
    const examObj = exams.find((e: any) => e.id === selectedExam);
    const marksEntries = students
      .filter((s: any) => entries[s.id] !== undefined && entries[s.id] !== '')
      .map((s: any) => ({ studentId: s.id, marksObtained: entries[s.id] }));

    if (!marksEntries.length) return toast({ variant: 'destructive', title: 'No marks entered' });

    saveMut.mutate({
      entries: marksEntries,
      examId: selectedExam,
      subjectId: selectedSubject,
      classId: myClass.id,
      schoolId,
      term: examObj?.term || 'Term 1',
      academicYear: new Date().getFullYear().toString(),
      recordedBy: profile?.id,
    });
  };

  const maxMarks = selectedExamObj?.total_marks || 100;
  const enteredCount = students.filter((s: any) => entries[s.id] !== undefined && entries[s.id] !== '').length;
  const savedCount = existingMarks.length;

  return (
    <CTLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enter Marks</h1>
          <p className="text-sm text-gray-500">{myClass?.name} · {students.length} students</p>
        </div>

        <Card className="border-0 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Select Subject *</Label>
              <Select value={selectedSubject || 'none'} onValueChange={v=>{ setSelectedSubject(v==='none'?'':v); setEntries({}); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose subject...</SelectItem>
                  {classSubjects.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.name}{s.code?` (${s.code})`:''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Select Exam *</Label>
              <Select value={selectedExam || 'none'} onValueChange={v=>{ setSelectedExam(v==='none'?'':v); setEntries({}); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose exam...</SelectItem>
                  {activeExams.map((e:any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.total_marks} marks){e.status==='closed'?' [CLOSED]':''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedExamObj && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span>Max marks: <strong>{selectedExamObj.total_marks}</strong></span>
              <span>Duration: <strong>{selectedExamObj.duration} min</strong></span>
              <span>Date: <strong>{selectedExamObj.exam_date}</strong></span>
              <span>Pass mark: <strong>{selectedExamObj.passing_marks}</strong></span>
              {savedCount > 0 && <span className="text-emerald-600 font-medium">✓ {savedCount} marks already saved</span>}
              {isClosed && <span className="flex items-center gap-1 text-red-500 font-medium"><Lock className="w-3 h-3" />Exam is closed — editing restricted</span>}
            </div>
          )}
        </Card>

        {!selectedSubject || !selectedExam ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-8 text-center text-orange-600">
            <PenLine className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Select a subject and exam to start entering marks</p>
          </div>
        ) : (
          <>
            <Card className="border-0 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Enter marks out of <strong>{maxMarks}</strong></p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-orange-600 font-medium">{enteredCount}/{students.length} entered</span>
                </div>
              </div>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Marks (/{maxMarks})</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s: any, idx: number) => {
                      const val = entries[s.id];
                      const num = val !== undefined && val !== '' ? parseFloat(val) : null;
                      const valid = num !== null && !isNaN(num) && num >= 0 && num <= maxMarks;
                      const pct = valid && num !== null ? ((num / maxMarks) * 100).toFixed(0) : '';
                      const grade = valid && num !== null ? calcGrade(num, maxMarks) : '';
                      const isSaved = existingMarks.find((m:any)=>m.student_id===s.id);
                      return (
                        <tr key={s.id} className={`transition-colors ${valid?'bg-emerald-50/30':''} hover:bg-gray-50`}>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{idx+1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                                {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{s.first_name} {s.last_name}</p>
                                {isSaved && <p className="text-[10px] text-emerald-600">✓ saved: {isSaved.marks_obtained}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex justify-center">
                              <input
                                type="number" min="0" max={maxMarks} step="0.5"
                                value={val ?? ''}
                                disabled={isClosed}
                                onChange={e => {
                                  const v = e.target.value;
                                  if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= maxMarks)) {
                                    setEntries(prev => ({ ...prev, [s.id]: v }));
                                  }
                                }}
                                className={`w-20 text-center px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors
                                  ${val && !valid ? 'border-red-400 bg-red-50' : valid ? 'border-emerald-300 bg-emerald-50/60' : 'border-gray-200 bg-white'}
                                  ${isClosed ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                placeholder="—"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm text-gray-600">{pct ? `${pct}%` : '—'}</td>
                          <td className="px-4 py-2.5 text-center">
                            {grade ? (
                              <Badge className={`text-xs ${grade==='F8'?'bg-red-100 text-red-600':grade.startsWith('D')?'bg-emerald-100 text-emerald-700':grade.startsWith('C')?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>
                                {grade}
                              </Badge>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {!isClosed && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {enteredCount > 0 ? `${enteredCount} mark${enteredCount!==1?'s':''} ready to save` : 'Enter marks above'}
                </p>
                <Button onClick={handleSave} disabled={saveMut.isPending || enteredCount === 0} className="bg-orange-600 hover:bg-orange-700 gap-2 min-w-[120px]">
                  <Save className="w-4 h-4" />{saveMut.isPending ? 'Saving...' : 'Save Marks'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CTLayout>
  );
}
