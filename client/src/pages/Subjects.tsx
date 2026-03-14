import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen } from 'lucide-react';

const SUBJECT_CATEGORIES = ['Core', 'Sciences', 'Languages', 'Arts', 'Technical', 'Optional'];

export default function Subjects() {
  const { profile } = useAuth();
  const { canCreate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', category: 'Core', isCompulsory: true });

  const { data: subjects = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/subjects', schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/subjects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects', schoolId] });
      toast({ title: 'Subject created successfully' });
      setOpen(false);
      setForm({ name: '', code: '', category: 'Core', isCompulsory: true });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const categoryColors: Record<string, string> = {
    Core: 'bg-blue-100 text-blue-700',
    Sciences: 'bg-green-100 text-green-700',
    Languages: 'bg-purple-100 text-purple-700',
    Arts: 'bg-orange-100 text-orange-700',
    Technical: 'bg-teal-100 text-teal-700',
    Optional: 'bg-gray-100 text-gray-700',
  };

  const grouped = subjects.reduce((acc: any, s: any) => {
    const cat = s.category || 'Core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
            <p className="text-gray-500 text-sm mt-1">{subjects.length} subjects across {Object.keys(grouped).length} categories</p>
          </div>
          {canCreate('subjects') && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Subject</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, schoolId }); }} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subject Name *</Label>
                      <Input placeholder="e.g. Mathematics" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>Code</Label>
                      <Input placeholder="e.g. MATH" value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBJECT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Adding...' : 'Add Subject'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <Card><CardContent className="h-40 animate-pulse bg-gray-50 rounded mt-4" /></Card>
        ) : subjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No subjects yet</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, subs]: any) => (
              <div key={category}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subs.map((s: any) => (
                    <Card key={s.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {s.code && <span className="text-xs text-gray-500 font-mono">{s.code}</span>}
                            <Badge className={`text-xs border-0 ${categoryColors[s.category] || 'bg-gray-100 text-gray-700'}`}>
                              {s.category || 'Core'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
