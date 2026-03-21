import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, CheckCircle2, School, CalendarDays, BookOpen, Layers, Users2, GitBranch, Upload, Landmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/contexts/SchoolContext';

const NURSERY_CLASSES = ['Baby Class', 'Middle Class', 'Top Class'];
const PRIMARY_CLASSES = ['P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7'];
const SECONDARY_CLASSES = ['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'];
const CLASS_SUGGESTIONS: Record<string, string[]> = { Nursery: NURSERY_CLASSES, Primary: PRIMARY_CLASSES, Secondary: SECONDARY_CLASSES };

export default function SchoolSetup() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { school } = useSchoolContext();
  const schoolId = profile?.schoolId;

  const { data: schoolData } = useQuery<any>({ queryKey: ['/api/schools', schoolId], queryFn: () => fetch(`/api/schools/${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const [schoolForm, setSchoolForm] = useState({ name: school?.name ?? '', address: school?.address ?? '', phone: school?.phone ?? '', email: school?.email ?? '', motto: school?.motto ?? '', schoolType: '', sectionType: '', logoUrl: '' });
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Academic Years
  const [showYearForm, setShowYearForm] = useState(false);
  const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });

  // Terms
  const [showTermForm, setShowTermForm] = useState(false);
  const [termForm, setTermForm] = useState({ name: 'Term I', startDate: '', endDate: '', academicYearId: '' });

  // Sections
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionName, setSectionName] = useState('Primary');

  // Classes
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', section: 'Primary', level: '' });
  const [classSuggSection, setClassSuggSection] = useState('Primary');

  // Streams
  const [showStreamForm, setShowStreamForm] = useState(false);
  const [streamForm, setStreamForm] = useState({ name: '', classId: '' });

  const { data: academicYears = [], isLoading: loadingYears } = useQuery<any[]>({ queryKey: ['/api/academic-years', schoolId], queryFn: () => fetch(`/api/academic-years?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: terms = [] } = useQuery<any[]>({ queryKey: ['/api/terms', schoolId], queryFn: () => fetch(`/api/terms?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: sections = [] } = useQuery<any[]>({ queryKey: ['/api/sections', schoolId], queryFn: () => fetch(`/api/sections?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ['/api/classes', schoolId], queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: streams = [] } = useQuery<any[]>({ queryKey: ['/api/streams', schoolId], queryFn: () => fetch(`/api/streams?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: subjects = [] } = useQuery<any[]>({ queryKey: ['/api/subjects', schoolId], queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const createYear = useMutation({ mutationFn: (d: any) => apiRequest('POST', '/api/academic-years', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/academic-years', schoolId] }); toast({ title: 'Academic year created' }); setShowYearForm(false); setYearForm({ name: '', startDate: '', endDate: '', isActive: false }); } });
  const createTerm = useMutation({ mutationFn: (d: any) => apiRequest('POST', '/api/terms', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/terms', schoolId] }); toast({ title: 'Term created' }); setShowTermForm(false); } });
  const createSection = useMutation({ mutationFn: (d: any) => apiRequest('POST', '/api/sections', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/sections', schoolId] }); toast({ title: 'Section created' }); setShowSectionForm(false); } });
  const createClass = useMutation({ mutationFn: (d: any) => apiRequest('POST', '/api/classes', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/classes', schoolId] }); toast({ title: 'Class created' }); setShowClassForm(false); setClassForm({ name: '', section: 'Primary', level: '' }); } });
  const createStream = useMutation({ mutationFn: (d: any) => apiRequest('POST', '/api/streams', d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/streams', schoolId] }); toast({ title: 'Stream created' }); setShowStreamForm(false); setStreamForm({ name: '', classId: '' }); } });
  const deleteClass = useMutation({ mutationFn: (id: string) => apiRequest('DELETE', `/api/classes/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/classes', schoolId] }); toast({ title: 'Class deleted' }); } });
  const deleteStream = useMutation({ mutationFn: (id: string) => apiRequest('DELETE', `/api/streams/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/streams', schoolId] }); toast({ title: 'Stream deleted' }); } });
  const activateYear = useMutation({ mutationFn: (id: string) => apiRequest('PUT', `/api/academic-years/${id}/activate`, {}), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/academic-years', schoolId] }); toast({ title: 'Academic year activated' }); } });

  const saveSchool = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/schools/${schoolId}`, { ...schoolForm, logoUrl: logoPreview || schoolForm.logoUrl }),
    onSuccess: () => { toast({ title: 'School info updated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      toast({ variant: 'destructive', title: 'Only JPEG/PNG images allowed' });
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const SCHOOL_TYPE_LABELS: Record<string, string> = {
    nursery: 'Nursery Only', primary: 'Primary Only', secondary: 'Secondary Only',
    nursery_primary: 'Nursery & Primary', primary_secondary: 'Primary & Secondary',
    all: 'Nursery, Primary & Secondary',
  };

  const getYearName = (id: string) => (academicYears as any[]).find(y => y.id === id)?.name ?? '—';

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">School Setup</h1>
          <p className="text-sm text-gray-500">Configure your school's structure, calendar, and academic settings</p>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="info" className="gap-1.5 text-xs"><School className="w-3.5 h-3.5" />School Info</TabsTrigger>
            <TabsTrigger value="years" className="gap-1.5 text-xs"><CalendarDays className="w-3.5 h-3.5" />Academic Years</TabsTrigger>
            <TabsTrigger value="terms" className="gap-1.5 text-xs"><CalendarDays className="w-3.5 h-3.5" />Terms</TabsTrigger>
            <TabsTrigger value="sections" className="gap-1.5 text-xs"><Layers className="w-3.5 h-3.5" />Sections</TabsTrigger>
            <TabsTrigger value="classes" className="gap-1.5 text-xs"><Users2 className="w-3.5 h-3.5" />Classes</TabsTrigger>
            <TabsTrigger value="streams" className="gap-1.5 text-xs"><GitBranch className="w-3.5 h-3.5" />Streams</TabsTrigger>
            <TabsTrigger value="subjects" className="gap-1.5 text-xs"><BookOpen className="w-3.5 h-3.5" />Subjects</TabsTrigger>
          </TabsList>

          {/* School Info */}
          <TabsContent value="info" className="mt-4 space-y-4">
            {/* Basic Info Card */}
            <Card className="border-0 shadow-sm max-w-xl">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">School Information</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <div className="space-y-1"><Label>School Name *</Label><Input value={schoolForm.name} onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Address</Label><Input value={schoolForm.address} onChange={e => setSchoolForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Phone</Label><Input value={schoolForm.phone} onChange={e => setSchoolForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Email</Label><Input value={schoolForm.email} onChange={e => setSchoolForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div className="space-y-1"><Label>School Motto</Label><Input value={schoolForm.motto} onChange={e => setSchoolForm(f => ({ ...f, motto: e.target.value }))} placeholder="e.g. Excellence in Service" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>School Type</Label>
                    <Select value={schoolForm.schoolType || schoolData?.school_type || ''} onValueChange={v => setSchoolForm(f => ({ ...f, schoolType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select school type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nursery">Nursery Only</SelectItem>
                        <SelectItem value="primary">Primary Only</SelectItem>
                        <SelectItem value="secondary">Secondary Only</SelectItem>
                        <SelectItem value="nursery_primary">Nursery &amp; Primary</SelectItem>
                        <SelectItem value="primary_secondary">Primary &amp; Secondary</SelectItem>
                        <SelectItem value="all">Nursery, Primary &amp; Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>School Section</Label>
                    <Select value={schoolForm.sectionType || schoolData?.section_type || ''} onValueChange={v => setSchoolForm(f => ({ ...f, sectionType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Day / Boarding..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day Only</SelectItem>
                        <SelectItem value="boarding">Boarding Only</SelectItem>
                        <SelectItem value="day_boarding">Day &amp; Boarding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>School Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                      {(logoPreview || schoolData?.logo_url) ? (
                        <img src={logoPreview || schoolData?.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <School className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-fit">
                          <Upload className="w-3.5 h-3.5" /> Upload Logo (JPEG/PNG)
                        </div>
                        <input id="logo-upload" type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleLogoUpload} />
                      </label>
                      <p className="text-xs text-gray-400">Used in report cards, receipts and printouts</p>
                    </div>
                  </div>
                </div>

                <Button onClick={() => saveSchool.mutate()} disabled={saveSchool.isPending} className="bg-blue-600 hover:bg-blue-700">
                  {saveSchool.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Bank Details Card (read-only for director) */}
            <Card className="border-0 shadow-sm max-w-xl border-l-4 border-l-amber-400">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-gray-700">Bank Account Details</CardTitle>
                <Badge className="ml-auto text-xs bg-amber-100 text-amber-700">Set by Admin</Badge>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {schoolData?.bank_account_number ? (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><span className="text-xs text-gray-500 block">Bank Name</span><span className="font-medium text-gray-800">{schoolData.bank_name || '—'}</span></div>
                      <div><span className="text-xs text-gray-500 block">Account Type</span><span className="font-medium text-gray-800 capitalize">{schoolData.bank_account_type?.replace('_', ' ') || '—'}</span></div>
                      <div><span className="text-xs text-gray-500 block">Account Title</span><span className="font-medium text-gray-800">{schoolData.bank_account_title || '—'}</span></div>
                      <div><span className="text-xs text-gray-500 block">Account Number</span><span className="font-mono font-semibold text-gray-900">{schoolData.bank_account_number}</span></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No bank account details set yet. Contact your system administrator to add them.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic Years */}
          <TabsContent value="years" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Academic Years</CardTitle>
                <Button size="sm" onClick={() => setShowYearForm(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Year</Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    {['Year', 'Start Date', 'End Date', 'Status', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingYears ? [...Array(2)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>)
                     : academicYears.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No academic years configured</td></tr>
                     : (academicYears as any[]).map(y => (
                      <tr key={y.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-semibold text-gray-900">{y.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{y.start_date ? new Date(y.start_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{y.end_date ? new Date(y.end_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3">{y.is_active ? <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge> : <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>}</td>
                        <td className="px-4 py-3">{!y.is_active && <Button variant="ghost" size="sm" onClick={() => activateYear.mutate(y.id)} className="h-7 text-xs text-blue-600 hover:text-blue-800 px-2 gap-1"><CheckCircle2 className="w-3 h-3" />Activate</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terms */}
          <TabsContent value="terms" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Terms</CardTitle>
                <Button size="sm" onClick={() => setShowTermForm(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Term</Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    {['Term', 'Academic Year', 'Start', 'End'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(terms as any[]).length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No terms configured</td></tr>
                     : (terms as any[]).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{getYearName(t.academic_year_id)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.start_date ? new Date(t.start_date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{t.end_date ? new Date(t.end_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sections */}
          <TabsContent value="sections" className="mt-4">
            <Card className="border-0 shadow-sm max-w-md">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Sections</CardTitle>
                <Button size="sm" onClick={() => setShowSectionForm(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Section</Button>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {(sections as any[]).length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-6">No sections. Add Nursery, Primary, and/or Secondary.</div>
                ) : (
                  <div className="space-y-2">
                    {(sections as any[]).map(s => (
                      <div key={s.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        <Badge className="ml-auto text-xs bg-blue-100 text-blue-700">
                          {classes.filter((c: any) => c.section === s.name).length} classes
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes */}
          <TabsContent value="classes" className="mt-4">
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700">Classes ({classes.length})</CardTitle>
                    <Button size="sm" onClick={() => setShowClassForm(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Class</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-gray-50">
                        {['Class', 'Section', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {classes.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No classes</td></tr>
                         : (classes as any[]).map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-700 text-xs">{c.section ?? c.academic_year ?? '—'}</Badge></td>
                            <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => deleteClass.mutate(c.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-0 shadow-sm h-fit">
                <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Quick Add by Section</CardTitle></CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  <Select value={classSuggSection} onValueChange={setClassSuggSection}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Nursery">Nursery</SelectItem><SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem></SelectContent>
                  </Select>
                  <div className="space-y-1">
                    {CLASS_SUGGESTIONS[classSuggSection].map(name => {
                      const exists = (classes as any[]).some(c => c.name === name);
                      return (
                        <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{name}</span>
                          {exists ? <Badge className="bg-green-100 text-green-700 text-xs">Added</Badge>
                           : <Button size="sm" variant="ghost" onClick={() => createClass.mutate({ name, section: classSuggSection, schoolId })} className="h-6 text-xs text-blue-600 px-2">+ Add</Button>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Streams */}
          <TabsContent value="streams" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Class Streams</CardTitle>
                <Button size="sm" onClick={() => setShowStreamForm(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Add Stream</Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    {['Stream Name', 'Class', 'Actions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(streams as any[]).length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No streams configured. Streams allow multiple sections per class (e.g., P.4K, P.4L).</td></tr>
                     : (streams as any[]).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{(classes as any[]).find(c => c.id === s.class_id)?.name ?? '—'}</td>
                        <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => deleteStream.mutate(s.id)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects */}
          <TabsContent value="subjects" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Subjects ({subjects.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    {['Subject Name', 'Code', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {subjects.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No subjects configured</td></tr>
                     : (subjects as any[]).map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.subject_name ?? s.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.subject_code ?? s.code ?? '—'}</td>
                        <td className="px-4 py-3"><Badge className="bg-green-100 text-green-700 text-xs">Active</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Academic Year */}
      <Dialog open={showYearForm} onOpenChange={setShowYearForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Year Name *</Label><Input value={yearForm.name} onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 2025/2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={yearForm.startDate} onChange={e => setYearForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End Date</Label><Input type="date" value={yearForm.endDate} onChange={e => setYearForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={yearForm.isActive} onCheckedChange={v => setYearForm(f => ({ ...f, isActive: v }))} /><Label>Set as active year</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowYearForm(false)}>Cancel</Button>
            <Button onClick={() => { if (yearForm.name) createYear.mutate({ ...yearForm, schoolId }); }} disabled={!yearForm.name || createYear.isPending} className="bg-blue-600 hover:bg-blue-700">{createYear.isPending ? 'Saving...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Term */}
      <Dialog open={showTermForm} onOpenChange={setShowTermForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Term</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Term</Label>
              <Select value={termForm.name} onValueChange={v => setTermForm(f => ({ ...f, name: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Term I">Term I</SelectItem><SelectItem value="Term II">Term II</SelectItem><SelectItem value="Term III">Term III</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Academic Year</Label>
              <Select value={termForm.academicYearId} onValueChange={v => setTermForm(f => ({ ...f, academicYearId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{(academicYears as any[]).map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start</Label><Input type="date" value={termForm.startDate} onChange={e => setTermForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>End</Label><Input type="date" value={termForm.endDate} onChange={e => setTermForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermForm(false)}>Cancel</Button>
            <Button onClick={() => createTerm.mutate({ ...termForm, schoolId })} disabled={createTerm.isPending} className="bg-blue-600 hover:bg-blue-700">{createTerm.isPending ? 'Saving...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Section */}
      <Dialog open={showSectionForm} onOpenChange={setShowSectionForm}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add Section</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={sectionName} onValueChange={setSectionName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Nursery">Nursery</SelectItem><SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem></SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionForm(false)}>Cancel</Button>
            <Button onClick={() => createSection.mutate({ name: sectionName, schoolId })} disabled={createSection.isPending} className="bg-blue-600 hover:bg-blue-700">{createSection.isPending ? 'Saving...' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Class */}
      <Dialog open={showClassForm} onOpenChange={setShowClassForm}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Class Name *</Label><Input value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. P.4, S.1" /></div>
            <div className="space-y-1"><Label>Section</Label>
              <Select value={classForm.section} onValueChange={v => setClassForm(f => ({ ...f, section: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Nursery">Nursery</SelectItem><SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassForm(false)}>Cancel</Button>
            <Button onClick={() => { if (classForm.name) createClass.mutate({ ...classForm, schoolId }); }} disabled={!classForm.name || createClass.isPending} className="bg-blue-600 hover:bg-blue-700">{createClass.isPending ? 'Saving...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stream */}
      <Dialog open={showStreamForm} onOpenChange={setShowStreamForm}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add Stream</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Stream Name *</Label><Input value={streamForm.name} onChange={e => setStreamForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. East, West, K, L" /></div>
            <div className="space-y-1"><Label>Class</Label>
              <Select value={streamForm.classId} onValueChange={v => setStreamForm(f => ({ ...f, classId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{(classes as any[]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStreamForm(false)}>Cancel</Button>
            <Button onClick={() => { if (streamForm.name) createStream.mutate({ ...streamForm, schoolId }); }} disabled={!streamForm.name || createStream.isPending} className="bg-blue-600 hover:bg-blue-700">{createStream.isPending ? 'Saving...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
