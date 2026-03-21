import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Link2, Clock, Zap } from "lucide-react";

export default function Reconciliation() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [showMatch, setShowMatch] = useState<any>(null);
  const [selectedStatement, setSelectedStatement] = useState("");

  const { data: recon, isLoading } = useQuery({
    queryKey: ["/api/reconciliation", schoolId],
    queryFn: () => fetch(`/api/reconciliation?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: statements = [] } = useQuery({
    queryKey: ["/api/bank-statements", schoolId],
    queryFn: () => fetch(`/api/bank-statements?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: summary } = useQuery({
    queryKey: ["/api/payments/summary", schoolId],
    queryFn: () => fetch(`/api/payments/summary?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const matchMut = useMutation({
    mutationFn: (data: any) => fetch("/api/reconciliation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, schoolId, reconciledBy: profile?.id })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
      setShowMatch(null); setSelectedStatement("");
      toast({ title: "Payment reconciled successfully" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const unreconciled = recon?.unreconciled ?? [];
  const reconciled = recon?.reconciled ?? [];
  const systemTotal = (unreconciled as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0)
    + (reconciled as any[]).reduce((s: number, p: any) => s + Number(p.payment_amount ?? 0), 0);
  const bankTotal = (statements as any[]).reduce((s: number, b: any) => s + Number(b.closing_balance), 0) / Math.max(1, (statements as any[]).length);

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
          <p className="text-gray-500 text-sm mt-0.5">Match system payments against bank records</p>
        </div>

        {/* Coming Soon Notice */}
        <div className="flex items-start gap-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Zap size={20} className="text-teal-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-teal-900 text-sm">Automated Reconciliation — Coming Soon</p>
              <span className="px-2 py-0.5 rounded-full bg-teal-200 text-teal-800 text-[10px] font-bold uppercase flex items-center gap-1">
                <Clock size={9} /> Soon
              </span>
            </div>
            <p className="text-xs text-teal-700 mt-1">
              Automatic matching of mobile money and bank payments against system records is on the roadmap.
              For now, manually match each payment to a bank statement below — your reconciliation data is fully saved to the database.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">System Total</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">UGX {(summary?.totalCollected ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{summary?.totalPayments ?? 0} completed payments</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Unreconciled</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{unreconciled.length}</p>
              <p className="text-xs text-gray-500 mt-1">Payments pending match</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase">Reconciled</p>
              <p className="text-2xl font-bold text-teal-700 mt-1">{reconciled.length}</p>
              <p className="text-xs text-gray-500 mt-1">Matched payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Unreconciled payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> Unreconciled Payments
              <Badge className="bg-amber-100 text-amber-700 ml-auto">{unreconciled.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
            ) : unreconciled.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-400" />
                <p className="font-medium text-emerald-700">All payments are reconciled!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Receipt No","Student","Amount","Method","Date","Action"].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unreconciled.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-amber-50">
                        <td className="p-3 font-mono text-xs text-teal-700 font-semibold">{p.receipt_number ?? "—"}</td>
                        <td className="p-3 font-medium">{p.first_name} {p.last_name}</td>
                        <td className="p-3 font-semibold text-emerald-700">UGX {Number(p.amount).toLocaleString()}</td>
                        <td className="p-3 text-gray-500 capitalize">{p.payment_method?.replace("_", " ")}</td>
                        <td className="p-3 text-gray-500 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        <td className="p-3">
                          <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 gap-1"
                            onClick={() => { setShowMatch(p); setSelectedStatement(""); }}>
                            <Link2 size={12} /> Match
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reconciliation history */}
        {reconciled.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Reconciliation History
                <Badge className="bg-emerald-100 text-emerald-700 ml-auto">{reconciled.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Receipt","Student","Amount","Bank","Statement Date","Reconciled By","Date"].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs text-teal-700">{r.receipt_number ?? "—"}</td>
                        <td className="p-3 font-medium">{r.student_name ?? "—"}</td>
                        <td className="p-3 font-semibold text-emerald-700">UGX {Number(r.payment_amount ?? r.amount).toLocaleString()}</td>
                        <td className="p-3 text-gray-600">{r.bank_name ?? "—"}</td>
                        <td className="p-3 text-gray-500 text-xs">{r.statement_date ? new Date(r.statement_date).toLocaleDateString() : "—"}</td>
                        <td className="p-3 text-gray-500 text-xs">{r.reconciled_by_name ?? "—"}</td>
                        <td className="p-3 text-gray-500 text-xs">{r.reconciled_at ? new Date(r.reconciled_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Match Dialog */}
      <Dialog open={!!showMatch} onOpenChange={() => setShowMatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Match Payment to Bank Statement</DialogTitle></DialogHeader>
          {showMatch && (
            <div className="space-y-4">
              <div className="p-3 bg-teal-50 rounded-lg text-sm">
                <p className="font-semibold">{showMatch.first_name} {showMatch.last_name}</p>
                <p className="text-gray-600">Receipt: {showMatch.receipt_number} · UGX {Number(showMatch.amount).toLocaleString()}</p>
              </div>
              <div>
                <Label>Select Bank Statement</Label>
                <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select statement..." /></SelectTrigger>
                  <SelectContent>
                    {(statements as any[]).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.bank_name} — {new Date(s.statement_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowMatch(null)}>Cancel</Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={!selectedStatement || matchMut.isPending}
                  onClick={() => matchMut.mutate({
                    paymentId: showMatch.id, statementId: selectedStatement,
                    amount: showMatch.amount, description: `Receipt ${showMatch.receipt_number}`
                  })}>
                  {matchMut.isPending ? "Matching..." : "Confirm Match"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </BursarLayout>
  );
}
