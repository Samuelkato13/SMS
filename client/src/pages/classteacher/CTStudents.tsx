import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Pencil, Eye, Printer, ShieldAlert, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';

export default function CTStudents() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({ guardianName: '', guardianPhone: '', guardianEmail: '', address: '' });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  const { data: allStudents = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id);

  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ['/api/marks', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/attendance?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest('PUT', `/api/students/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students', schoolId] });
      toast({ title: 'Student details updated' });
      setEditing(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const getAvg = (studentId: string) => {
    const sm = marks.filter((m: any) => m.student_id === studentId);
    if (!sm.length) return null;
    return (sm.reduce((a: number, m: any) => a + Number(m.marks_obtained), 0) / sm.length).toFixed(1);
  };

  const getAttendancePct = (studentId: string) => {
    const sa = attendance.filter((a: any) => a.student_id === studentId);
    if (!sa.length) return null;
    return Math.round((sa.filter((a: any) => a.status === 'present').length / sa.length) * 100);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ guardianName: s.guardian_name||'', guardianPhone: s.guardian_phone||'', guardianEmail: s.guardian_email||'', address: s.address||'' });
  };

  const printProfile = (s: any) => {
    const doc = new jsPDF();
    const sm = marks.filter((m: any) => m.student_id === s.id);
    const avg = getAvg(s.id);
    const attPct = getAttendancePct(s.id);

    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('STUDENT PROFILE REPORT', 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(`Name: ${s.first_name} ${s.last_name}`, 20, 40);
    doc.text(`Adm No: ${s.student_number}`, 20, 50);
    doc.text(`Class: ${myClass?.name || '—'}`, 20, 60);
    doc.text(`Date of Birth: ${s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-UG') : '—'}`, 20, 70);
    doc.text(`Gender: ${s.gender || '—'}`, 20, 80);
    doc.text(`Guardian: ${s.guardian_name} · ${s.guardian_phone}`, 20, 90);
    doc.text(`Address: ${s.address || '—'}`, 20, 100);
    doc.text(`Class Average: ${avg ?? '—'}`, 20, 115);
    doc.text(`Attendance Rate: ${attPct != null ? `${attPct}%` : '—'}`, 20, 125);

    if (sm.length) {
      doc.setFont('helvetica','bold'); doc.text('Academic Records:', 20, 140);
      let y = 150; doc.setFont('helvetica','normal');
      sm.forEach((m: any) => {
        doc.text(`${m.subject_name}: ${m.marks_obtained}/${m.exam_total_marks} (${m.grade})`, 20, y);
        y += 8;
      });
    }
    doc.save(`profile_${s.last_name}_${s.first_name}.pdf`);
    toast({ title: 'Profile report downloaded' });
  };

  const filtered = students.filter((s: any) =>
    !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Students</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · {students.length} students</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">You can <strong>edit</strong> contact and address details. Only the Director can add or remove students.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search by name or admission no..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No students found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Adm No / Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Parent Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Avg</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Attendance</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s: any) => {
                    const avg = getAvg(s.id);
                    const attPct = getAttendancePct(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                              {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-gray-400">{s.student_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-gray-700">{s.guardian_name}</p>
                          <p className="text-xs text-gray-400">{s.guardian_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          {avg ? <span className={`text-sm font-bold ${parseFloat(avg)>=50?'text-emerald-600':'text-red-500'}`}>{avg}</span>
                               : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {attPct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div className={`h-full rounded-full ${attPct>=80?'bg-emerald-500':attPct>=60?'bg-yellow-400':'bg-red-400'}`} style={{ width: `${attPct}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{attPct}%</span>
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50" onClick={() => setViewing(s)} title="View Profile"><Eye className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50" onClick={() => openEdit(s)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100" onClick={() => printProfile(s)} title="Print Report"><Printer className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={open=>!open&&setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Student — {editing?.first_name} {editing?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">Editing contact and address info only. Core student data is managed by the Director.</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Guardian Name</Label><Input value={form.guardianName} onChange={e=>setForm(f=>({...f,guardianName:e.target.value}))} /></div>
              <div><Label>Guardian Phone</Label><Input value={form.guardianPhone} onChange={e=>setForm(f=>({...f,guardianPhone:e.target.value}))} /></div>
            </div>
            <div><Label>Guardian Email</Label><Input type="email" value={form.guardianEmail} onChange={e=>setForm(f=>({...f,guardianEmail:e.target.value}))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" disabled={updateMut.isPending}
                onClick={()=>updateMut.mutate({ id:editing.id, data:{ guardianName:form.guardianName, guardianPhone:form.guardianPhone, guardianEmail:form.guardianEmail, address:form.address } })}>
                {updateMut.isPending?'Saving...':'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={open=>!open&&setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Student Profile — {viewing?.first_name} {viewing?.last_name}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-700 text-2xl font-bold">
                  {viewing.first_name?.charAt(0)}{viewing.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">{viewing.first_name} {viewing.last_name}</p>
                  <p className="text-sm text-gray-500">{viewing.student_number} · <span className="capitalize">{viewing.gender}</span></p>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">{myClass?.name}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Date of Birth</p><p className="font-medium">{viewing.date_of_birth ? new Date(viewing.date_of_birth).toLocaleDateString('en-UG') : '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Avg Score</p><p className={`font-bold ${parseFloat(getAvg(viewing.id)??'0')>=50?'text-emerald-600':'text-red-500'}`}>{getAvg(viewing.id) ?? '—'}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Guardian</p><p className="font-medium truncate">{viewing.guardian_name}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{viewing.guardian_phone}</p></div>
                <div className="bg-gray-50 rounded-lg p-3 col-span-2"><p className="text-xs text-gray-500">Address</p><p className="font-medium">{viewing.address || '—'}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit Details</Button>
                <Button className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={() => printProfile(viewing)}><Printer className="w-4 h-4" />Print Report</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CTLayout>
  );
}
