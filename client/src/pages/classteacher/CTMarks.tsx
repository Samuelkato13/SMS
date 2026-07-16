import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/hooks/useOffline';
import { useOfflineSchoolQuery } from '@/hooks/useOfflineSchoolQuery';
import { syncManager } from '@/lib/syncManager';
import {
  PenLine, Save, Lock, ShieldCheck, AlertTriangle,
  CheckCircle, Info, User, WifiOff, Upload, ChevronDown, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
// Every mark now lives at entries[entryKey(studentId, subjectId)].
// This is the single source of truth the table, save, and edit-detection all read/write.
function entryKey(studentId: string, subjectId: string) {
  return `${studentId}-${subjectId}`;
}

export default function CTMarks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOffline();
  const schoolId = profile?.schoolId;

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const selectedSubject = selectedSubjects.length === 1 ? selectedSubjects[0] : '';
  const [selectedExam, setSelectedExam] = useState('');
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const subjectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (subjectsRef.current && !subjectsRef.current.contains(e.target as Node)) {
        setSubjectsOpen(false);
      }
    }
    if (subjectsOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [subjectsOpen]);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);

  // Reason dialog state
  const [reasonOpen, setReasonOpen] = useState(false);
  const [editReason, setEditReason] = useState('');

  const { data: classes = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/classes?schoolId=${schoolId}` : undefined,
    ['/api/classes', schoolId],
    !!schoolId,
  );
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  const { data: allStudents = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/students?schoolId=${schoolId}` : undefined,
    ['/api/students', schoolId],
    !!schoolId,
  );
  const students = allStudents
    .filter((s: any) => s.class_id === myClass?.id && s.is_active !== false)
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const { data: subjects = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/subjects?schoolId=${schoolId}` : undefined,
    ['/api/subjects', schoolId],
    !!schoolId,
  );

  const subjectColumns = subjects.filter((s: any) => selectedSubjects.includes(s.id));

  const { data: exams = [] } = useOfflineSchoolQuery<any[]>(
    schoolId ? `/api/exams?schoolId=${schoolId}` : undefined,
    ['/api/exams', schoolId],
    !!schoolId,
  );

  const marksUrl =
    schoolId && myClass?.id && selectedExam && selectedSubjects.length > 0
      ? `/api/marks?schoolId=${schoolId}&classId=${myClass.id}&examId=${selectedExam}`
      : undefined;

  const { data: existingMarks = [] } = useOfflineSchoolQuery<any[]>(
    marksUrl,
    ['/api/marks', schoolId, myClass?.id, selectedExam, selectedSubjects.join(',')],
    !!marksUrl,
  );

  // Fetch permissions for the whole class+exam (no subjectId filter) so we get
  // one row per subject back and can check each selected subject against it,
  // instead of only ever being able to check a single subject at a time.
  const permissionsUrl =
    schoolId && myClass?.id && selectedSubjects.length > 0 && selectedExam
      ? `/api/marks-permissions?schoolId=${schoolId}&classId=${myClass.id}&examId=${selectedExam}`
      : undefined;

  const { data: permissions = [] } = useOfflineSchoolQuery<any[]>(
    permissionsUrl,
    ['/api/marks-permissions', schoolId, myClass?.id, selectedExam],
    !!permissionsUrl,
  );

  const isClassTeacherForClass = profile?.role === 'class_teacher' && Boolean(myClass?.id);

  const activePermissionBySubject = new Map<string, any>(
    permissions.filter((p: any) => p.is_active).map((p: any) => [p.subject_id, p])
  );

  // Which of the *currently selected* subjects are NOT covered by a permission
  // (class teachers are covered for everything in their own class automatically).
  const unpermittedSubjects = isClassTeacherForClass
    ? []
    : subjectColumns.filter((sub: any) => !activePermissionBySubject.has(sub.id));

  const hasPermission =
    selectedSubjects.length > 0 && (isClassTeacherForClass || unpermittedSubjects.length === 0);

  const activeExams = exams.filter((e: any) =>
    ['published', 'in_progress', 'draft'].includes(e.status)
  );
  const selectedExamObj = exams.find((e: any) => e.id === selectedExam);
  const isClosed = selectedExamObj?.status === 'closed';

  const handleUploadPreview = async () => {
    if (!uploadFile || !schoolId || !myClass?.id || !selectedSubjects.length || !selectedExam) {
      return toast({ variant: 'destructive', title: 'Select class, subjects and exam first' });
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('schoolId', String(schoolId));
      fd.append('classId', myClass.id);
      fd.append('examId', selectedExam);
      if (selectedSubjects.length === 1) fd.append('subjectId', selectedSubject);
      fd.append('term', selectedExamObj?.term || 'Term 1');
      fd.append('academicYear', new Date().getFullYear().toString());
      const res = await fetch('/api/reports/upload-preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to preview upload');
      setPreviewRows(data.preview || []);
      toast({ title: 'Preview ready', description: `${(data.preview || []).length} rows parsed` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload preview failed', description: e.message });
      setPreviewRows(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCommit = async () => {
    if (!previewRows || !schoolId) return toast({ variant: 'destructive', title: 'No preview available' });
    try {
      setUploading(true);
      const res = await fetch('/api/reports/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: previewRows,
          schoolId,
          classId: myClass?.id,
          examId: selectedExam,
          ...(selectedSubjects.length === 1 ? { subjectId: selectedSubject } : {}),
          term: selectedExamObj?.term || 'Term 1',
          academicYear: new Date().getFullYear().toString(),
          recordedBy: profile?.id,
          createMissing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Commit failed');
      toast({ title: 'Upload committed', description: `${data.saved} marks saved` });
      setPreviewRows(null);
      setUploadOpen(false);
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/marks', schoolId, myClass?.id] });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e.message });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const init: Record<string, string> = {};
    existingMarks.forEach((m: any) => {
      init[entryKey(m.student_id, m.subject_id)] = String(m.marks_obtained);
    });
    setEntries(init);
  }, [existingMarks, selectedExam, selectedSubjects.join(',')]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/marks/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks', schoolId, myClass?.id] });
      toast({ title: 'Marks saved successfully' });
      setEditReason('');
      setReasonOpen(false);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error saving marks', description: e.message }),
  });

  const doSave = async (reason?: string) => {
    if (!selectedSubjects.length || !selectedExam || !myClass) return;
    const examObj = exams.find((e: any) => e.id === selectedExam);
    const marksEntries = students.flatMap((s: any) =>
      subjectColumns.map((sub: any) => {
        const key = entryKey(s.id, sub.id);
        const value = entries[key];
        if (value === undefined || value === '') return null;
        return { studentId: s.id, subjectId: sub.id, marksObtained: value };
      }).filter((entry): entry is { studentId: string; subjectId: string; marksObtained: string } => entry !== null)
    );

    if (!marksEntries.length) {
      toast({ variant: 'destructive', title: 'No marks entered' });
      return;
    }

    const payload = {
      entries: marksEntries,
      examId: selectedExam,
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
        `Marks for ${subjectColumns.length === 1 ? subjectColumns[0]?.name ?? 'subject' : `${subjectColumns.length} subjects`} — ${examObj?.title ?? 'exam'} (${myClass.name})`
      );
      toast({
        title: 'Saved offline',
        description: `${marksEntries.length} marks queued — will sync automatically when you reconnect.`,
      });
      setEditReason('');
      setReasonOpen(false);
      return;
    }

    saveMut.mutate(payload);
  };

  const handleSaveClick = () => {
    const existingMap = existingMarks.reduce((acc: any, m: any) => {
      acc[entryKey(m.student_id, m.subject_id)] = m.marks_obtained;
      return acc;
    }, {} as Record<string, any>);
    const hasEdits = students.some((s: any) =>
      subjectColumns.some((sub: any) => {
        const key = entryKey(s.id, sub.id);
        const newVal = entries[key];
        const oldVal = existingMap[key];
        return newVal !== undefined && newVal !== '' && oldVal !== undefined && String(oldVal) !== newVal;
      })
    );

    if (hasEdits) {
      setReasonOpen(true);
    } else {
      doSave();
    }
  };

  const maxMarks = selectedExamObj?.total_marks || 100;
  const enteredCount = students.reduce((count: number, s: any) => {
    const anyEntered = subjectColumns.some((sub: any) => {
      const key = entryKey(s.id, sub.id);
      return entries[key] !== undefined && entries[key] !== '';
    });
    return count + (anyEntered ? 1 : 0);
  }, 0);
  const savedCount = existingMarks.length;

  const filtersReady = selectedSubjects.length > 0 && !!selectedExam;
  const selectedSubjectObj = selectedSubjects.length === 1 ? subjects.find((s: any) => s.id === selectedSubject) : null;

  return (
    <CTLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Enter Marks</h1>
          <p className="text-sm text-gray-500">
            {myClass?.name} · {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm p-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative" ref={subjectsRef}>
              <Label className="text-xs">Subjects *</Label>
              <button
                type="button"
                onClick={() => setSubjectsOpen(o => !o)}
                className="mt-1 w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-white px-3 py-2 text-left hover:border-orange-300 transition-colors"
              >
                <div className="flex flex-wrap gap-1 min-h-[22px] items-center">
                  {selectedSubjects.length === 0 ? (
                    <span className="text-sm text-gray-400">Select subjects...</span>
                  ) : (
                    subjectColumns.map((s: any) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        {s.code || s.name}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-orange-900"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubjects(prev => prev.filter(id => id !== s.id));
                            setEntries({});
                          }}
                        />
                      </span>
                    ))
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${subjectsOpen ? 'rotate-180' : ''}`} />
              </button>
              {subjectsOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto p-1">
                  {subjects.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
                      <Checkbox
                        checked={selectedSubjects.includes(s.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSubjects((prev) =>
                            checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id)
                          );
                          setEntries({});
                        }}
                      />
                      <span>{s.name}{s.code ? ` (${s.code})` : ''}</span>
                    </label>
                  ))}
                  {subjects.length === 0 && (
                    <p className="px-2 py-1.5 text-xs text-gray-500">No subjects available.</p>
                  )}
                </div>
              )}
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
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2.5">
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
              The subject teacher{unpermittedSubjects.length === 1 ? '' : 's'} for{' '}
              <strong>{unpermittedSubjects.map((s: any) => s.name).join(', ') || 'selected subjects'}</strong>{' '}
              {unpermittedSubjects.length === 1 ? 'has' : 'have'} not yet granted you permission to enter marks
              for this exam. Please ask them to allow access from their Marks Entry page.
            </p>
            <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 mt-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Waiting for subject teacher approval
            </div>
          </div>
        ) : (
          /* ── Entry form (when permitted) ─────────────────────── */
          <>
            {/* Permission + edit notice, combined into one row to save vertical space */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <strong>Access granted</strong> for {subjectColumns.map((s: any) => s.name).join(', ')}
                {isClassTeacherForClass ? ' via your class teacher assignment' : ''}
              </span>
              {savedCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-blue-700 border-l border-emerald-200 pl-4">
                  <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  {savedCount} saved — edits will ask for a reason
                </span>
              )}
            </div>

            <Card className="border-0 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  Enter marks out of <strong>{maxMarks}</strong>
                  {subjectColumns.length > 1 && (
                    <span className="text-gray-400 font-normal"> · {subjectColumns.length} subjects</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-orange-600 font-medium">
                    {enteredCount}/{students.length} entered
                  </span>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                        {subjectColumns.map((sub: any) => (
                          <th key={sub.id} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                            {sub.name}
                            <div className="normal-case font-normal text-gray-400">/{maxMarks}</div>
                          </th>
                        ))}
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {students.map((s: any, idx: number) => {
                        let rowEnteredCount = 0;
                        let rowEditedCount = 0;

                        const cells = subjectColumns.map((sub: any) => {
                          const key = entryKey(s.id, sub.id);
                          const val = entries[key];
                          const num = val !== undefined && val !== '' ? parseFloat(val) : null;
                          const valid = num !== null && !isNaN(num) && num >= 0 && num <= maxMarks;
                          const pct = valid && num !== null ? ((num / maxMarks) * 100).toFixed(0) : '';
                          const grade = valid && num !== null ? calcGrade(num, maxMarks) : '';
                          const savedMark = existingMarks.find(
                            (m: any) => m.student_id === s.id && m.subject_id === sub.id
                          );
                          const isEdited = !!savedMark && val !== undefined && val !== '' &&
                            String(savedMark.marks_obtained) !== val;

                          if (valid) rowEnteredCount++;
                          if (isEdited) rowEditedCount++;

                          return (
                            <td key={sub.id} className="px-3 py-2.5 text-center align-top">
                              <div className="flex flex-col items-center gap-1">
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
                                        setEntries(prev => ({ ...prev, [key]: v }));
                                      }
                                    }}
                                    className={`w-16 text-center px-2 py-1.5 text-sm border rounded-lg
                                      focus:outline-none focus:ring-1 focus:ring-orange-400 transition-colors
                                      ${val && !valid ? 'border-red-400 bg-red-50' : ''}
                                      ${valid && !isEdited ? 'border-emerald-300 bg-emerald-50/60' : ''}
                                      ${isEdited ? 'border-amber-400 bg-amber-50' : ''}
                                      ${!val && !isEdited ? 'border-gray-200 bg-white' : ''}
                                      ${isClosed ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
                                    placeholder="—"
                                  />
                                  {isEdited && (
                                    <span title="This mark is being edited">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 h-4">
                                  {pct && <span className="text-[10px] text-gray-400">{pct}%</span>}
                                  {grade && <Badge className={`text-[10px] px-1 py-0 leading-4 ${gradeColor(grade)}`}>{grade}</Badge>}
                                </div>
                                {savedMark && (
                                  <p className="text-[9px] text-emerald-600 leading-tight">
                                    saved: {savedMark.marks_obtained}
                                    {savedMark.edited_by_name && (
                                      <span className="text-amber-500"> · {savedMark.edited_by_name}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </td>
                          );
                        });

                        return (
                          <tr key={s.id} className="transition-colors hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs text-gray-400 align-top">{idx + 1}</td>
                            <td className="px-4 py-2.5 align-top">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0 uppercase">
                                  {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                </div>
                                <p className="text-sm font-medium text-gray-800">
                                  {s.first_name} {s.last_name}
                                </p>
                              </div>
                            </td>
                            {cells}
                            <td className="px-4 py-2.5 text-center align-top">
                              {rowEditedCount > 0 ? (
                                <span className="text-xs text-amber-600 font-medium">editing</span>
                              ) : subjectColumns.length > 0 && rowEnteredCount === subjectColumns.length ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                              ) : rowEnteredCount > 0 ? (
                                <span className="text-xs text-blue-500">{rowEnteredCount}/{subjectColumns.length}</span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {!isClosed && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-500">
                  {enteredCount > 0
                    ? `${enteredCount} student${enteredCount !== 1 ? 's' : ''} with marks ready to save`
                    : 'Enter marks above'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadOpen(true)}
                    disabled={!selectedSubjects.length || !selectedExam || !myClass?.id}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Marks
                  </Button>
                  <Button
                    onClick={handleSaveClick}
                    disabled={saveMut.isPending || enteredCount === 0}
                    className={`gap-2 min-w-[120px] ${!isOnline ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                  >
                    {!isOnline ? <WifiOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saveMut.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : 'Save Marks'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) { setUploadFile(null); setPreviewRows(null); setUploading(false); setCreateMissing(true); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Upload Marks</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Upload an Excel or CSV file with student admission numbers and marks for the selected class and subjects.</p>
            {selectedSubjects.length > 1 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Bulk upload currently supports one subject at a time. With {selectedSubjects.length} subjects
                  selected, the file will be parsed without a subject filter — make sure your sheet includes a
                  subject column, or narrow your subject selection to one before uploading.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>File</Label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Class</div>
                <div>{myClass?.name || '—'}</div>
              </div>
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Exam</div>
                <div>{selectedExamObj?.title || '—'}</div>
              </div>
              <div className="p-3 rounded border bg-slate-50 text-xs text-slate-700">
                <div className="font-semibold">Subjects</div>
                <div>{selectedSubjects.length === 0 ? '—' : selectedSubjects.length === 1 ? selectedSubjectObj?.name : `${selectedSubjects.length} subjects selected`}</div>
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
  {previewRows.slice(0, 10).map((r: any, idx: number) => (
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