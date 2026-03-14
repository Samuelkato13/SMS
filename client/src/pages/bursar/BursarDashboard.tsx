import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  TrendingUp, DollarSign, AlertCircle, Percent,
  CreditCard, FileText, RefreshCw, Receipt, ArrowRight, Clock
} from "lucide-react";

const fmt = (n: number) => "UGX " + Math.round(n).toLocaleString();

const methodColor: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  mobile_money: "bg-blue-100 text-blue-800",
  bank_transfer: "bg-purple-100 text-purple-800",
  cheque: "bg-amber-100 text-amber-800",
  card: "bg-indigo-100 text-indigo-800",
};

export default function BursarDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const { data: summary, isLoading: loadSum } = useQuery({
    queryKey: ["/api/payments/summary", schoolId],
    queryFn: () => fetch(`/api/payments/summary?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: recentPayments = [], isLoading: loadPay } = useQuery({
    queryKey: ["/api/payments", schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const stats = [
    {
      title: "Total Collected",
      value: loadSum ? "..." : fmt(summary?.totalCollected ?? 0),
      icon: DollarSign,
      color: "bg-emerald-50 border-emerald-200",
      iconColor: "text-emerald-600 bg-emerald-100",
      change: `${summary?.totalPayments ?? 0} payments total`,
    },
    {
      title: "Outstanding Balance",
      value: loadSum ? "..." : fmt(summary?.outstanding ?? 0),
      icon: AlertCircle,
      color: "bg-red-50 border-red-200",
      iconColor: "text-red-600 bg-red-100",
      change: "Pending collection",
    },
    {
      title: "Today's Collections",
      value: loadSum ? "..." : fmt(summary?.todayCollected ?? 0),
      icon: TrendingUp,
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600 bg-blue-100",
      change: `${summary?.todayCount ?? 0} payments today`,
    },
    {
      title: "Collection Rate",
      value: loadSum ? "..." : `${summary?.collectionRate ?? 0}%`,
      icon: Percent,
      color: "bg-teal-50 border-teal-200",
      iconColor: "text-teal-600 bg-teal-100",
      change: "Of total fees billed",
    },
  ];

  const quickActions = [
    { label: "Record Payment", href: "/bursar/payments", icon: CreditCard, color: "bg-teal-600 hover:bg-teal-700 text-white" },
    { label: "View Reports", href: "/bursar/reports", icon: FileText, color: "bg-blue-600 hover:bg-blue-700 text-white" },
    { label: "Reconcile", href: "/bursar/reconciliation", icon: RefreshCw, color: "bg-purple-600 hover:bg-purple-700 text-white" },
    { label: "Receipts", href: "/bursar/receipts", icon: Receipt, color: "bg-amber-600 hover:bg-amber-700 text-white" },
  ];

  return (
    <BursarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {profile?.firstName}. Here's today's financial overview.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.title} className={`border ${s.color}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.change}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${s.iconColor}`}>
                    <s.icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href}>
                  <a className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center text-sm font-medium transition-all hover:scale-105 ${a.color}`}>
                    <a.icon size={22} />
                    <span>{a.label}</span>
                  </a>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <Link href="/bursar/payments">
              <a className="text-teal-600 text-sm flex items-center gap-1 hover:underline">
                View all <ArrowRight size={14} />
              </a>
            </Link>
          </CardHeader>
          <CardContent>
            {loadPay ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                <p>No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">Receipt No</th>
                      <th className="text-left p-3 font-medium text-gray-600">Student</th>
                      <th className="text-left p-3 font-medium text-gray-600">Fee</th>
                      <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-center p-3 font-medium text-gray-600">Method</th>
                      <th className="text-left p-3 font-medium text-gray-600">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentPayments as any[]).slice(0, 10).map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs text-teal-700 font-semibold">{p.receipt_number ?? "—"}</td>
                        <td className="p-3 font-medium">{p.first_name} {p.last_name}</td>
                        <td className="p-3 text-gray-600 max-w-[160px] truncate">{p.fee_name}</td>
                        <td className="p-3 text-right font-semibold text-emerald-700">UGX {Number(p.amount).toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <Badge className={`text-xs ${methodColor[p.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                            {p.payment_method?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500 text-xs flex items-center gap-1">
                          <Clock size={12} />
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BursarLayout>
  );
}
