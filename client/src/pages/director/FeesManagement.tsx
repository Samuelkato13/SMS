import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const FEE_COMPONENTS = ['Tuition', 'PTA', 'Lunch', 'Transport', 'Development', 'Boarding', 'Uniform', 'Library', 'ICT', 'Sports'];

const emptyFee = { classId: '', feeType: 'Tuition', amount: '', term: 'Term I', academicYear: '', description: '' };

export default function FeesManagement() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyFee);

  const { data: fees = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/fees', schoolId], queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ['/api/payments', schoolId], queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: classes = [] } = useQuery<any[]>({ queryKey: ['/api/classes', schoolId], queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/fees', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/fees', schoolId] }); toast({ title: 'Fee structure created' }); setShowForm(false); setForm(emptyFee); },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const getClassName = (classId: string) => classes.find((c: any) => c.id === classId)?.name ?? classId ?? '—';

  const totalFees = fees.reduce((s: number, f: any) => s + Number(f.amount), 0);
  const totalCollected = payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount), 0);

  // Group fees by class
  const feesByClass: Record<string, any[]> = {};
  fees.forEach((f: any) => {
    const key = f.class_id ?? 'General';
    if (!feesByClass[key]) feesByClass[key] = [];
    feesByClass[key].push(f);
  });

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fees Management</h1>
            <p className="text-sm text-gray-500">{fees.length} fee structure{fees.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => { setEditing(null); setForm(emptyFee); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 gap-2"><Plus className="w-4 h-4" />Add Fee</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Fee Structures', value: fees.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Fees Configured', value: `UGX ${(totalFees/1000).toFixed(0)}K`, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Collected', value: `UGX ${(totalCollected/1000).toFixed(0)}K`, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className={`p-4 ${s.bg} rounded-lg`}>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="structures">
          <TabsList>
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="structures" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {['Class', 'Fee Type', 'Amount (UGX)', 'Term', 'Academic Year', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {isLoading ? [...Array(4)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>)
                       : fees.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400"><DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />No fee structures</td></tr>
                       : fees.map((f: any) => (
                        <tr key={f.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">{getClassName(f.class_id)}</td>
                          <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-700 text-xs">{f.fee_type ?? 'Tuition'}</Badge></td>
                          <td className="px-4 py-3 font-semibold text-gray-900">UGX {Number(f.amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{f.term ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{f.academic_year ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(f); setForm({ classId: f.class_id ?? '', feeType: f.fee_type ?? 'Tuition', amount: f.amount, term: f.term ?? 'Term I', academicYear: f.academic_year ?? '', description: f.description ?? '' }); setShowForm(true); }} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      {['Payment Code', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {payments.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No payments yet</td></tr>
                       : [...payments].sort((a: any, b: any) => new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime()).map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.payment_code}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">UGX {Number(p.amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs capitalize">{(p.payment_method ?? '').replace('_', ' ')}</td>
                          <td className="px-4 py-3"><Badge className={p.status === 'completed' ? 'bg-green-100 text-green-700 text-xs' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>{p.status}</Badge></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Class</Label>
              <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (All Classes)</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Fee Component</Label>
              <Select value={form.feeType} onValueChange={v => setForm(f => ({ ...f, feeType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FEE_COMPONENTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Amount (UGX) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 250000" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Term</Label>
                <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Term I">Term I</SelectItem><SelectItem value="Term II">Term II</SelectItem><SelectItem value="Term III">Term III</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Academic Year</Label><Input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2025/2026" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => { if (form.amount) createMut.mutate({ ...form, schoolId }); }} disabled={!form.amount || createMut.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMut.isPending ? 'Saving...' : editing ? 'Save' : 'Add Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
