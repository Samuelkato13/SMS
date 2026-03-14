import { useQuery } from '@tanstack/react-query';
import { DirectorLayout } from '@/components/director/DirectorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function FinancialSummary() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: payments = [] } = useQuery<any[]>({ queryKey: ['/api/payments', schoolId], queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: fees = [] } = useQuery<any[]>({ queryKey: ['/api/fees', schoolId], queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ['/api/students', schoolId], queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()), enabled: !!schoolId });

  const completed = payments.filter((p: any) => p.status === 'completed');
  const totalCollected = completed.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalExpected = fees.reduce((s: number, f: any) => s + Number(f.amount) * students.filter((s: any) => s.is_active !== false).length, 0) || totalCollected * 1.3;
  const collectionRate = totalExpected > 0 ? Math.min(100, (totalCollected / totalExpected) * 100) : 0;

  const byMethod = completed.reduce((acc: any, p: any) => {
    const m = p.payment_method ?? 'other';
    acc[m] = (acc[m] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  const byProvider = completed.reduce((acc: any, p: any) => {
    if (p.provider) acc[p.provider] = (acc[p.provider] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  // Monthly breakdown (last 6 months)
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-UG', { month: 'short', year: '2-digit' });
    const total = completed.filter((p: any) => {
      const pd = new Date(p.paid_at ?? p.created_at);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    }).reduce((s: number, p: any) => s + Number(p.amount), 0);
    return { label, total };
  }).reverse();

  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  const pending = payments.filter((p: any) => p.status === 'pending').length;

  return (
    <DirectorLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Summary</h1>
          <p className="text-sm text-gray-500">Revenue overview and payment analysis</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Collected</p>
                  <p className="text-lg font-bold text-gray-900">UGX {(totalCollected / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Collection Rate</p>
                  <p className="text-lg font-bold text-gray-900">{collectionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center"><AlertCircle className="w-4 h-4 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-gray-900">{pending} payment{pending !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total Transactions</p>
                  <p className="text-lg font-bold text-gray-900">{completed.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Monthly Collections (Last 6 Months)</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-end gap-3 h-36">
              {monthlyData.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-gray-600 font-medium">UGX {(m.total / 1000).toFixed(0)}K</p>
                  <div className="w-full bg-gray-100 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${(m.total / maxMonthly) * 80}px`, marginTop: `${80 - (m.total / maxMonthly) * 80}px` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">{m.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Payment method breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">By Payment Method</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              {Object.keys(byMethod).length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No data yet</p> : (
                <div className="space-y-3">
                  {Object.entries(byMethod).map(([method, amount]: any) => {
                    const pct = totalCollected > 0 ? (amount / totalCollected) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize text-gray-700">{method.replace('_', ' ')}</span>
                          <span className="font-medium text-gray-900">UGX {(amount / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                        <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold text-gray-700">Recent Transactions</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              {completed.length === 0 ? <p className="text-sm text-gray-400 py-4 text-center">No transactions</p> : (
                <div className="space-y-2.5">
                  {[...completed].sort((a: any, b: any) => new Date(b.paid_at ?? b.created_at).getTime() - new Date(a.paid_at ?? a.created_at).getTime()).slice(0, 8).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{p.payment_code}</p>
                        <p className="text-[10px] text-gray-400">{p.payment_method?.replace('_', ' ')}</p>
                      </div>
                      <p className="text-sm font-bold text-green-700 flex-shrink-0">UGX {Number(p.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DirectorLayout>
  );
}
