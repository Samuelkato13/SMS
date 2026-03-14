import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Save, Star, CheckCircle2, Lock } from 'lucide-react';

const getGrade = (score: number, max: number): { grade: string; color: string } => {
  const pct = (score / max) * 100;
  if (pct >= 90) return { grade: 'D1', color: 'text-green-700 bg-green-100' };
  if (pct >= 80) return { grade: 'D2', color: 'text-green-600 bg-green-50' };
  if (pct >= 70) return { grade: 'C3', color: 'text-blue-700 bg-blue-100' };
  if (pct >= 60) return { grade: 'C4', color: 'text-blue-600 bg-blue-50' };
  if (pct >= 50) return { grade: 'C5', color: 'text-yellow-700 bg-yellow-100' };
  if (pct >= 45) return { grade: 'C6', color: 'text-yellow-600 bg-yellow-50' };
  if (pct >= 35) return { grade: 'P7', color: 'text-orange-600 bg-orange-100' };
  return { grade: 'F8', color: 'text-red-600 bg-red-100' };
};

export default function Marks() {
  const { profile } = useAuth();
  const { canCreate, canUpdate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const isSubjectTeacher = profile?.role === 'subject_teacher';
  const isHeadTeacher = profile?.role === 'head_teacher';

  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [localMarks, setLocalMarks] = useState<Record<string, string>>({});

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

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId, selectedClass],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}${selectedClass ? `&classId=${selectedClass}` : ''}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', selectedExam, selectedClass, selectedSubject],
    queryFn: () => fetch(`/api/marks?examId=${selectedExam}&classId=${selectedClass}&subjectId=${selectedSubject}`).then(r => r.json()),
    enabled: !!(selectedExam && selectedClass && selectedSubject),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/marks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marks'] });
      toast({ title: 'Marks saved successfully' });
      setLocalMarks({});
    },
    onError: (e: any) => toast({ title: 'Error saving marks', description: e.message, variant: 'destructive' }),
  });

  const selectedExamData = exams.find((e: any) => e.id === selectedExam);
  const maxMarks = selectedExamData?.max_marks || 100;
  const isLocked = selectedExamData?.is_locked;

  const handleSave = () => {
    const entries = Object.entries(localMarks).map(([studentId, score]) => ({
      studentId,
      examId: selectedExam,
      subjectId: selectedSubject,
      classId: selectedClass,
      schoolId,
      score: parseFloat(score),
      teacherId: profile?.id,
    }));
    if (entries.length === 0) return;
    entries.forEach(entry => saveMutation.mutate(entry));
  };

  const existingMarksMap = marks.reduce((acc: any, m: any) => {
    acc[m.student_id || m.studentId] = m.score;
    return acc;
  }, {});

  const canEdit = (canCreate('marks') || canUpdate('marks')) && !isLocked;

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
            <p className="text-gray-500 text-sm mt-1">
              {isSubjectTeacher ? 'Enter marks for your assigned subjects' : 'View and manage student marks'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Exam *</label>
                <Select value={selectedExam} onValueChange={setSelectedExam}>
                  <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                  <SelectContent>
                    {exams.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Class *</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Subject *</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marks Table */}
        {selectedExam && selectedClass && selectedSubject ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {students.length} Students · Max {maxMarks} marks
                  {isLocked && (
                    <Badge className="bg-red-100 text-red-700 border-0 ml-2 gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </Badge>
                  )}
                </CardTitle>
                {canEdit && Object.keys(localMarks).length > 0 && (
                  <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
                    <Save className="w-4 h-4" />
                    {saveMutation.isPending ? 'Saving...' : `Save ${Object.keys(localMarks).length} marks`}
                  </Button>
                )}
                {isHeadTeacher && !isLocked && marks.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                    <Lock className="w-4 h-4" /> Lock Marks
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead className="w-28">Score</TableHead>
                    <TableHead className="w-20">Grade</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student: any, i: number) => {
                    const saved = existingMarksMap[student.id];
                    const local = localMarks[student.id];
                    const displayScore = local !== undefined ? local : (saved !== undefined ? String(saved) : '');
                    const scoreNum = parseFloat(displayScore);
                    const grade = !isNaN(scoreNum) ? getGrade(scoreNum, maxMarks) : null;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm font-mono">
                          {student.admission_number || student.payment_code}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <Input
                              type="number"
                              min={0}
                              max={maxMarks}
                              value={displayScore}
                              placeholder="–"
                              className="w-20 h-8 text-sm"
                              onChange={e => setLocalMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                            />
                          ) : (
                            <span className="font-semibold">{displayScore || '–'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {grade && (
                            <Badge className={`text-xs border-0 ${grade.color}`}>{grade.grade}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {saved !== undefined ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not entered</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Star className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select filters above</h3>
              <p className="text-gray-500 text-sm mt-1">Choose an exam, class, and subject to view or enter marks.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
