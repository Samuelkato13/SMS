import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useOffline } from '@/hooks/useOffline';
import { syncManager } from '@/lib/syncManager';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Save, CalendarDays, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function Attendance() {
  const { profile } = useAuth();
  const { canCreate, canUpdate } = useRole();
  const { isOnline } = useOffline();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatus>>({});

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId, selectedClass],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}${selectedClass ? `&classId=${selectedClass}` : ''}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance', selectedClass, selectedDate],
    queryFn: () => fetch(`/api/attendance?schoolId=${schoolId}&classId=${selectedClass}&date=${selectedDate}`).then(r => r.json()),
    enabled: !!(schoolId && selectedClass && selectedDate),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/attendance/bulk', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      toast({ title: `Attendance saved — ${res?.saved || 0} records updated` });
      setLocalStatus({});
    },
    onError: (e: any) => toast({ title: 'Error saving attendance', description: e.message, variant: 'destructive' }),
  });

  const existingMap = attendance.reduce((acc: any, a: any) => {
    acc[a.student_id || a.studentId] = a.status;
    return acc;
  }, {});

  const handleMarkAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {};
    students.forEach((s: any) => { all[s.id] = status; });
    setLocalStatus(all);
  };

  const handleSave = async () => {
    const entries = Object.entries(localStatus).map(([studentId, status]) => ({
      studentId, status, classId: selectedClass, schoolId,
      attendanceDate: selectedDate, recordedBy: profile?.id,
    }));

    if (!entries.length) return;

    if (!isOnline) {
      const cls = classes.find((c: any) => c.id === selectedClass);
      const className = cls?.name || 'class';
      await syncManager.queueAttendanceSave(
        { entries },
        `Attendance for ${className} on ${format(new Date(selectedDate), 'MMM d, yyyy')} (${entries.length} students)`
      );
      toast({
        title: 'Saved offline',
        description: `Attendance queued. Will sync when reconnected.`,
      });
      setLocalStatus({});
      return;
    }

    // Online: use bulk endpoint
    saveMutation.mutate({ entries });
  };

  const canEdit = canCreate('attendance') || canUpdate('attendance');
  const presentCount = students.filter((s: any) => {
    const st = localStatus[s.id] || existingMap[s.id];
    return st === 'present';
  }).length;

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-gray-500 text-sm mt-1">Track daily student attendance</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && students.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  {format(new Date(selectedDate), 'MMMM d, yyyy')} ·{' '}
                  <span className="text-green-600">{presentCount} present</span> / {students.length}
                </CardTitle>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleMarkAll('present')}>
                      All Present
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleMarkAll('absent')}>
                      All Absent
                    </Button>
                    {Object.keys(localStatus).length > 0 && (
                      <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}
                        className={`gap-1.5 h-8 ${!isOnline ? 'bg-gray-700 hover:bg-gray-600' : ''}`}>
                        {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        {saveMutation.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : 'Save'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student: any, i: number) => {
                    const status = (localStatus[student.id] || existingMap[student.id] || '') as AttendanceStatus;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm font-mono">
                          {student.payment_code}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <div className="flex gap-1.5 flex-wrap">
                              {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setLocalStatus(prev => ({ ...prev, [student.id]: s }))}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                                    status === s
                                      ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current'
                                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          ) : (
                            status ? (
                              <Badge className={`text-xs border-0 capitalize ${STATUS_COLORS[status]}`}>{status}</Badge>
                            ) : <span className="text-gray-400 text-xs">–</span>
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
              <CheckSquare className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Select a class to begin</h3>
              <p className="text-gray-500 text-sm mt-1">Choose a class and date to view or record attendance.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
