import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, UserPlus, GraduationCap, BookMarked } from 'lucide-react';

type Variant = 'director' | 'headteacher' | 'embedded';

export default function TeachingAssignments({ variant }: { variant: Variant }) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const managerId = profile?.id;

  const [ctUserId, setCtUserId] = useState('');
  const [ctClassId, setCtClassId] = useState('');
  const [scUserId, setScUserId] = useState('');
  const [scClassId, setScClassId] = useState('');
  const [scSubjectId, setScSubjectId] = useState('');

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['/api/staff-assignments', schoolId, managerId],
    queryFn: () =>
      fetch(
        `/api/staff-assignments?schoolId=${encodeURIComponent(schoolId!)}&managerUserId=${encodeURIComponent(managerId!)}`
      ).then(async (r) => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || r.statusText);
        return JSON.parse(text);
      }),
    enabled: !!schoolId && !!managerId,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users', schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then((r) => r.json()),
    enabled: !!schoolId,
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then((r) => r.json()),
    enabled: !!schoolId,
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then((r) => r.json()),
    enabled: !!schoolId,
  });

  const staffList = users.filter((u: any) => !['super_admin', 'director'].includes(u.role));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/staff-assignments', schoolId, managerId] });
    queryClient.invalidateQueries({ queryKey: ['/api/classes', schoolId] });
  };

  const addCt = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/staff-assignments/class-teacher', {
        userId: ctUserId,
        classId: ctClassId,
        schoolId,
        assignerUserId: managerId,
      }),
    onSuccess: () => {
      toast({ title: 'Class teacher assignment saved' });
      setCtUserId('');
      setCtClassId('');
      invalidate();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const addSc = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/api/staff-assignments/subject-class', {
        userId: scUserId,
        classId: scClassId,
        subjectId: scSubjectId,
        schoolId,
        assignerUserId: managerId,
      }),
    onSuccess: () => {
      toast({ title: 'Subject–class assignment saved' });
      setScUserId('');
      setScClassId('');
      setScSubjectId('');
      invalidate();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const delCt = useMutation({
    mutationFn: (id: string) =>
      apiRequest(
        'DELETE',
        `/api/staff-assignments/class-teacher/${id}?assignerUserId=${encodeURIComponent(managerId!)}&schoolId=${encodeURIComponent(schoolId!)}`
      ),
    onSuccess: () => {
      toast({ title: 'Removed' });
      invalidate();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const delSc = useMutation({
    mutationFn: (id: string) =>
      apiRequest(
        'DELETE',
        `/api/staff-assignments/subject-class/${id}?assignerUserId=${encodeURIComponent(managerId!)}&schoolId=${encodeURIComponent(schoolId!)}`
      ),
    onSuccess: () => {
      toast({ title: 'Removed' });
      invalidate();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const classTeachers = bundle?.classTeachers ?? [];
  const subjectClass = bundle?.subjectClassTeachers ?? [];

  const inner = (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Teaching assignments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assign who is the <strong>class teacher</strong> for each class, and which <strong>subject + class</strong> pairs each staff member teaches (for example: P1 English and P4 Science for the same person). These rules control who can{' '}
          <strong>record marks</strong> for each class and subject. Directors, head teachers, and school admins can manage this.
        </p>
      </div>

      {!schoolId || !managerId ? (
        <Card>
          <CardContent className="py-8 text-sm text-gray-500">
            Your account needs a school before you can manage assignments.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="class">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="class" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              Class teacher
            </TabsTrigger>
            <TabsTrigger value="subject" className="gap-2">
              <BookMarked className="w-4 h-4" />
              Subject in class
            </TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="mt-4 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add class teacher assignment</CardTitle>
                <CardDescription>
                  Links a staff member to a class. If the class has no homeroom teacher yet, this also fills that field.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-end">
                <div className="min-w-[200px] flex-1">
                  <Label className="text-xs">Staff member</Label>
                  <Select value={ctUserId || undefined} onValueChange={setCtUserId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[180px] flex-1">
                  <Label className="text-xs">Class</Label>
                  <Select value={ctClassId || undefined} onValueChange={setCtClassId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.level ? ` · ${c.level}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                  disabled={!ctUserId || !ctClassId || addCt.isPending}
                  onClick={() => addCt.mutate()}
                >
                  <UserPlus className="w-4 h-4" />
                  Save
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Current class teacher assignments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="p-6 text-sm text-gray-500">Loading…</p>
                ) : classTeachers.length === 0 ? (
                  <p className="p-6 text-sm text-gray-400">None yet — add above.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Staff</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Class</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classTeachers.map((row: any) => (
                        <tr key={row.id}>
                          <td className="px-4 py-2">
                            {row.first_name} {row.last_name}{' '}
                            <span className="text-gray-400 text-xs">({row.user_role})</span>
                          </td>
                          <td className="px-4 py-2">{row.class_name}</td>
                          <td className="px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 h-8"
                              onClick={() => delCt.mutate(row.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subject" className="mt-4 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Add subject + class assignment</CardTitle>
                <CardDescription>
                  One row per combination (e.g. English in P1, Science in P4). The same teacher can have several rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-end">
                <div className="min-w-[200px] flex-1">
                  <Label className="text-xs">Staff member</Label>
                  <Select value={scUserId || undefined} onValueChange={setScUserId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <Label className="text-xs">Class</Label>
                  <Select value={scClassId || undefined} onValueChange={setScClassId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <Label className="text-xs">Subject</Label>
                  <Select value={scSubjectId || undefined} onValueChange={setScSubjectId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  disabled={!scUserId || !scClassId || !scSubjectId || addSc.isPending}
                  onClick={() => addSc.mutate()}
                >
                  <UserPlus className="w-4 h-4" />
                  Save
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subject–class assignments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="p-6 text-sm text-gray-500">Loading…</p>
                ) : subjectClass.length === 0 ? (
                  <p className="p-6 text-sm text-gray-400">None yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Staff</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Class</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Subject</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {subjectClass.map((row: any) => (
                        <tr key={row.id}>
                          <td className="px-4 py-2">
                            {row.first_name} {row.last_name}
                          </td>
                          <td className="px-4 py-2">{row.class_name}</td>
                          <td className="px-4 py-2">{row.subject_name}</td>
                          <td className="px-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 h-8"
                              onClick={() => delSc.mutate(row.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  if (variant === 'director') return <DirectorLayout>{inner}</DirectorLayout>;
  if (variant === 'headteacher') return <HTLayout>{inner}</HTLayout>;
  return inner;
}
