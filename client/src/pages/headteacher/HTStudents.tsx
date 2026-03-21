import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Pencil, UserSquare2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HTStudents() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ guardianName: '', guardianPhone: '', guardianEmail: '', address: '', medicalInfo: '' });

  const { data: students = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
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

  const filtered = students.filter((s: any) => {
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === 'all' || s.class_id === classFilter;
    return matchSearch && matchClass;
  });

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      guardianName: s.guardian_name || '',
      guardianPhone: s.guardian_phone || '',
      guardianEmail: s.guardian_email || '',
      address: s.address || '',
      medicalInfo: s.medical_info || '',
    });
  };

  return (
    <HTLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students.length} students enrolled</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">You can <strong>edit</strong> student contact and medical details. Adding or removing students is restricted to the Director.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search students..." value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c:any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">{filtered.length} students</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading students...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No students found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Student No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Guardian</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">
                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400 capitalize">{s.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{s.student_number}</td>
                      <td className="px-4 py-3">
                        <Badge className="text-xs bg-blue-50 text-blue-700">{s.class_name || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-700">{s.guardian_name || '—'}</p>
                        <p className="text-xs text-gray-400">{s.guardian_phone || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs ${s.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                          {s.section && (
                            <Badge className={`text-xs ${s.section === 'boarding' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                              {s.section === 'boarding' ? 'Boarding' : 'Day'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />Edit
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

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student Details — {editing?.first_name} {editing?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">
              You can edit contact and medical information. Core student data (name, class, ID) is managed by the Director.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Guardian Name</Label><Input value={form.guardianName} onChange={e=>setForm(f=>({...f,guardianName:e.target.value}))} /></div>
              <div><Label>Guardian Phone</Label><Input value={form.guardianPhone} onChange={e=>setForm(f=>({...f,guardianPhone:e.target.value}))} /></div>
            </div>
            <div><Label>Guardian Email</Label><Input type="email" value={form.guardianEmail} onChange={e=>setForm(f=>({...f,guardianEmail:e.target.value}))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} /></div>
            <div>
              <Label>Medical Information</Label>
              <textarea
                value={form.medicalInfo}
                onChange={e=>setForm(f=>({...f,medicalInfo:e.target.value}))}
                placeholder="Any allergies, conditions, or medical notes..."
                className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none h-20 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={()=>setEditing(null)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={updateMut.isPending}
                onClick={() => updateMut.mutate({ id: editing.id, data: { guardianName: form.guardianName, guardianPhone: form.guardianPhone, guardianEmail: form.guardianEmail, address: form.address } })}
              >
                {updateMut.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HTLayout>
  );
}
