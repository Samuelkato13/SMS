import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatsCard } from './StatsCard';
import { DollarSign, CreditCard, AlertCircle, CheckCircle, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const BursarDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    studentId: '', feeStructureId: '', paymentCode: '',
    amount: '', paymentMethod: 'mobile_money', provider: 'mtn', phoneNumber: ''
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats', profile?.schoolId],
    queryFn: () => fetch(`/api/stats?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ['/api/payments', profile?.schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: fees = [] } = useQuery<any[]>({
    queryKey: ['/api/fees', profile?.schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, schoolId: profile?.schoolId, recordedBy: profile?.id }),
    }).then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({ title: "Payment Recorded!", description: "Payment saved successfully." });
      setShowPaymentDialog(false);
      setPaymentForm({ studentId: '', feeStructureId: '', paymentCode: '', amount: '', paymentMethod: 'mobile_money', provider: 'mtn', phoneNumber: '' });
    },
    onError: () => toast({ variant: 'destructive', title: "Error", description: "Failed to record payment." })
  });

  const handleRecordPayment = () => {
    if (!paymentForm.studentId || !paymentForm.feeStructureId || !paymentForm.amount) {
      toast({ variant: 'destructive', title: "Validation", description: "Please fill all required fields." });
      return;
    }
    recordPaymentMutation.mutate({
      studentId: paymentForm.studentId,
      feeStructureId: paymentForm.feeStructureId,
      paymentCode: paymentForm.paymentCode,
      amount: parseFloat(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      provider: paymentForm.paymentMethod === 'mobile_money' ? paymentForm.provider : null,
      phoneNumber: paymentForm.phoneNumber || null,
    });
  };

  const totalCollected = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const filteredPayments = payments.filter(p =>
    p.payment_code?.toLowerCase().includes(searchCode.toLowerCase()) ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bursar Dashboard</h1>
          <p className="text-gray-500">Fee collection and financial management</p>
        </div>
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-600 to-emerald-600">
              <Plus className="w-4 h-4 mr-2" />Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label>Student *</Label>
                <Select value={paymentForm.studentId} onValueChange={v => {
                  const s = students.find((st: any) => st.id === v);
                  setPaymentForm(p => ({...p, studentId: v, paymentCode: s?.payment_code || ''}));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.payment_code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fee Type *</Label>
                <Select value={paymentForm.feeStructureId} onValueChange={v => {
                  const f = fees.find((fee: any) => fee.id === v);
                  setPaymentForm(p => ({...p, feeStructureId: v, amount: f?.amount?.toString() || ''}));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
                  <SelectContent>
                    {fees.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} — UGX {Number(f.amount).toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({...p, amount: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm(p => ({...p, paymentMethod: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentForm.paymentMethod === 'mobile_money' && (
                  <div className="space-y-1">
                    <Label>Provider</Label>
                    <Select value={paymentForm.provider} onValueChange={v => setPaymentForm(p => ({...p, provider: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mtn">MTN MoMo</SelectItem>
                        <SelectItem value="airtel">Airtel Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {paymentForm.paymentMethod === 'mobile_money' && (
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input value={paymentForm.phoneNumber} onChange={e => setPaymentForm(p => ({...p, phoneNumber: e.target.value}))} placeholder="+256 700 000 000" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
                {recordPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Collected" value={`UGX ${(totalCollected/1000000).toFixed(1)}M`} change="This term" changeType="positive" icon={DollarSign} iconColor="bg-teal-500" />
        <StatsCard title="Total Students" value={stats?.totalStudents ?? 0} change="Enrolled students" changeType="neutral" icon={CheckCircle} iconColor="bg-blue-500" />
        <StatsCard title="Pending Fees" value={pendingCount} change="Awaiting payment" changeType={pendingCount > 5 ? "negative" : "positive"} icon={AlertCircle} iconColor="bg-orange-500" />
        <StatsCard title="Transactions" value={payments.filter(p => p.status === 'completed').length} change="Completed" changeType="positive" icon={CreditCard} iconColor="bg-green-500" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Search by student name or payment code..." value={searchCode} onChange={e => setSearchCode(e.target.value)} className="pl-10" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Student</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Code</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Fee</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Amount</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Method</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.slice(0, 25).map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="py-3 px-3"><span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{p.payment_code}</span></td>
                    <td className="py-3 px-3 text-gray-600">{p.fee_name || '—'}</td>
                    <td className="py-3 px-3 font-semibold">UGX {Number(p.amount).toLocaleString()}</td>
                    <td className="py-3 px-3 capitalize text-gray-500">{p.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge variant="secondary" className={p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-gray-400">No payment records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
