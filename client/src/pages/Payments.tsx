import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Plus, Search, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Payments() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const canRecord = profile?.role === 'bursar' || profile?.role === 'director' || profile?.role === 'admin';

  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payments', schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: fees = [] } = useQuery<any[]>({
    queryKey: ['/api/fees', schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const filtered = payments.filter((p: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.payment_code?.toLowerCase().includes(q) ||
      p.transaction_ref?.toLowerCase().includes(q)
    );
  });

  const totalCollected = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);

  const pendingCount = payments.filter((p: any) => p.status === 'pending').length;
  const todayPayments = payments.filter((p: any) => {
    if (!p.paid_at) return false;
    return new Date(p.paid_at).toDateString() === new Date().toDateString();
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle2 className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />,
    };
    return (
      <Badge className={`text-xs border-0 gap-1 ${map[status] || 'bg-gray-100 text-gray-700'}`}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const methodLabel = (method: string, provider?: string) => {
    if (method === 'mobile_money') return provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money';
    if (method === 'bank_transfer') return 'Bank Transfer';
    return 'Cash';
  };

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 text-sm mt-1">{payments.length} total transactions</p>
          </div>
          {canRecord && (
            <Button onClick={() => setShowPaymentModal(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Record Payment
            </Button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Total Collected</span>
              </div>
              <p className="text-xl font-bold text-green-800">UGX {totalCollected.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500 mb-1">Today's Collections</p>
              <p className="text-xl font-bold text-gray-900">
                UGX {todayPayments.filter((p: any) => p.status === 'completed')
                  .reduce((s: number, p: any) => s + parseFloat(p.amount || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">{todayPayments.length} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500 mb-1">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-gray-400 mt-1">awaiting confirmation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500 mb-1">Completed</p>
              <p className="text-xl font-bold text-green-600">
                {payments.filter((p: any) => p.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-400 mt-1">successful transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Transaction History</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Payment Code</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.first_name} {p.last_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {p.payment_code}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {p.fee_name}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        UGX {parseFloat(p.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {methodLabel(p.payment_method, p.provider)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : '–'}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {showPaymentModal && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={(v) => setShowPaymentModal(v)}
        />
      )}
    </RoleGuard>
  );
}
