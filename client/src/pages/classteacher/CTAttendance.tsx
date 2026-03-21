import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/hooks/useOffline';
import { syncManager } from '@/lib/syncManager';
import { CalendarCheck, CheckCircle, XCircle, Clock, BarChart2, Save, Users, TrendingUp, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Status = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<Status, { label: string; activeClass: string; icon: typeof CheckCircle }> = {
  present: { label: 'Present', activeClass: 'bg-emerald-500 text-white border-emerald-500', icon: CheckCircle },
  absent:  { label: 'Absent',  activeClass: 'bg-red-500 text-white border-red-500',         icon: XCircle },
  late:    { label: 'Late',    activeClass: 'bg-amber-500 text-white border-amber-500',      icon: Clock },
  excused: { label: 'Excused', activeClass: 'bg-blue-500 text-white border-blue-500',        icon: CheckCircle },
};

function StatusBtn({ value, current, onChange }: { value: Status; current: Status; onChange: (v: Status) => void }) {
  const cfg = STATUS_CONFIG[value];
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
        ${active ? cfg.activeClass + ' shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      {cfg.label}
    </button>
  );
}

export default function CTAttendance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOffline();
  const schoolId = profile?.schoolId;
  const today = new Date().toISOString().split('T')[0];
  const [viewDate, setViewDate] = useState(today);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id && s.is_active !== false)
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/attendance?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  // Load saved attendance for the selected date when data changes
  useEffect(() => {
    if (!students.length) return;
    const dayRecords = attendance.filter((a: any) => a.attendance_date?.substring(0, 10) === viewDate);
    const init: Record<string, Status> = {};
    if (dayRecords.length > 0) {
      // Pre-fill from saved data
      dayRecords.forEach((a: any) => { init[a.student_id] = a.status as Status; });
      // For students not yet in records, default to present
      students.forEach((s: any) => { if (!init[s.id]) init[s.id] = 'present'; });
    } else {
      // Default all to present
      students.forEach((s: any) => { init[s.id] = 'present'; });
    }
    setRecords(init);
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate, attendance.length, students.length]);

  // FIXED: Each entry includes all required fields
  const submitMut = useMutation({
    mutationFn: (payload: { entries: any[] }) =>
      apiRequest('POST', '/api/attendance/bulk', payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance', schoolId, myClass?.id] });
      toast({ title: `Attendance saved — ${data?.saved ?? 0} records updated` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error saving attendance', description: e.message }),
  });

  const markAll = (status: Status) => {
    const upd: Record<string, Status> = {};
    students.forEach((s: any) => { upd[s.id] = status; });
    setRecords(upd);
  };

  const handleSubmit = async () => {
    if (!myClass) return;
    const entries = students.map((s: any) => ({
      studentId: s.id,
      classId: myClass.id,
      schoolId,
      attendanceDate: viewDate,
      status: records[s.id] || 'present',
      recordedBy: profile?.id,
    }));

    if (!isOnline) {
      await syncManager.queueAttendanceSave(
        { entries },
        `Attendance for ${myClass.name} on ${viewDate}`
      );
      toast({
        title: 'Saved offline',
        description: 'Attendance queued — will sync automatically when you reconnect.',
      });
      return;
    }

    submitMut.mutate({ entries });
  };

  const presentCount  = Object.values(records).filter(s => s === 'present').length;
  const absentCount   = Object.values(records).filter(s => s === 'absent').length;
  const lateCount     = Object.values(records).filter(s => s === 'late').length;
  const excusedCount  = Object.values(records).filter(s => s === 'excused').length;
  const todayHasSaved = attendance.some((a: any) => a.attendance_date?.substring(0, 10) === viewDate);

  // History stats — last 14 days
  const historyDates = [...new Set(
    attendance.map((a: any) => a.attendance_date?.substring(0, 10))
  )].filter(Boolean).sort((a, b) => b.localeCompare(a)).slice(0, 14) as string[];

  const dailyStats = historyDates.map(date => {
    const dayRecs = attendance.filter((a: any) => a.attendance_date?.substring(0, 10) === date);
    const present = dayRecs.filter((a: any) => a.status === 'present').length;
    const absent  = dayRecs.filter((a: any) => a.status === 'absent').length;
    const late    = dayRecs.filter((a: any) => a.status === 'late').length;
    const total   = dayRecs.length;
    return { date, present, absent, late, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
  });

  // Per-student attendance stats (overall)
  const studentStats = students.map((s: any) => {
    const sa = attendance.filter((a: any) => a.student_id === s.id);
    const pct = sa.length ? Math.round((sa.filter((a: any) => a.status === 'present').length / sa.length) * 100) : null;
    return { ...s, attendancePct: pct, total: sa.length };
  });

  return (
    <CTLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-500">{myClass?.name ?? '...'} · {students.length} students</p>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="gap-2">
            <BarChart2 className="w-4 h-4" />
            {showHistory ? 'Mark Attendance' : 'View History'}
          </Button>
        </div>

        {!showHistory ? (
          <>
            {/* Date selector + counters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <CalendarCheck className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 leading-none">Date</p>
                      <input
                        type="date"
                        value={viewDate}
                        onChange={e => setViewDate(e.target.value)}
                        max={today}
                        className="text-sm font-bold text-gray-800 border-0 outline-none bg-transparent cursor-pointer"
                      />
                    </div>
                    {viewDate === today && (
                      <Badge className="bg-orange-100 text-orange-700 text-[10px] px-2">Today</Badge>
                    )}
                    {todayHasSaved && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 gap-1 flex items-center">
                        <CheckCircle className="w-2.5 h-2.5" /> Saved
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 ml-auto flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <CheckCircle className="w-4 h-4" />{presentCount} Present
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
                      <XCircle className="w-4 h-4" />{absentCount} Absent
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                      <Clock className="w-4 h-4" />{lateCount} Late
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mark all buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 mr-1">Mark all as:</span>
              {(['present', 'absent', 'late', 'excused'] as Status[]).map(s => (
                <Button key={s} variant="outline" size="sm" className={`text-xs h-7 capitalize ${s === 'present' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : s === 'absent' ? 'border-red-300 text-red-600 hover:bg-red-50' : s === 'late' ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
                  onClick={() => markAll(s)}>{s}
                </Button>
              ))}
            </div>

            {/* Student list */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {!initialized || students.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">
                    {students.length === 0 ? 'No students in your class' : 'Loading students...'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {students.map((s: any, idx: number) => {
                      const status = records[s.id] || 'present';
                      return (
                        <div key={s.id} className={`flex items-center gap-4 px-4 py-3 transition-colors
                          ${status === 'present' ? 'hover:bg-emerald-50/30' : status === 'absent' ? 'bg-red-50/30 hover:bg-red-50/50' : status === 'late' ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-blue-50/30'}`}>
                          <span className="text-xs text-gray-400 w-6 flex-shrink-0 text-right">{idx + 1}</span>
                          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0 uppercase">
                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{s.last_name}, {s.first_name}</p>
                            <p className="text-xs text-gray-400">{s.student_number}</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {(['present', 'absent', 'late', 'excused'] as Status[]).map(v => (
                              <StatusBtn key={v} value={v} current={status} onChange={val => setRecords(r => ({ ...r, [s.id]: val }))} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary bar + Submit */}
            {students.length > 0 && (
              <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-gray-700">{students.length} students total</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-600">{presentCount} present</span>
                    <span className="text-red-500">{absentCount} absent</span>
                    <span className="text-amber-600">{lateCount} late</span>
                    {excusedCount > 0 && <span className="text-blue-500">{excusedCount} excused</span>}
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMut.isPending || !myClass}
                  className={`gap-2 min-w-[150px] ${!isOnline ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                >
                  {!isOnline ? <WifiOff className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {submitMut.isPending ? 'Saving...' : !isOnline ? 'Save Offline' : todayHasSaved && viewDate === today ? 'Update Attendance' : 'Submit Attendance'}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* History view */
          <div className="space-y-5">
            {/* Per-student summary */}
            <Card className="border-0 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" />Student Attendance Summary
                </h3>
              </div>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {studentStats.filter(s => s.total > 0).sort((a:any,b:any)=>(b.attendancePct??0)-(a.attendancePct??0)).map((s: any) => {
                      const absentDays = attendance.filter((a: any) => a.student_id === s.id && a.status === 'absent').length;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                                {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                              </div>
                              <p className="text-sm font-medium text-gray-800">{s.first_name} {s.last_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center text-sm text-gray-500">{s.total}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-emerald-600 font-semibold">{s.total - absentDays}</td>
                          <td className="px-4 py-2.5 text-center text-sm text-red-500 font-semibold">{absentDays}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden max-w-[80px]">
                                <div
                                  className={`h-full rounded-full ${s.attendancePct >= 80 ? 'bg-emerald-500' : s.attendancePct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${s.attendancePct ?? 0}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${s.attendancePct >= 80 ? 'text-emerald-600' : s.attendancePct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                                {s.attendancePct ?? 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {studentStats.every(s => s.total === 0) && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No attendance records yet</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Daily history */}
            <Card className="border-0 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />Daily History — Last 14 Days
                </h3>
              </div>
              <CardContent className="p-0">
                {dailyStats.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No attendance records yet</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Present</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Absent</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Late</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Attendance Rate</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dailyStats.map(d => (
                        <tr key={d.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-800">
                              {new Date(d.date + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                            {d.date === today && <Badge className="text-[10px] bg-orange-100 text-orange-700 mt-0.5">Today</Badge>}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{d.present}</td>
                          <td className="px-4 py-3 text-center font-bold text-red-500">{d.absent}</td>
                          <td className="px-4 py-3 text-center font-bold text-amber-600">{d.late}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-28 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${d.rate >= 80 ? 'bg-emerald-500' : d.rate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${d.rate}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${d.rate >= 80 ? 'text-emerald-600' : d.rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{d.rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="text-xs text-orange-600 h-7 hover:bg-orange-50"
                              onClick={() => { setViewDate(d.date); setShowHistory(false); }}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CTLayout>
  );
}
