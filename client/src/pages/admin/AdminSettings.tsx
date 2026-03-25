import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen, Building2, Phone, Globe, Shield } from 'lucide-react';

export default function AdminSettings() {
  const { toast } = useToast();
  const [showSubject, setShowSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });
  const [editSubject, setEditSubject] = useState<any>(null);

  const { data: settings } = useQuery<any>({ queryKey: ['/api/admin/settings'] });

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', '/api/admin/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Settings saved' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const subjects: any[] = settings?.globalSubjects ?? [];

  const addSubjectMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/settings/subjects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: editSubject ? 'Subject updated' : 'Subject added' });
      setShowSubject(false);
      setSubjectForm({ name: '', code: '' });
      setEditSubject(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteSubjectMut = useMutation({
    mutationFn: (code: string) => apiRequest('DELETE', `/api/admin/settings/subjects/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Subject removed' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const openAddSubject = () => { setEditSubject(null); setSubjectForm({ name: '', code: '' }); setShowSubject(true); };
  const openEditSubject = (s: any) => { setEditSubject(s); setSubjectForm({ name: s.name, code: s.code }); setShowSubject(true); };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500">Platform-wide configuration</p>
        </div>

        {/* Platform info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">Platform Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Company Name</Label>
                <p className="text-sm font-medium text-gray-800">SKYVALE Technologies Uganda Limited</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Platform Name</Label>
                <p className="text-sm font-medium text-gray-800">ZaabuPay</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Domain</Label>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">zaabupayapp.com</p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Helpline</Label>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">0742 751 956</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">Security Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum Password Length</Label>
                <Input type="number" defaultValue={8} min={6} max={20} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Session Timeout (minutes)</Label>
                <Input type="number" defaultValue={120} min={15} max={480} className="h-9" />
              </div>
              <div className="col-span-2 flex gap-3">
                <Button onClick={() => toast({ title: 'Security settings saved' })}
                  className="bg-indigo-600 hover:bg-indigo-700" size="sm">
                  Save Security Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global subject pool */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-semibold text-gray-700">Global Subject Pool</CardTitle>
                <Badge className="bg-indigo-100 text-indigo-700 text-xs">{subjects.length} subjects</Badge>
              </div>
              <Button onClick={openAddSubject} size="sm" variant="outline" className="gap-1 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-3.5 h-3.5" />Add Subject
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No global subjects added yet. Schools can add their own.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {subjects.map((s: any) => (
                  <div key={s.code} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 group">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.code}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-indigo-600"
                        onClick={() => openEditSubject(s)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => deleteSubjectMut.mutate(s.code)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSubject} onOpenChange={setShowSubject}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Subject Name *</Label>
              <Input value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Mathematics" />
            </div>
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={subjectForm.code} onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MATH" className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubject(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!subjectForm.name || !subjectForm.code)
                return toast({ variant: 'destructive', title: 'Name and code are required' });
              addSubjectMut.mutate({ ...subjectForm, isEdit: !!editSubject });
            }} disabled={addSubjectMut.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {addSubjectMut.isPending ? 'Saving...' : editSubject ? 'Save Changes' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
