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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, DollarSign, Calendar } from 'lucide-react';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual'];
const YEARS = ['2024', '2025', '2026'];

export default function Fees() {
  const { profile } = useAuth();
  const { canCreate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const canManageFees = profile?.role === 'director' || profile?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', amount: '', dueDate: '',
    term: 'Term 1', academicYear: '2025', isOptional: false,
  });

  const { data: fees = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/fees', schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/fees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fees', schoolId] });
      toast({ title: 'Fee structure created' });
      setOpen(false);
      setForm({ name: '', description: '', amount: '', dueDate: '', term: 'Term 1', academicYear: '2025', isOptional: false });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const totalAmount = fees.reduce((sum: number, f: any) => sum + parseFloat(f.amount || 0), 0);

  const grouped = fees.reduce((acc: any, f: any) => {
    const key = `${f.academic_year || f.academicYear} · ${f.term}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Structure</h1>
            <p className="text-gray-500 text-sm mt-1">
              {fees.length} fee types · Total UGX {totalAmount.toLocaleString()}
            </p>
          </div>
          {canManageFees && canCreate('fees') && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Fee</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Fee Structure</DialogTitle></DialogHeader>
                <form onSubmit={e => {
                  e.preventDefault();
                  createMutation.mutate({ ...form, schoolId, amount: parseFloat(form.amount), isOptional: form.isOptional });
                }} className="space-y-4 mt-2">
                  <div>
                    <Label>Fee Name *</Label>
                    <Input placeholder="e.g. Tuition Fee Term 1" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description..." value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Amount (UGX) *</Label>
                      <Input type="number" placeholder="350000" value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input type="date" value={form.dueDate}
                        onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Term</Label>
                      <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      <Select value={form.academicYear} onValueChange={v => setForm(f => ({ ...f, academicYear: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Fee'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Total summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-5">
              <p className="text-sm text-blue-600 font-medium">Total Fees / Student</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">UGX {totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-5">
              <p className="text-sm text-green-600 font-medium">Fee Types</p>
              <p className="text-2xl font-bold text-green-800 mt-1">{fees.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-5">
              <p className="text-sm text-purple-600 font-medium">Optional Fees</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">
                {fees.filter((f: any) => f.is_optional).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card><CardContent className="h-40 animate-pulse bg-gray-50 rounded mt-4" /></Card>
        ) : fees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No fee structures yet</h3>
              <p className="text-gray-500 text-sm mt-1">Define your school fee structure to start collecting payments.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([period, periodFees]: any) => (
              <div key={period}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{period}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {periodFees.map((fee: any) => (
                    <Card key={fee.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                              {fee.is_optional && (
                                <Badge variant="secondary" className="text-xs">Optional</Badge>
                              )}
                            </div>
                            {fee.description && (
                              <p className="text-sm text-gray-500 mt-1">{fee.description}</p>
                            )}
                            {fee.due_date && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                Due: {new Date(fee.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4 shrink-0">
                            <p className="text-lg font-bold text-gray-900">
                              UGX {parseFloat(fee.amount).toLocaleString()}
                            </p>
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
