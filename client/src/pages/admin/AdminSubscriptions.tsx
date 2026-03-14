import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, ChevronLeft, ChevronRight, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

const PLANS = [
  { id: 'basic',        label: 'Basic',        price: 50000,  color: 'bg-green-500', features: ['Up to 200 students', 'Attendance tracking', 'Basic reports', '1 Admin account'] },
  { id: 'professional', label: 'Professional', price: 80000,  color: 'bg-blue-500',  features: ['Up to 800 students', 'Full academic management', 'PDF report cards', 'Fee management', '5 user accounts'] },
  { id: 'enterprise',   label: 'Enterprise',   price: 120000, color: 'bg-purple-600', features: ['Unlimited students', 'All Professional features', 'Priority support', 'Unlimited users', 'Custom branding'] },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
  trial: 'bg-yellow-100 text-yellow-700',
};

const PAGE_SIZE = 10;

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ schoolId: '', plan: 'basic', months: '1' });

  const { data: subs = [], isLoading } = useQuery<any[]>({ queryKey: ['/api/admin/subscriptions'] });
  const { data: schools = [] } = useQuery<any[]>({ queryKey: ['/api/admin/schools'] });

  const assignMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/subscriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: 'Subscription assigned successfully' });
      setShowAssign(false);
      setForm({ schoolId: '', plan: 'basic', months: '1' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const totalPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE));
  const paged = subs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedPlan = PLANS.find(p => p.id === form.plan);
  const totalAmount = selectedPlan ? selectedPlan.price * parseInt(form.months || '1') : 0;

  const expiringSoon = subs.filter(s => {
    if (s.status !== 'active') return false;
    const daysLeft = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft >= 0;
  });

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-sm text-gray-500">{subs.filter(s => s.status === 'active').length} active subscriptions</p>
          </div>
          <Button onClick={() => setShowAssign(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" />Assign Plan
          </Button>
        </div>

        {/* Expiry alert */}
        {expiringSoon.length > 0 && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {expiringSoon.length} subscription{expiringSoon.length !== 1 ? 's' : ''} expiring within 7 days
            </p>
          </div>
        )}

        {/* Plans overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const active = subs.filter(s => s.plan === plan.id && s.status === 'active').length;
            return (
              <Card key={plan.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${plan.color}`} />
                    <h3 className="font-semibold text-gray-800">{plan.label}</h3>
                    <Badge className="ml-auto bg-indigo-100 text-indigo-700 text-xs">{active} active</Badge>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    UGX {plan.price.toLocaleString()}
                    <span className="text-xs font-normal text-gray-500">/month</span>
                  </p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Subscriptions table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-700">Subscription History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">School</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Start</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">End</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-5 py-3">
                        <div className="animate-pulse h-4 bg-gray-100 rounded" />
                      </td></tr>
                    ))
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No subscriptions yet
                    </td></tr>
                  ) : paged.map((sub: any) => {
                    const daysLeft = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const nearExpiry = sub.status === 'active' && daysLeft <= 7;
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{sub.school_name ?? sub.school_id}</td>
                        <td className="px-4 py-3">
                          <Badge className="text-xs capitalize bg-indigo-100 text-indigo-700">{sub.plan}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{new Date(sub.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={nearExpiry ? 'text-yellow-600 font-semibold' : 'text-gray-600'}>
                            {new Date(sub.end_date).toLocaleDateString()}
                          </span>
                          {nearExpiry && <span className="ml-1 text-yellow-500">({daysLeft}d left)</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">UGX {(sub.amount_ugx ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {sub.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign plan dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>School *</Label>
              <Select value={form.schoolId} onValueChange={v => setForm(f => ({ ...f, schoolId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plan *</Label>
              <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.label} — UGX {p.price.toLocaleString()}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Duration (months) *</Label>
              <Input type="number" min="1" max="24" value={form.months} onChange={e => setForm(f => ({ ...f, months: e.target.value }))} />
            </div>
            {selectedPlan && form.months && (
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <p className="text-indigo-800 font-semibold">
                  Total: UGX {totalAmount.toLocaleString()}
                </p>
                <p className="text-indigo-600 text-xs mt-0.5">
                  {form.months} month{parseInt(form.months) !== 1 ? 's' : ''} × UGX {selectedPlan.price.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.schoolId) return toast({ variant: 'destructive', title: 'Select a school' });
              assignMut.mutate({ ...form, months: parseInt(form.months) });
            }} disabled={assignMut.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {assignMut.isPending ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
