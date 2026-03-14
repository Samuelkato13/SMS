import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Save, FileText, Palette } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolContext } from '@/contexts/SchoolContext';

interface TemplateConfig {
  name: string;
  section: string;
  showLogo: boolean;
  showPhoto: boolean;
  showMotivation: boolean;
  showSignatures: boolean;
  showAttendance: boolean;
  showRemarks: boolean;
  showClassPosition: boolean;
  primaryColor: string;
  fontFamily: string;
  footerText: string;
  headTeacherTitle: string;
  directorTitle: string;
}

const DEFAULT_CONFIG: TemplateConfig = {
  name: 'Standard Report Card',
  section: 'Primary',
  showLogo: true,
  showPhoto: true,
  showMotivation: true,
  showSignatures: true,
  showAttendance: true,
  showRemarks: true,
  showClassPosition: true,
  primaryColor: '#1d4ed8',
  fontFamily: 'sans-serif',
  footerText: 'Excellence in Education',
  headTeacherTitle: "Head Teacher's Comment",
  directorTitle: "Director's Comment",
};

const TOGGLES = [
  { key: 'showLogo', label: 'School Logo & Name' },
  { key: 'showPhoto', label: 'Student Photo' },
  { key: 'showAttendance', label: 'Attendance Record' },
  { key: 'showClassPosition', label: 'Class Position' },
  { key: 'showRemarks', label: 'Teacher Remarks' },
  { key: 'showMotivation', label: 'Motivational Quote' },
  { key: 'showSignatures', label: 'Signature Lines' },
] as const;

export default function ReportStudio() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { school } = useSchoolContext();
  const schoolId = profile?.schoolId;
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: classes = [] } = useQuery<any[]>({ queryKey: ['/api/classes', schoolId], queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const set = (key: keyof TemplateConfig, value: any) => setConfig(c => ({ ...c, [key]: value }));

  const handleSave = () => {
    const existing = JSON.parse(localStorage.getItem('reportTemplates') ?? '[]');
    const idx = existing.findIndex((t: any) => t.name === config.name);
    if (idx >= 0) existing[idx] = config; else existing.push(config);
    localStorage.setItem('reportTemplates', JSON.stringify(existing));
    setSaved(true);
    toast({ title: 'Template saved', description: `"${config.name}" saved successfully` });
    setTimeout(() => setSaved(false), 2000);
  };

  const savedTemplates: TemplateConfig[] = JSON.parse(localStorage.getItem('reportTemplates') ?? '[]');

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Report Studio</h1>
            <p className="text-sm text-gray-500">Design and customise report card templates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2"><Eye className="w-4 h-4" />Preview</Button>
            <Button onClick={handleSave} className={`gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}><Save className="w-4 h-4" />{saved ? 'Saved!' : 'Save Template'}</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: settings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Template Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Template Settings</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Template Name</Label><Input value={config.name} onChange={e => set('name', e.target.value)} /></div>
                <div className="space-y-1"><Label>Section</Label>
                  <Select value={config.section} onValueChange={v => set('section', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Nursery">Nursery</SelectItem><SelectItem value="Primary">Primary</SelectItem><SelectItem value="Secondary">Secondary</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Font Family</Label>
                  <Select value={config.fontFamily} onValueChange={v => set('fontFamily', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans-serif">Sans-serif (Default)</SelectItem>
                      <SelectItem value="serif">Serif (Formal)</SelectItem>
                      <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="flex items-center gap-2"><Palette className="w-3.5 h-3.5" />Primary Colour</Label>
                  <div className="flex gap-2"><input type="color" value={config.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="w-10 h-9 rounded border cursor-pointer" /><Input value={config.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="flex-1" /></div>
                </div>
              </CardContent>
            </Card>

            {/* Sections toggle */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Visible Sections</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid sm:grid-cols-2 gap-3">
                  {TOGGLES.map(t => (
                    <div key={t.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{t.label}</span>
                      <Switch checked={config[t.key] as boolean} onCheckedChange={v => set(t.key, v)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom text */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Custom Text</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Footer Text</Label><Input value={config.footerText} onChange={e => set('footerText', e.target.value)} placeholder="School motto or footer" /></div>
                <div className="space-y-1"><Label>Head Teacher Comment Title</Label><Input value={config.headTeacherTitle} onChange={e => set('headTeacherTitle', e.target.value)} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Director Comment Title</Label><Input value={config.directorTitle} onChange={e => set('directorTitle', e.target.value)} /></div>
              </CardContent>
            </Card>
          </div>

          {/* Right: saved templates */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />Saved Templates</CardTitle></CardHeader>
              <CardContent className="px-5 pb-5">
                {savedTemplates.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No templates saved yet</p>
                ) : (
                  <div className="space-y-2">
                    {savedTemplates.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.name}</p>
                          <Badge className="text-xs bg-blue-100 text-blue-700 mt-0.5">{t.section}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setConfig(t)} className="text-xs text-blue-600 h-7 px-2">Load</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mini live preview */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</CardTitle></CardHeader>
              <CardContent className="p-3">
                <div className="border rounded-md overflow-hidden text-xs" style={{ fontFamily: config.fontFamily }}>
                  {config.showLogo && (
                    <div className="p-2 text-center text-white text-xs font-bold" style={{ backgroundColor: config.primaryColor }}>
                      {school?.name ?? 'School Name'}
                      <div className="text-[9px] font-normal mt-0.5">PROGRESS REPORT CARD · {config.section.toUpperCase()}</div>
                    </div>
                  )}
                  <div className="p-2 bg-white space-y-1">
                    <div className="flex justify-between text-[9px] text-gray-600 border-b pb-1">
                      <span>Name: <b>John Doe</b></span>
                      <span>Class: <b>P.4</b></span>
                    </div>
                    <div className="text-[9px] text-gray-500 space-y-0.5">
                      {config.showAttendance && <div>Attendance: <b>87/90 days</b></div>}
                      {config.showClassPosition && <div>Position: <b>3rd / 42</b></div>}
                    </div>
                    <div className="text-[9px] border rounded overflow-hidden mt-1">
                      <div className="bg-gray-100 px-1 py-0.5 font-semibold text-gray-600 grid grid-cols-3"><span>Subject</span><span className="text-center">Score</span><span className="text-center">Grade</span></div>
                      {['English', 'Math', 'Science'].map(s => (
                        <div key={s} className="px-1 py-0.5 grid grid-cols-3 text-gray-600 border-t"><span>{s}</span><span className="text-center">76</span><span className="text-center text-green-600">C3</span></div>
                      ))}
                    </div>
                    {config.showRemarks && <div className="text-[9px] text-gray-500 italic mt-1">"Keep up the good work!"</div>}
                    {config.showSignatures && (
                      <div className="flex justify-between text-[9px] text-gray-400 mt-2 pt-1 border-t">
                        <span>Class Teacher: ____</span><span>Director: ____</span>
                      </div>
                    )}
                    {<div className="text-[9px] text-center text-gray-400 mt-1" style={{ color: config.primaryColor }}>{config.footerText}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Full preview modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Report Card Preview</DialogTitle></DialogHeader>
          <div className="border rounded-lg overflow-hidden shadow-md" style={{ fontFamily: config.fontFamily }}>
            {/* Header */}
            {config.showLogo && (
              <div className="p-4 text-white text-center" style={{ backgroundColor: config.primaryColor }}>
                <p className="text-xl font-bold">{school?.name ?? 'SCHOOL NAME'}</p>
                <p className="text-sm opacity-80">{school?.address ?? 'School Address, Uganda'}</p>
                <p className="text-sm font-semibold mt-1">END OF TERM PROGRESS REPORT — {config.section.toUpperCase()}</p>
              </div>
            )}
            {/* Student details */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Student Name:</span> <b>JOHN WILLIAM DOE</b></div>
                <div><span className="text-gray-500">Adm No:</span> <b>2025/001</b></div>
                <div><span className="text-gray-500">Class:</span> <b>Primary 4</b></div>
                <div><span className="text-gray-500">Term:</span> <b>Term I · 2025</b></div>
                {config.showAttendance && <div><span className="text-gray-500">Days Attended:</span> <b>87 / 90</b></div>}
                {config.showClassPosition && <div><span className="text-gray-500">Class Position:</span> <b>3rd / 42 students</b></div>}
              </div>
            </div>
            {/* Marks table */}
            <div className="p-4">
              <table className="w-full text-sm border-collapse">
                <thead><tr style={{ backgroundColor: config.primaryColor }} className="text-white">
                  <th className="p-2 text-left">Subject</th><th className="p-2 text-center">Score</th><th className="p-2 text-center">Out of</th><th className="p-2 text-center">Grade</th><th className="p-2 text-left">Remarks</th>
                </tr></thead>
                <tbody>
                  {['English Language', 'Mathematics', 'Science', 'Social Studies', 'Religious Education'].map((s, i) => (
                    <tr key={s} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2">{s}</td><td className="p-2 text-center font-semibold">{70 + i * 4}</td><td className="p-2 text-center">100</td>
                      <td className="p-2 text-center"><span className="font-bold text-green-700">{['C3','D2','C4','C3','D1'][i]}</span></td>
                      <td className="p-2 text-xs text-gray-500">Good</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Comments */}
            {config.showRemarks && (
              <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3">
                <div className="border rounded p-2.5">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{config.headTeacherTitle}</p>
                  <p className="text-xs text-gray-500 italic">"John has performed well this term. Encourage him to work on mathematics."</p>
                  <p className="text-xs text-gray-400 mt-2">Signature: ___________________</p>
                </div>
                <div className="border rounded p-2.5">
                  <p className="text-xs font-semibold text-gray-600 mb-1">{config.directorTitle}</p>
                  <p className="text-xs text-gray-500 italic">"Keep up the excellent performance. We are proud of your progress."</p>
                  <p className="text-xs text-gray-400 mt-2">Signature: ___________________</p>
                </div>
              </div>
            )}
            {/* Footer */}
            <div className="p-3 border-t text-center text-xs text-gray-400" style={{ color: config.primaryColor }}>
              {config.footerText} · {school?.name}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
