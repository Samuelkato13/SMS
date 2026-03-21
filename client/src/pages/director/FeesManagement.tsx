import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
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

const FEE_TYPES = ['Tuition','PTA','Lunch','Transport','Development','Boarding','Uniform','Library','ICT','Sports','Exam','Swimming','Other'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

const emptyFee = { classId: '', name: 'Tuition', amount: '', term: 'Term 1', academicYear: '2026', description: '', dueDate: '' };

export default function FeesManagement() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<any>(null);
  const [form, setForm] = useState(emptyFee);

  const { data: fees = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/fees', schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ['/api/payments', schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch('/api/fees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fees', schoolId] });
      toast({ title: 'Fee structure created' });
      setShowForm(false); setForm(emptyFee);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/fees/${editing?.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fees', schoolId] });
      toast({ title: 'Fee structure updated' });
      setShowForm(false); setEditing(null); setForm(emptyFee);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/fees/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fees', schoolId] });
      toast({ title: 'Fee structure deleted' });
      setShowDelete(null);
    },
  });

  const getClassName = (classId: string) => classes.find((c: any) => c.id === classId)?.name ?? 'All Classes';

  const totalFees = fees.reduce((s: number, f: any) => s + Number(f.amount), 0);
  const totalCollected = (payments as any[]).filter((p: any) => p.status === 'completed' && !p.is_reversed)
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  const openAdd = () => { setEditing(null); setForm(emptyFee); setShowForm(true); };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({
      classId: f.class_id ?? '',
      name: f.name ?? '',
      amount: String(f.amount ?? ''),
      term: f.term ?? 'Term 1',
      academicYear: f.academic_year ?? '2026',
      description: f.description ?? '',
      dueDate: f.due_date ? f.due_date.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) return toast({ variant: 'destructive', title: 'Fee type and amount are required' });
    const payload = {
      name: form.name,
      description: form.description || null,
      amount: Number(form.amount),
      dueDate: form.dueDate || null,
      classId: form.classId || null,
      schoolId,
      academicYear: form.academicYear,
      term: form.term,
      isOptional: false,
      category: form.name.toLowerCase().includes('transport') ? 'transport'
               : form.name.toLowerCase().includes('board') ? 'boarding'
               : form.name.toLowerCase().includes('uniform') ? 'uniform'
               : form.name.toLowerCase().includes('exam') ? 'exam'
               : form.name.toLowerCase().includes('swim') ? 'swimming'
               : form.name.toLowerCase().includes('develop') ? 'development'
               : form.name.toLowerCase().includes('library') ? 'library'
               : form.name.toLowerCase().includes('lunch') ? 'lunch'
               : 'tuition',
    };
    editing ? updateMut.mutate(payload) : createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Fees Management</h1>
            <p className="text-sm text-gray-500">{fees.length} fee structure{fees.length !== 1 ? 's' : ''} configured</p>
          </div>
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Add Fee Structure
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Fee Structures', value: fees.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Total Configured', value: `UGX ${(totalFees / 1000).toFixed(0)}K`, color: 'text-green-700', bg: 'bg-green-50 border-green-100' },
            { label: 'Total Collected', value: `UGX ${(totalCollected / 1000).toFixed(0)}K`, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-100' },
          ].map((s, i) => (
            <Card key={i} className={`border ${s.bg}`}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold ${s.color} mt-1`}>{s.value}</p>
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
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {['Fee Name', 'Class', 'Amount (UGX)', 'Term', 'Year', 'Due Date', 'Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {isLoading ? (
                        [...Array(4)].map((_, i) => (
                          <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded" /></td></tr>
                        ))
                      ) : fees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>No fee structures yet. Click "Add Fee Structure" to create one.</p>
                          </td>
                        </tr>
                      ) : fees.map((f: any) => (
                        <tr key={f.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{getClassName(f.class_id)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">UGX {Number(f.amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{f.term ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{f.academic_year ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {f.due_date ? new Date(f.due_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(f)} className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowDelete(f)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {['Receipt', 'Student', 'Fee', 'Amount', 'Method', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(payments as any[]).length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No payments recorded yet</td></tr>
                      ) : [...(payments as any[])]
                        .sort((a, b) => new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime())
                        .map((p: any) => (
                        <tr key={p.id} className={`hover:bg-gray-50/60 ${p.is_reversed ? 'opacity-50 bg-red-50/20' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs text-teal-600">{p.receipt_number ?? '—'}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 text-xs">{p.first_name} {p.last_name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{p.fee_name ?? '—'}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">UGX {Number(p.amount).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs capitalize">{(p.payment_method ?? '').replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            <Badge className={
                              p.is_reversed ? 'bg-red-100 text-red-700 text-xs' :
                              p.status === 'completed' ? 'bg-green-100 text-green-700 text-xs' :
                              'bg-yellow-100 text-yellow-700 text-xs'
                            }>{p.is_reversed ? 'Reversed' : p.status}</Badge>
                          </td>
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

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm(emptyFee); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Fee Type / Name *</Label>
              <Select value={form.name} onValueChange={v => setForm(f => ({ ...f, name: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{FEE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class (leave blank for all classes)</Label>
              <Select value={form.classId || '__all'} onValueChange={v => setForm(f => ({ ...f, classId: v === '__all' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Classes</SelectItem>
                  {(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" className="mt-1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 250000" />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" className="mt-1" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term</Label>
                <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input className="mt-1" value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="2026" />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short note about this fee..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete Fee Structure</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete <strong>{showDelete?.name}</strong>? This cannot be undone and may affect recorded payments.</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(showDelete?.id)}>
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DirectorLayout>
  );
}
