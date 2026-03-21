import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useOffline } from '@/hooks/useOffline';
import { syncManager } from '@/lib/syncManager';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, Star, Lock, Unlock, CheckCircle2, AlertCircle, WifiOff, ShieldCheck, ShieldOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEARS = ['2025', '2026', '2027', '2024'];

export const getGradeInfo = (score: number, max: number): { grade: string; points: number; color: string; label: string } => {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return { grade: 'D1', points: 1, color: 'bg-emerald-100 text-emerald-800', label: 'Distinction 1' };
  if (pct >= 80) return { grade: 'D2', points: 2, color: 'bg-green-100 text-green-800', label: 'Distinction 2' };
  if (pct >= 70) return { grade: 'C3', points: 3, color: 'bg-blue-100 text-blue-800', label: 'Credit 3' };
  if (pct >= 60) return { grade: 'C4', points: 4, color: 'bg-blue-50 text-blue-700', label: 'Credit 4' };
  if (pct >= 50) return { grade: 'C5', points: 5, color: 'bg-yellow-100 text-yellow-800', label: 'Credit 5' };
  if (pct >= 45) return { grade: 'C6', points: 6, color: 'bg-orange-100 text-orange-700', label: 'Credit 6' };
  if (pct >= 35) return { grade: 'P7', points: 7, color: 'bg-red-100 text-red-700', label: 'Pass 7' };
  return { grade: 'F8', points: 8, color: 'bg-red-200 text-red-900', label: 'Fail 8' };
};

export default function Marks() {
  const { profile } = useAuth();
  const { canCreate, canUpdate } = useRole();
  const { isOnline } = useOffline();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [localMarks, setLocalMarks] = useState<Record<string, { score: string; remarks: string }>>({});

  const { data: exams = [] } = useQuery<any[]>({
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

  // Subject teachers only see subjects assigned to them
  const isSubjectTeacher = profile?.role === 'subject_teacher';
  const visibleSubjects = isSubjectTeacher
    ? subjects.filter((s: any) => s.teacher_id === profile?.id)
    : subjects;

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId, selectedClass],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}${selectedClass ? `&classId=${selectedClass}` : ''}`).then(r => r.json()),
    enabled: !!schoolId && !!selectedClass,
  });

  const { data: marks = [], isLoading: marksLoading } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId, selectedExam, selectedClass, selectedSubject, selectedTerm, selectedYear],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}&examId=${selectedExam}&classId=${selectedClass}&subjectId=${selectedSubject}&term=${encodeURIComponent(selectedTerm)}&academicYear=${selectedYear}`).then(r => r.json()),
    enabled: !!(schoolId && selectedExam && selectedClass && selectedSubject),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/marks/bulk', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks'] });
      toast({ title: `Marks saved — ${data.saved} records updated` });
      setLocalMarks({});
    },
    onError: (e: any) => toast({ title: 'Error saving marks', description: e.message, variant: 'destructive' }),
  });

  const lockMutation = useMutation({
    mutationFn: (lock: boolean) => apiRequest('POST', '/api/marks/lock', {
      examId: selectedExam, classId: selectedClass, subjectId: selectedSubject,
      schoolId, lock, approvedBy: profile?.id,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks'] });
      toast({ title: data.message });
    },
    onError: (e: any) => toast({ title: 'Lock failed', description: e.message, variant: 'destructive' }),
  });

  // ── Marks entry permission for class teacher ──────────────────────────────
  const { data: ctPermissions = [] } = useQuery<any[]>({
    queryKey: ['/api/marks-permissions', schoolId, selectedClass, selectedSubject, selectedExam],
    queryFn: () =>
      fetch(`/api/marks-permissions?schoolId=${schoolId}&classId=${selectedClass}&subjectId=${selectedSubject}&examId=${selectedExam}`)
        .then(r => r.json()),
    enabled: !!(schoolId && selectedClass && selectedSubject && selectedExam && isSubjectTeacher),
  });
  const activePerm = ctPermissions.find((p: any) => p.is_active);
  const ctPermGranted = !!activePerm;

  const grantCtPermMut = useMutation({
    mutationFn: () => apiRequest('POST', '/api/marks-permissions', {
      schoolId, classId: selectedClass, subjectId: selectedSubject, examId: selectedExam,
      grantedBy: profile?.id,
      grantedByName: `${profile?.firstName} ${profile?.lastName}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks-permissions'] });
      toast({ title: 'Class teacher can now enter marks for this exam' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const revokeCtPermMut = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/marks-permissions/${activePerm?.id}`, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks-permissions'] });
      toast({ title: 'Class teacher access revoked' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const toggleCtPerm = () => {
    if (ctPermGranted) revokeCtPermMut.mutate();
    else grantCtPermMut.mutate();
  };

  const selectedExamData = useMemo(() => exams.find((e: any) => e.id === selectedExam), [exams, selectedExam]);
  const maxMarks = selectedExamData?.total_marks || 100;
  const isAnyLocked = marks.some((m: any) => m.is_locked);
  const canEdit = (canCreate('marks') || canUpdate('marks')) && !isAnyLocked;
  const isHeadTeacher = profile?.role === 'head_teacher';

  const existingMap = useMemo(() =>
    marks.reduce((acc: any, m: any) => {
      acc[m.student_id] = { score: String(m.marks_obtained), remarks: m.subject_teacher_remarks || '', grade: m.grade, locked: m.is_locked };
      return acc;
    }, {}),
    [marks]
  );

  const handleSave = async () => {
    const entries = students.map((s: any) => ({
      studentId: s.id,
      marksObtained: localMarks[s.id]?.score ?? existingMap[s.id]?.score ?? '',
      subjectTeacherRemarks: localMarks[s.id]?.remarks ?? existingMap[s.id]?.remarks ?? '',
    })).filter(e => e.marksObtained !== '' && e.marksObtained !== undefined);

    if (!entries.length) { toast({ title: 'No marks to save', variant: 'destructive' }); return; }

    const payload = {
      entries,
      examId: selectedExam,
      subjectId: selectedSubject,
      classId: selectedClass,
      schoolId,
      term: selectedTerm,
      academicYear: selectedYear,
      recordedBy: profile?.id,
    };

    if (!isOnline) {
      const examName = exams.find((e: any) => e.id === selectedExam)?.title || 'Exam';
      const subjectName = subjects.find((s: any) => s.id === selectedSubject)?.name || 'Subject';
      const className = classes.find((c: any) => c.id === selectedClass)?.name || 'Class';
      await syncManager.queueMarksSave(payload,
        `${entries.length} marks for ${subjectName} — ${className} (${examName})`
      );
      toast({
        title: 'Saved offline',
        description: `${entries.length} marks queued. Will sync when reconnected.`,
      });
      setLocalMarks({});
      return;
    }

    saveMutation.mutate(payload);
  };

  const filtersReady = !!(selectedExam && selectedClass && selectedSubject);

  // Stats
  const allScores = students.map((s: any) => {
    const local = localMarks[s.id]?.score;
    const saved = existingMap[s.id]?.score;
    const val = local !== undefined ? local : saved;
    return val !== undefined ? parseFloat(val) : null;
  }).filter((v): v is number => v !== null && !isNaN(v));

  const enteredCount = allScores.length;
  const classAvg = enteredCount ? Math.round((allScores.reduce((a, b) => a + b, 0) / enteredCount / maxMarks) * 1000) / 10 : 0;
  const highest = enteredCount ? Math.max(...allScores) : 0;
  const lowest = enteredCount ? Math.min(...allScores) : 0;

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
            <p className="text-gray-500 text-sm mt-1">Enter and manage student marks by subject</p>
          </div>
          {filtersReady && canEdit && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}
                className={`gap-1.5 ${!isOnline ? 'bg-gray-700 hover:bg-gray-600' : ''}`}>
                {!isOnline ? <WifiOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saveMutation.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : 'Save Marks'}
              </Button>
              {isHeadTeacher && marks.length > 0 && !isAnyLocked && (
                <Button size="sm" variant="outline" onClick={() => lockMutation.mutate(true)}
                  disabled={lockMutation.isPending}
                  className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                  <Lock className="w-4 h-4" /> Lock Marks
                </Button>
              )}
              {isHeadTeacher && isAnyLocked && (
                <Button size="sm" variant="outline" onClick={() => lockMutation.mutate(false)}
                  disabled={lockMutation.isPending}
                  className="gap-1.5 border-gray-200 text-gray-600">
                  <Unlock className="w-4 h-4" /> Unlock
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Class *</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Exam *</label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select exam" /></SelectTrigger>
                  <SelectContent>{exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Subject *</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{visibleSubjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats bar */}
        {filtersReady && enteredCount > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Students', value: `${enteredCount}/${students.length}` },
              { label: 'Class Avg', value: `${classAvg}%` },
              { label: 'Highest', value: `${highest}/${maxMarks}` },
              { label: 'Lowest', value: `${lowest}/${maxMarks}` },
            ].map(stat => (
              <Card key={stat.label} className="shadow-none border border-gray-100">
                <CardContent className="p-3">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CT Permission Toggle — only visible to subject teacher */}
        {filtersReady && isSubjectTeacher && (
          <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors
            ${ctPermGranted
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-center gap-3">
              {ctPermGranted
                ? <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                : <ShieldOff className="w-5 h-5 text-gray-400 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${ctPermGranted ? 'text-emerald-800' : 'text-gray-700'}`}>
                  Allow Class Teacher to Enter Marks
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ctPermGranted
                    ? 'Class teacher can enter and edit marks for this exam. They must provide a reason when editing.'
                    : 'Only you can currently enter marks. Toggle to allow the class teacher to help.'}
                </p>
              </div>
            </div>
            <Switch
              checked={ctPermGranted}
              onCheckedChange={toggleCtPerm}
              disabled={grantCtPermMut.isPending || revokeCtPermMut.isPending}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        )}

        {/* Marks Table */}
        {filtersReady ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {selectedExamData?.title} — Max {maxMarks} marks
                  {isAnyLocked && (
                    <Badge className="bg-red-100 text-red-700 border-0 gap-1 text-xs">
                      <Lock className="w-3 h-3" /> Locked
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {marksLoading ? (
                <div className="h-40 animate-pulse bg-gray-50 m-4 rounded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-8 pl-4">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="w-24 text-center font-mono text-xs">ID</TableHead>
                      <TableHead className="w-32">Score /{maxMarks}</TableHead>
                      <TableHead className="w-16 text-center">Grade</TableHead>
                      <TableHead className="w-16 text-center">%</TableHead>
                      <TableHead className="min-w-[160px]">Teacher Remarks</TableHead>
                      <TableHead className="w-20 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                          No students in this class
                        </TableCell>
                      </TableRow>
                    ) : students.map((student: any, i: number) => {
                      const saved = existingMap[student.id];
                      const local = localMarks[student.id];
                      const scoreStr = local?.score !== undefined ? local.score : (saved?.score ?? '');
                      const remarksStr = local?.remarks !== undefined ? local.remarks : (saved?.remarks ?? '');
                      const scoreNum = parseFloat(scoreStr);
                      const gradeInfo = !isNaN(scoreNum) && scoreStr !== '' ? getGradeInfo(scoreNum, maxMarks) : null;
                      const pct = gradeInfo ? Math.round((scoreNum / maxMarks) * 100) : null;
                      const isSaved = saved !== undefined;

                      return (
                        <TableRow key={student.id} className={isSaved ? 'bg-green-50/30' : ''}>
                          <TableCell className="text-gray-400 text-xs pl-4">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{student.first_name} {student.last_name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {student.student_number || student.payment_code}
                            </span>
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <Input
                                type="number" min={0} max={maxMarks}
                                value={scoreStr} placeholder="–"
                                className="w-24 h-8 text-sm"
                                onChange={e => setLocalMarks(prev => ({
                                  ...prev,
                                  [student.id]: { ...prev[student.id], score: e.target.value }
                                }))}
                              />
                            ) : (
                              <span className="font-semibold text-gray-800">{scoreStr || '–'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {gradeInfo ? (
                              <Badge className={`text-xs border-0 font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</Badge>
                            ) : <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-600">
                            {pct !== null ? `${pct}%` : '—'}
                          </TableCell>
                          <TableCell>
                            {canEdit ? (
                              <Input
                                value={remarksStr} placeholder="Optional remark..."
                                className="h-8 text-xs min-w-[150px]"
                                onChange={e => setLocalMarks(prev => ({
                                  ...prev,
                                  [student.id]: { ...prev[student.id], remarks: e.target.value }
                                }))}
                              />
                            ) : (
                              <span className="text-xs text-gray-500">{remarksStr || '–'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {isSaved ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700">Select filters to begin</h3>
              <p className="text-gray-400 text-sm mt-1">Choose a class, exam, and subject to view or enter marks.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
