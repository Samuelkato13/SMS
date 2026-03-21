import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Pencil, Eye, Printer, ShieldAlert, TrendingUp, User, Phone, MapPin, Heart, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import jsPDF from 'jspdf';

type EditForm = {
  firstName: string; lastName: string;
  guardianName: string; guardianPhone: string; guardianEmail: string;
  address: string; medicalInfo: string;
};

export default function CTStudents() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState<EditForm>({ firstName:'', lastName:'', guardianName:'', guardianPhone:'', guardianEmail:'', address:'', medicalInfo:'' });
  const [activeTab, setActiveTab] = useState<'personal'|'contact'|'medical'>('personal');

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
  const students = allStudents
    .filter((s: any) => s.class_id === myClass?.id)
    .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

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
      toast({ title: 'Student details updated successfully' });
      setEditing(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Update failed', description: e.message }),
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
    setActiveTab('personal');
    setForm({
      firstName: s.first_name || '',
      lastName: s.last_name || '',
      guardianName: s.guardian_name || '',
      guardianPhone: s.guardian_phone || '',
      guardianEmail: s.guardian_email || '',
      address: s.address || '',
      medicalInfo: s.medical_info || '',
    });
  };

  const handleSave = () => {
    updateMut.mutate({
      id: editing.id,
      data: {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        guardianEmail: form.guardianEmail,
        address: form.address,
        medicalInfo: form.medicalInfo,
      },
    });
  };

  const printReport = (s: any) => {
    const doc = new jsPDF();
    const sm = marks.filter((m: any) => m.student_id === s.id);
    const avg = getAvg(s.id);
    const attPct = getAttendancePct(s.id);

    // Header
    doc.setFillColor(234, 88, 12); doc.rect(0, 0, 210, 32, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('STUDENT PROFILE REPORT', 105, 14, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 105, 24, { align: 'center' });

    doc.setTextColor(30, 30, 30);
    let y = 45;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`${s.first_name} ${s.last_name}`, 15, y); y += 7;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.text(`Adm: ${s.student_number}  ·  Class: ${myClass?.name}  ·  ${s.gender?.toUpperCase() || ''}`, 15, y); y += 10;

    doc.setDrawColor(234, 88, 12); doc.setLineWidth(0.5); doc.line(15, y, 195, y); y += 8;

    // Info grid
    doc.setTextColor(30, 30, 30); doc.setFontSize(9);
    const info = [
      ['Date of Birth', s.date_of_birth ? new Date(s.date_of_birth + 'T00:00:00').toLocaleDateString('en-UG') : '—'],
      ['Gender', s.gender || '—'],
      ['Guardian', s.guardian_name],
      ['Phone', s.guardian_phone],
      ['Email', s.guardian_email || '—'],
      ['Address', s.address || '—'],
    ];
    info.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', 15, y);
      doc.setFont('helvetica', 'normal'); doc.text(value, 65, y, { maxWidth: 130 });
      y += 7;
    });

    if (s.medical_info) {
      y += 3; doc.setFont('helvetica', 'bold'); doc.text('Medical Notes:', 15, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.text(s.medical_info, 15, y, { maxWidth: 180 }); y += 10;
    }

    y += 3; doc.setDrawColor(200, 200, 200); doc.line(15, y, 195, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Academic Summary', 15, y); y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Class Average: ${avg ?? '—'}    Attendance Rate: ${attPct != null ? attPct + '%' : '—'}`, 15, y); y += 10;

    if (sm.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(253, 237, 213); doc.rect(15, y - 5, 180, 8, 'F');
      doc.text('Subject', 18, y); doc.text('Score', 100, y); doc.text('Grade', 145, y); y += 3;
      doc.setDrawColor(234, 88, 12); doc.line(15, y, 195, y); y += 6;
      doc.setFont('helvetica', 'normal');
      sm.forEach((m: any) => {
        doc.text(m.subject_name || '—', 18, y, { maxWidth: 75 });
        doc.text(`${m.marks_obtained}/${m.exam_total_marks}`, 100, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(m.grade === 'F8' ? 220 : 22, m.grade === 'F8' ? 38 : 163, m.grade === 'F8' ? 38 : 74);
        doc.text(m.grade || '—', 145, y); doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
        y += 7;
      });
    }

    y += 5; doc.setFont('helvetica', 'bold');
    doc.text(`Class Teacher: ${profile?.firstName} ${profile?.lastName}`, 15, y);
    doc.line(15, y + 5, 90, y + 5);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
    doc.text('Signature & Date', 15, y + 10);

    doc.save(`profile_${s.last_name}_${s.first_name}.pdf`);
    toast({ title: 'Profile report downloaded' });
  };

  const filtered = students.filter(s =>
    !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CTLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Students</h1>
          <p className="text-sm text-gray-500">{myClass?.name ?? '...'} · {students.length} students enrolled</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Class Teacher permissions:</strong> You can edit student names, contact details, address, and medical notes.
            Only the Director can add or remove students.
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search by name or admission no…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-gray-400">Loading students…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No students found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Parent / Contact</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Average</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Attendance</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s: any, idx: number) => {
                    const avg = getAvg(s.id);
                    const attPct = getAttendancePct(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0 uppercase">
                              {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-xs text-gray-400">{s.student_number}</p>
                                {s.section && (
                                  <span className={`text-xs px-1.5 py-0 rounded border font-medium ${
                                    s.section === 'boarding'
                                      ? 'bg-purple-50 text-purple-600 border-purple-200'
                                      : 'bg-green-50 text-green-600 border-green-200'
                                  }`}>
                                    {s.section === 'boarding' ? 'Boarding' : 'Day'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs font-medium text-gray-700">{s.guardian_name}</p>
                          <p className="text-xs text-gray-400">{s.guardian_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {avg
                            ? <span className={`text-sm font-bold ${parseFloat(avg) >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>{avg}</span>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {attPct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full ${attPct >= 80 ? 'bg-emerald-500' : attPct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${attPct}%` }} />
                              </div>
                              <span className={`text-xs font-semibold ${attPct >= 80 ? 'text-emerald-600' : attPct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{attPct}%</span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:bg-blue-50" onClick={() => setViewing(s)} title="View Profile">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-500 hover:bg-orange-50" onClick={() => openEdit(s)} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100" onClick={() => printReport(s)} title="Print Report">
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold">
                {editing?.first_name?.charAt(0)}{editing?.last_name?.charAt(0)}
              </div>
              Edit — {editing?.first_name} {editing?.last_name}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 -mt-1 mb-4">
            {[
              { id: 'personal' as const, label: 'Personal', icon: User },
              { id: 'contact'  as const, label: 'Contact',  icon: Phone },
              { id: 'medical'  as const, label: 'Medical',  icon: Heart },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors
                  ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {activeTab === 'personal' && (
              <>
                <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">
                  Edit the student's name if there was a spelling error. Other core data (admission no, DOB) is managed by the Director.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input className="mt-1" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input className="mt-1" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Home Address</Label>
                  <Input className="mt-1" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Village, Sub-county, District" />
                </div>
              </>
            )}
            {activeTab === 'contact' && (
              <>
                <div>
                  <Label className="text-xs">Guardian / Parent Name</Label>
                  <Input className="mt-1" value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Phone Number</Label>
                    <Input className="mt-1" value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} placeholder="07XX XXX XXX" />
                  </div>
                  <div>
                    <Label className="text-xs">Email (optional)</Label>
                    <Input type="email" className="mt-1" value={form.guardianEmail} onChange={e => setForm(f => ({ ...f, guardianEmail: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
            {activeTab === 'medical' && (
              <>
                <div className="bg-red-50 rounded-lg p-2.5 text-xs text-red-700 flex items-start gap-2">
                  <Heart className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Medical notes are confidential and only visible to school staff. Include allergies, chronic conditions, or special needs.
                </div>
                <div>
                  <Label className="text-xs">Medical Notes / Special Needs</Label>
                  <textarea
                    value={form.medicalInfo}
                    onChange={e => setForm(f => ({ ...f, medicalInfo: e.target.value }))}
                    rows={5}
                    placeholder="e.g. Allergic to penicillin. Has asthma — keep inhaler available. Wears glasses."
                    className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 min-w-[120px]"
              disabled={updateMut.isPending}
              onClick={handleSave}
            >
              {updateMut.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 mt-1">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                <div className="w-16 h-16 bg-orange-200 rounded-2xl flex items-center justify-center text-orange-800 text-2xl font-bold uppercase flex-shrink-0">
                  {viewing.first_name?.charAt(0)}{viewing.last_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{viewing.first_name} {viewing.last_name}</p>
                  <p className="text-sm text-gray-500">{viewing.student_number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-orange-100 text-orange-700 text-xs">{myClass?.name}</Badge>
                    <Badge className="bg-gray-100 text-gray-600 text-xs capitalize">{viewing.gender}</Badge>
                    {viewing.section && (
                      <Badge className={`text-xs capitalize ${viewing.section === 'boarding' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                        {viewing.section === 'boarding' ? 'Boarding' : 'Day'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />Date of Birth</p>
                  <p className="font-semibold mt-0.5">{viewing.date_of_birth ? new Date(viewing.date_of_birth + 'T00:00:00').toLocaleDateString('en-UG') : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Class Average</p>
                  <p className={`font-bold mt-0.5 text-lg ${parseFloat(getAvg(viewing.id) ?? '0') >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {getAvg(viewing.id) ?? '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />Guardian</p>
                  <p className="font-semibold mt-0.5 text-sm truncate">{viewing.guardian_name}</p>
                  <p className="text-xs text-gray-500">{viewing.guardian_phone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />Address</p>
                  <p className="font-semibold mt-0.5 text-sm">{viewing.address || '—'}</p>
                </div>
              </div>

              {viewing.medical_info && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1"><Heart className="w-3 h-3" />Medical Notes</p>
                  <p className="text-sm text-red-800">{viewing.medical_info}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}>
                  <Pencil className="w-4 h-4 mr-2" />Edit Details
                </Button>
                <Button className="bg-orange-600 hover:bg-orange-700 gap-2" onClick={() => printReport(viewing)}>
                  <Printer className="w-4 h-4" />Print Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CTLayout>
  );
}
