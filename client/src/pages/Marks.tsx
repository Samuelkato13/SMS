import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useOffline } from '@/hooks/useOffline';
import { useOfflineSchoolQuery } from '@/hooks/useOfflineSchoolQuery';
import { syncManager } from '@/lib/syncManager';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, Star, CheckCircle2, AlertCircle, WifiOff, Upload, Lock, Unlock, Download } from 'lucide-react';

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
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [localMarks, setLocalMarks] = useState<Record<string, { score: string; remarks: string }>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);

  const { data: exams = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/exams?schoolId=${schoolId}` : undefined,
    ['/api/exams', schoolId],
    !!schoolId,
  );

  const { data: classes = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/classes?schoolId=${schoolId}` : undefined,
    ['/api/classes', schoolId],
    !!schoolId,
  );

  const { data: subjects = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/subjects?schoolId=${schoolId}` : undefined,
    ['/api/subjects', schoolId],
    !!schoolId,
  );

  // Subject teachers only see subjects assigned to them
  const isSubjectTeacher = profile?.role === 'subject_teacher';
  const visibleSubjects = isSubjectTeacher
    ? subjects.filter((s: any) => s.teacher_id === profile?.id)
    : subjects;

  const selectedSubject = selectedSubjects.length === 1 ? selectedSubjects[0] : '';
  const subjectColumns = visibleSubjects.filter((s: any) => selectedSubjects.includes(s.id));

  const studentsUrl =
    schoolId && selectedClass
      ? `/api/students?schoolId=${schoolId}&classId=${selectedClass}`
      : undefined;

  const { data: students = [] } = useOfflineSchoolQuery<any[]>(
    studentsUrl,
    ['/api/students', schoolId, selectedClass],
    !!studentsUrl,
  );

  const marksUrl =
    schoolId && selectedExam && selectedClass
      ? `/api/marks?schoolId=${schoolId}&examId=${selectedExam}&classId=${selectedClass}&term=${encodeURIComponent(selectedTerm)}&academicYear=${selectedYear}`
      : undefined;

  const { data: marks = [], isLoading: marksLoading } = useOfflineSchoolQuery<any[]>(
    marksUrl,
    ['/api/marks', schoolId, selectedExam, selectedClass, selectedTerm, selectedYear],
    !!marksUrl,
  );

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

  const submitMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/marks/submit', {
      classId: selectedClass,
      examId: selectedExam,
      schoolId,
      submittedBy: profile?.id,
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks'] });
      toast({ title: 'Marks submitted to Head Teacher for review' });
    },
    onError: (e: any) => toast({ title: 'Submission failed', description: e.message, variant: 'destructive' }),
  });

  // ── Marks entry permission for class teacher ──────────────────────────────

  const selectedExamData = useMemo(() => exams.find((e: any) => e.id === selectedExam), [exams, selectedExam]);
  const maxMarks = selectedExamData?.total_marks || 100;
  const isAnyLocked = marks.some((m: any) => m.is_locked);
  const canEdit = (canCreate('marks') || canUpdate('marks')) && !isAnyLocked;
  const isHeadTeacher = profile?.role === 'head_teacher';

  const existingMap = useMemo(() =>
    marks.reduce((acc: any, m: any) => {
      acc[`${m.student_id}-${m.subject_id}`] = { score: String(m.marks_obtained), remarks: m.subject_teacher_remarks || '', grade: m.grade, locked: m.is_locked };
      return acc;
    }, {}),
    [marks]
  );

  useEffect(() => {
    setLocalMarks({});
  }, [selectedSubjects]);

  const GRADE_POINTS: Record<string, number> = {
    D1: 1, D2: 2, C3: 3, C4: 4, C5: 5, C6: 6, P7: 7, F8: 8,
  };

  const handleUploadPreview = async () => {
    if (!uploadFile || !schoolId || !selectedClass || !selectedExam) {
      return toast({ variant: 'destructive', title: 'Select class and exam first' });
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('schoolId', String(schoolId));
      fd.append('classId', selectedClass);
      fd.append('examId', selectedExam);
      if (selectedSubject) fd.append('subjectId', selectedSubject);
      fd.append('term', selectedTerm);
      fd.append('academicYear', selectedYear);
      const res = await fetch('/api/reports/upload-preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to preview');
      setPreviewRows(data.preview || []);
      toast({ title: 'Preview ready', description: `${(data.preview||[]).length} rows parsed` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
      setPreviewRows(null);
    } finally { setUploading(false); }
  };

  const handleUploadCommit = async () => {
    if (!previewRows || !schoolId) return toast({ variant: 'destructive', title: 'No preview available' });
    try {
      setUploading(true);
      const res = await fetch('/api/reports/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: previewRows, schoolId, classId: selectedClass, examId: selectedExam, subjectId: selectedSubject, term: selectedTerm, academicYear: selectedYear, recordedBy: profile?.id, createMissing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to commit');
      toast({ title: 'Committed', description: `${data.saved} marks saved` });
      setPreviewRows(null);
      setUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/marks'] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    const entries = students.flatMap((s: any) =>
      subjectColumns.map((sub: any) => {
        const key = `${s.id}-${sub.id}`;
        const local = localMarks[key];
        const saved = existingMap[key];
        const score = local?.score ?? saved?.score ?? '';
        const remarks = local?.remarks ?? saved?.remarks ?? '';
        return {
          studentId: s.id,
          subjectId: sub.id,
          marksObtained: score,
          subjectTeacherRemarks: remarks,
        };
      })
    ).filter(e => e.marksObtained !== '' && e.marksObtained !== undefined);

    if (!entries.length) { toast({ title: 'No marks to save', variant: 'destructive' }); return; }

    const payload = {
      entries,
      examId: selectedExam,
      subjectId: selectedSubject || undefined,
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

  const filtersReady = !!(selectedExam && selectedClass && selectedSubjects.length > 0);

  // Template download handler
  const downloadMarkTemplate = async () => {
    try {
      const response = await fetch(
        `/api/marks/template?schoolId=${schoolId}&classId=${selectedClass}&examId=${selectedExam}${selectedSubject ? `&subjectId=${selectedSubject}` : ''}`
      );
      if (!response.ok) throw new Error('Failed to download template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marks_template_${selectedClass}_${selectedExam}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Template downloaded successfully' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Stats
  const allScores = students.flatMap((s: any) =>
    subjectColumns.map((sub: any) => {
      const key = `${s.id}-${sub.id}`;
      const local = localMarks[key]?.score;
      const saved = existingMap[key]?.score;
      const val = local !== undefined ? local : saved;
      const num = val !== undefined ? parseFloat(val) : NaN;
      return !isNaN(num) ? num : null;
    })
  ).filter((v): v is number => v !== null && !isNaN(v));

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
        </div>

        {/* Upload Section - Prominent at Top */}
        {selectedClass && selectedExam && canEdit && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                <Upload className="w-4 h-4" /> Quick Upload Marks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Upload marks using an Excel or CSV file. Download the template below to ensure proper formatting.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={downloadMarkTemplate}
                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4" /> Download Template
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setUploadOpen(true)}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" /> Upload File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Buttons - Compact */}
        {selectedClass && selectedExam && canEdit && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}
              className={`gap-1.5 ${!isOnline ? 'bg-gray-700 hover:bg-gray-600' : ''}`}>
              {!isOnline ? <WifiOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveMutation.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : 'Save Marks'}
            </Button>
            {profile?.role !== 'head_teacher' && marks.length > 0 && !isAnyLocked && (
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}>
                <CheckCircle2 className="w-4 h-4" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit to Head Teacher'}
              </Button>
            )}
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
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Subjects *</label>
                <div className="mt-1 grid max-h-44 gap-1 overflow-y-auto rounded border border-input bg-white p-2">
                  {visibleSubjects.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                      <Checkbox
                        checked={selectedSubjects.includes(s.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSubjects((prev) =>
                            checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id)
                          );
                        }}
                      />
                      <span>{s.name}{s.code ? ` (${s.code})` : ''}</span>
                    </label>
                  ))}
                  {visibleSubjects.length === 0 && (
                    <p className="text-xs text-gray-500">No subjects available.</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Select one or more subjects to show marks columns.</p>
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
                      {subjectColumns.map((sub: any) => (
                        <TableHead key={sub.id} className="text-center">{sub.name}</TableHead>
                      ))}
                      <TableHead className="w-24 text-center">Total</TableHead>
                      <TableHead className="w-20 text-center">Avg</TableHead>
                      <TableHead className="w-24 text-center">Agg</TableHead>
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
                      const rowValues = subjectColumns.map((sub: any) => {
                        const key = `${student.id}-${sub.id}`;
                        const local = localMarks[key];
                        const saved = existingMap[key];
                        const scoreStr = local?.score !== undefined ? local.score : (saved?.score ?? '');
                        const remarksStr = local?.remarks !== undefined ? local.remarks : (saved?.remarks ?? '');
                        const scoreNum = parseFloat(scoreStr);
                        const valid = scoreStr !== '' && !isNaN(scoreNum);
                        const gradeInfo = valid ? getGradeInfo(scoreNum, maxMarks) : null;
                        const pct = valid ? Math.round((scoreNum / maxMarks) * 100) : null;
                        return {
                          key,
                          scoreStr,
                          remarksStr,
                          scoreNum,
                          valid,
                          gradeInfo,
                          pct,
                        };
                      });

                      const totalScore = rowValues.reduce((sum, item) => item.valid ? sum + item.scoreNum : sum, 0);
                      const validCount = rowValues.filter(item => item.valid).length;
                      const avgScore = validCount ? Math.round((totalScore / validCount) * 10) / 10 : 0;
                      const aggregate = rowValues.reduce((sum, item) => {
                        if (!item.valid || !item.gradeInfo) return sum;
                        return sum + (GRADE_POINTS[item.gradeInfo.grade] ?? 0);
                      }, 0);
                      const rowHasSaved = rowValues.some((item) => existingMap[item.key] !== undefined);

                      return (
                        <TableRow key={student.id} className={rowHasSaved ? 'bg-green-50/30' : ''}>
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
                          {rowValues.map((item) => (
                            <TableCell key={item.key} className="text-center">
                              {canEdit ? (
                                <Input
                                  type="number" min={0} max={maxMarks}
                                  value={item.scoreStr} placeholder="–"
                                  className="w-20 h-8 text-sm"
                                  onChange={(e) => setLocalMarks((prev) => ({
                                    ...prev,
                                    [item.key]: { ...prev[item.key], score: e.target.value }
                                  }))}
                                />
                              ) : (
                                <span className="font-semibold text-gray-800">{item.scoreStr || '–'}</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold">{validCount ? totalScore : '–'}</TableCell>
                          <TableCell className="text-center font-semibold">{validCount ? avgScore : '–'}</TableCell>
                          <TableCell className="text-center font-semibold">{validCount ? aggregate : '–'}</TableCell>
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
              <p className="text-gray-400 text-sm mt-1">Choose a class, exam, and one or more subjects to view or enter marks.</p>
            </CardContent>
          </Card>
        )}
      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setUploadFile(null); setPreviewRows(null); setUploading(false); setCreateMissing(true); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Upload Marks</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Upload an Excel or CSV file with student admission numbers and marks for the selected class and subjects.</p>
            <div className="space-y-2">
              <Label>File</Label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Class</div>
                <div>{classes.find((c:any) => c.id === selectedClass)?.name || '—'}</div>
              </div>
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Exam</div>
                <div>{exams.find((e:any) => e.id === selectedExam)?.title || '—'}</div>
              </div>
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Subjects</div>
                <div>
                  {selectedSubjects.length === 0
                    ? '—'
                    : selectedSubjects.length === 1
                      ? visibleSubjects.find((s:any) => s.id === selectedSubject)?.name || '—'
                      : `${selectedSubjects.length} subjects selected`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input id="createMissing" type="checkbox" checked={createMissing} onChange={e => setCreateMissing(e.target.checked)} />
              <label htmlFor="createMissing" className="text-sm text-gray-600">Create missing students automatically from fullname/admission where possible</label>
            </div>
            {previewRows && (
              <div className="rounded border border-gray-200 bg-white p-3 text-sm">
                <div className="mb-2 font-semibold">Preview — first {Math.min(previewRows.length, 10)} rows</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1">#</th>
                        <th className="px-2 py-1">Admission</th>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Subject</th>
                        <th className="px-2 py-1">Marks</th>
                        <th className="px-2 py-1">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 10).map((r:any, idx:number) => (
                        <tr key={idx} className={r.errors?.length ? 'bg-red-50' : ''}>
                          <td className="px-2 py-1 align-top">{r.row}</td>
                          <td className="px-2 py-1 align-top">{r.admission || '—'}</td>
                          <td className="px-2 py-1 align-top">{r.fullname || '—'}</td>
                          <td className="px-2 py-1 align-top">{r.subjectName || '—'}</td>
                          <td className="px-2 py-1 align-top">{r.marks ?? '—'}</td>
                          <td className="px-2 py-1 align-top text-red-700">{(r.errors || []).join(', ') || 'OK'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 pt-4">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleUploadPreview} disabled={!uploadFile || uploading}> 
                {uploading ? 'Parsing...' : 'Preview'}
              </Button>
              <Button onClick={handleUploadCommit} disabled={!previewRows || uploading}>
                {uploading ? 'Saving...' : 'Save Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </RoleGuard>
  );
}
