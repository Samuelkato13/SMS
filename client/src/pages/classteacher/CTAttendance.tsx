import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarCheck, CheckCircle, XCircle, Clock, BarChart2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Status = 'present' | 'absent' | 'late' | 'excused';

function StatusBtn({ value, current, onChange, label, color }: any) {
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
        ${active ? `${color} border-transparent shadow-sm` : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
    >
      {label}
    </button>
  );
}

export default function CTAttendance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const today = new Date().toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState(today);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [showHistory, setShowHistory] = useState(false);

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

  const { data: attendance = [], refetch } = useQuery<any[]>({
    queryKey: ['/api/attendance', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/attendance?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const todayAttendance = attendance.filter((a: any) => a.attendance_date?.substring(0,10) === viewDate);
  const alreadySubmitted = todayAttendance.length > 0;

  useEffect(() => {
    if (alreadySubmitted) {
      const init: Record<string, Status> = {};
      todayAttendance.forEach((a: any) => { init[a.student_id] = a.status; });
      setRecords(init);
    } else {
      const init: Record<string, Status> = {};
      students.forEach((s: any) => { init[s.id] = 'present'; });
      setRecords(init);
    }
  }, [attendance.length, viewDate, students.length]);

  const submitMut = useMutation({
    mutationFn: (entries: any[]) => apiRequest('POST', '/api/attendance/bulk', { entries, classId: myClass?.id, schoolId, date: viewDate, recordedBy: profile?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance', schoolId, myClass?.id] });
      toast({ title: `Attendance saved for ${viewDate}` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const markAllPresent = () => {
    const upd: Record<string, Status> = {};
    students.forEach((s: any) => { upd[s.id] = 'present'; });
    setRecords(upd);
  };

  const handleSubmit = () => {
    const entries = students.map((s: any) => ({ studentId: s.id, status: records[s.id] || 'present' }));
    submitMut.mutate(entries);
  };

  const presentCount = Object.values(records).filter(s => s === 'present').length;
  const absentCount = Object.values(records).filter(s => s === 'absent').length;
  const lateCount = Object.values(records).filter(s => s === 'late').length;

  const historyDates = [...new Set(attendance.map((a: any) => a.attendance_date?.substring(0,10)))].sort((a,b) => b.localeCompare(a)).slice(0,14);
  const dailyStats = historyDates.map(date => {
    const dayRecs = attendance.filter((a: any) => a.attendance_date?.substring(0,10) === date);
    return {
      date,
      present: dayRecs.filter((a: any) => a.status === 'present').length,
      absent: dayRecs.filter((a: any) => a.status === 'absent').length,
      late: dayRecs.filter((a: any) => a.status === 'late').length,
      total: dayRecs.length,
    };
  });

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · {students.length} students</p>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <BarChart2 className="w-4 h-4 mr-2" />{showHistory ? 'Take Attendance' : 'View History'}
          </Button>
        </div>

        {!showHistory ? (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-orange-500" />
                    <input type="date" value={viewDate} onChange={e=>setViewDate(e.target.value)}
                      className="text-sm font-semibold text-gray-700 border-0 outline-none bg-transparent" />
                    {viewDate === today && <Badge className="bg-orange-100 text-orange-700 text-[10px]">Today</Badge>}
                  </div>
                  <div className="flex items-center gap-4 ml-auto">
                    <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium"><CheckCircle className="w-4 h-4" />{presentCount}</span>
                    <span className="flex items-center gap-1 text-sm text-red-500 font-medium"><XCircle className="w-4 h-4" />{absentCount}</span>
                    <span className="flex items-center gap-1 text-sm text-amber-600 font-medium"><Clock className="w-4 h-4" />{lateCount}</span>
                    <Button variant="outline" size="sm" onClick={markAllPresent} className="text-xs">Mark All Present</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {alreadySubmitted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Attendance was already submitted for this date. You can update it below.
              </div>
            )}

            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No students in your class</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {students.map((s: any, idx: number) => (
                      <div key={s.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <span className="text-xs text-gray-400 w-6 flex-shrink-0">{idx + 1}</span>
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                          {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                          <p className="text-xs text-gray-400">{s.student_number}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <StatusBtn value="present" current={records[s.id]} onChange={(v:Status)=>setRecords(r=>({...r,[s.id]:v}))} label="Present" color="bg-emerald-500 text-white" />
                          <StatusBtn value="absent"  current={records[s.id]} onChange={(v:Status)=>setRecords(r=>({...r,[s.id]:v}))} label="Absent"  color="bg-red-500 text-white" />
                          <StatusBtn value="late"    current={records[s.id]} onChange={(v:Status)=>setRecords(r=>({...r,[s.id]:v}))} label="Late"    color="bg-amber-500 text-white" />
                          <StatusBtn value="excused" current={records[s.id]} onChange={(v:Status)=>setRecords(r=>({...r,[s.id]:v}))} label="Excused" color="bg-blue-500 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={submitMut.isPending || students.length === 0} className="bg-orange-600 hover:bg-orange-700 gap-2 min-w-[140px]">
                <Save className="w-4 h-4" />{submitMut.isPending ? 'Saving...' : 'Submit Attendance'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Attendance History — Last 14 Days</h3>
            {dailyStats.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">No attendance records yet</div>
            ) : (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dailyStats.map(d => {
                        const rate = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                        return (
                          <tr key={d.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-800">{new Date(d.date).toLocaleDateString('en-UG', { weekday:'short', month:'short', day:'numeric' })}</p>
                              {d.date === today && <Badge className="text-[10px] bg-orange-100 text-orange-700">Today</Badge>}
                            </td>
                            <td className="px-4 py-3 text-center"><span className="text-emerald-600 font-semibold text-sm">{d.present}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-red-500 font-semibold text-sm">{d.absent}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-amber-600 font-semibold text-sm">{d.late}</span></td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${rate>=80?'bg-emerald-500':rate>=60?'bg-amber-400':'bg-red-400'}`} style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-semibold text-gray-700">{rate}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" className="text-xs text-orange-600 h-7" onClick={() => { setViewDate(d.date); setShowHistory(false); }}>Edit</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </CTLayout>
  );
}
