import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/hooks/useOffline';
import { syncManager } from '@/lib/syncManager';
import {
  PenLine, Save, Lock, ShieldCheck, AlertTriangle,
  CheckCircle, Info, User, WifiOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';

const GRADES = [
  { min: 90, grade: 'D1' }, { min: 80, grade: 'D2' }, { min: 70, grade: 'C3' },
  { min: 60, grade: 'C4' }, { min: 50, grade: 'C5' }, { min: 45, grade: 'C6' },
  { min: 35, grade: 'P7' }, { min: 0, grade: 'F8' },
];
function calcGrade(score: number, total: number) {
  const pct = (score / total) * 100;
  return GRADES.find(g => pct >= g.min)?.grade || 'F8';
}
function gradeColor(g: string) {
  if (g.startsWith('D')) return 'bg-emerald-100 text-emerald-700';
  if (g.startsWith('C')) return 'bg-blue-100 text-blue-700';
  if (g === 'P7') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-600';
}

export default function CTMarks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOffline();
  const schoolId = profile?.schoolId;

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [entries, setEntries] = useState<Record<string, string>>({});

  // Reason dialog state
  const [reasonOpen, setReasonOpen] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [pendingSave, setPendingSave] = useState<null | (() => void)>(null);

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
  const students = allStudents
    .filter((s: any) => s.class_id === myClass?.id && s.is_active !== false)
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

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
    queryFn: () =>
      fetch(`/api/marks?schoolId=${schoolId}&classId=${myClass?.id}&examId=${selectedExam}&subjectId=${selectedSubject}`)
        .then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id && !!selectedExam && !!selectedSubject,
  });

  // Check if subject teacher has granted permission for this class/subject/exam
  const { data: permissions = [] } = useQuery<any[]>({
    queryKey: ['/api/marks-permissions', schoolId, myClass?.id, selectedSubject, selectedExam],
    queryFn: () =>
      fetch(`/api/marks-permissions?schoolId=${schoolId}&classId=${myClass?.id}&subjectId=${selectedSubject}&examId=${selectedExam}`)
        .then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id && !!selectedSubject && !!selectedExam,
  });

  const hasPermission = permissions.some((p: any) => p.is_active);
  const permissionRecord = permissions.find((p: any) => p.is_active);

  const activeExams = exams.filter((e: any) =>
    ['published', 'in_progress', 'draft'].includes(e.status)
  );
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
      setEditReason('');
      setReasonOpen(false);
      setPendingSave(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error saving marks', description: e.message }),
  });

  const doSave = async (reason?: string) => {
    if (!selectedSubject || !selectedExam || !myClass) return;
    const examObj = exams.find((e: any) => e.id === selectedExam);
    const subjectObj = subjects.find((s: any) => s.id === selectedSubject);
    const marksEntries = students
      .filter((s: any) => entries[s.id] !== undefined && entries[s.id] !== '')
      .map((s: any) => ({ studentId: s.id, marksObtained: entries[s.id] }));

    if (!marksEntries.length) {
      toast({ variant: 'destructive', title: 'No marks entered' });
      return;
    }

    const payload = {
      entries: marksEntries,
      examId: selectedExam,
      subjectId: selectedSubject,
      classId: myClass.id,
      schoolId,
      term: examObj?.term || 'Term 1',
      academicYear: new Date().getFullYear().toString(),
      recordedBy: profile?.id,
      editReason: reason || null,
      editedBy: profile?.id,
      editedByName: `${profile?.firstName} ${profile?.lastName}`,
    };

    if (!isOnline) {
      await syncManager.queueMarksSave(
        payload,
        `Marks for ${subjectObj?.name ?? 'subject'} — ${examObj?.title ?? 'exam'} (${myClass.name})`
      );
      toast({
        title: 'Saved offline',
        description: `${marksEntries.length} marks queued — will sync automatically when you reconnect.`,
      });
      setEditReason('');
      setReasonOpen(false);
      setPendingSave(null);
      return;
    }

    saveMut.mutate(payload);
  };

  const handleSaveClick = () => {
    // Check if any mark being saved is an EDIT of an existing mark
    const existingMap = existingMarks.reduce((acc: any, m: any) => {
      acc[m.student_id] = m.marks_obtained;
      return acc;
    }, {});
    const hasEdits = students.some((s: any) => {
      const newVal = entries[s.id];
      const oldVal = existingMap[s.id];
      return newVal !== undefined && newVal !== '' && oldVal !== undefined;
    });

    if (hasEdits) {
      // Require a reason
      setReasonOpen(true);
      setPendingSave(() => (reason: string) => doSave(reason));
    } else {
      doSave();
    }
  };

  const maxMarks = selectedExamObj?.total_marks || 100;
  const enteredCount = students.filter(
    (s: any) => entries[s.id] !== undefined && entries[s.id] !== ''
  ).length;
  const savedCount = existingMarks.length;

  const filtersReady = !!selectedSubject && !!selectedExam;
  const selectedSubjectObj = subjects.find((s: any) => s.id === selectedSubject);

  return (
    <CTLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enter Marks</h1>
          <p className="text-sm text-gray-500">
            {myClass?.name} · {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Select Subject *</Label>
              <Select
                value={selectedSubject || 'none'}
                onValueChange={v => { setSelectedSubject(v === 'none' ? '' : v); setEntries({}); }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose subject...</SelectItem>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.code ? ` (${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Select Exam *</Label>
              <Select
                value={selectedExam || 'none'}
                onValueChange={v => { setSelectedExam(v === 'none' ? '' : v); setEntries({}); }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose exam..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose exam...</SelectItem>
                  {activeExams.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.total_marks} marks){e.status === 'closed' ? ' [CLOSED]' : ''}
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
              {savedCount > 0 && (
                <span className="text-emerald-600 font-medium">✓ {savedCount} marks already saved</span>
              )}
              {isClosed && (
                <span className="flex items-center gap-1 text-red-500 font-medium">
                  <Lock className="w-3 h-3" /> Exam is closed
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Body */}
        {!filtersReady ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-8 text-center text-orange-600">
            <PenLine className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Select a subject and exam to continue</p>
          </div>
        ) : !hasPermission ? (
          /* ── Permission gate ─────────────────────────────────── */
          <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-8 text-center space-y-3">
            <Lock className="w-12 h-12 mx-auto text-amber-400" />
            <h3 className="text-lg font-bold text-amber-800">Permission Required</h3>
            <p className="text-sm text-amber-700 max-w-sm mx-auto">
              The subject teacher for <strong>{selectedSubjectObj?.name || 'this subject'}</strong> has not
              yet granted you permission to enter marks for this exam. Please ask them to allow access
              from their Marks Entry page.
            </p>
            <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Waiting for subject teacher approval
            </div>
          </div>
        ) : (
          /* ── Entry form (when permitted) ─────────────────────── */
          <>
            {/* Permission info banner */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                <strong>Access granted</strong> by{' '}
                {permissionRecord?.granted_by_name_live || permissionRecord?.granted_by_name || 'subject teacher'}.
                You are helping enter marks for this exam.
              </p>
            </div>

            {/* Edit notice */}
            {savedCount > 0 && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  {savedCount} mark{savedCount !== 1 ? 's' : ''} already exist. If you change any of them,
                  you'll be asked to provide a reason before saving.
                </p>
              </div>
            )}

            <Card className="border-0 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Enter marks out of <strong>{maxMarks}</strong>
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-orange-600 font-medium">
                    {enteredCount}/{students.length} entered
                  </span>
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
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s: any, idx: number) => {
                      const val = entries[s.id];
                      const num = val !== undefined && val !== '' ? parseFloat(val) : null;
                      const valid = num !== null && !isNaN(num) && num >= 0 && num <= maxMarks;
                      const pct = valid && num !== null ? ((num / maxMarks) * 100).toFixed(0) : '';
                      const grade = valid && num !== null ? calcGrade(num, maxMarks) : '';
                      const savedMark = existingMarks.find((m: any) => m.student_id === s.id);
                      const isEdited = savedMark && val !== undefined && val !== '' &&
                        String(savedMark.marks_obtained) !== val;

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors hover:bg-gray-50
                            ${valid && !isEdited ? 'bg-emerald-50/30' : ''}
                            ${isEdited ? 'bg-amber-50/40' : ''}`}
                        >
                          <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0 uppercase">
                                {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {s.first_name} {s.last_name}
                                </p>
                                {savedMark && (
                                  <p className="text-[10px] text-emerald-600">
                                    saved: {savedMark.marks_obtained}
                                    {savedMark.edited_by_name && (
                                      <span className="text-amber-500 ml-1">
                                        · edited by {savedMark.edited_by_name}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                step="0.5"
                                value={val ?? ''}
                                disabled={isClosed}
                                onChange={e => {
                                  const v = e.target.value;
                                  if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= maxMarks)) {
                                    setEntries(prev => ({ ...prev, [s.id]: v }));
                                  }
                                }}
                                className={`w-20 text-center px-2 py-1.5 text-sm border rounded-lg
                                  focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors
                                  ${val && !valid ? 'border-red-400 bg-red-50' : ''}
                                  ${valid && !isEdited ? 'border-emerald-300 bg-emerald-50/60' : ''}
                                  ${isEdited ? 'border-amber-400 bg-amber-50' : ''}
                                  ${!val && !isEdited ? 'border-gray-200 bg-white' : ''}
                                  ${isClosed ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                placeholder="—"
                              />
                              {isEdited && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="This mark is being edited" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm text-gray-600">
                            {pct ? `${pct}%` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {grade ? (
                              <Badge className={`text-xs ${gradeColor(grade)}`}>{grade}</Badge>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isEdited ? (
                              <span className="text-xs text-amber-600 font-medium">editing</span>
                            ) : savedMark ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : val ? (
                              <span className="text-xs text-blue-500">new</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
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
                  {enteredCount > 0
                    ? `${enteredCount} mark${enteredCount !== 1 ? 's' : ''} ready to save`
                    : 'Enter marks above'}
                </p>
                <Button
                  onClick={handleSaveClick}
                  disabled={saveMut.isPending || enteredCount === 0}
                  className={`gap-2 min-w-[120px] ${!isOnline ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  {!isOnline ? <WifiOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saveMut.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : 'Save Marks'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reason Dialog ───────────────────────────────────────────── */}
      <Dialog open={reasonOpen} onOpenChange={open => { if (!open) { setReasonOpen(false); setEditReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Reason Required for Editing Marks
            </DialogTitle>
            <DialogDescription>
              You are modifying marks that were already saved. As the class teacher, you must provide
              a reason. This will be recorded along with the edit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
              <User className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This edit will be recorded under your name:{' '}
                <strong>{profile?.firstName} {profile?.lastName}</strong>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Edit Reason <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="e.g. Correction after exam paper re-check, marks were mis-recorded..."
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReasonOpen(false); setEditReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editReason.trim()) {
                  toast({ variant: 'destructive', title: 'Please provide a reason before saving' });
                  return;
                }
                doSave(editReason.trim());
              }}
              disabled={saveMut.isPending || !editReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {saveMut.isPending ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CTLayout>
  );
}
