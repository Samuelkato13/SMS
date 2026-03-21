import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Trash2, TrendingUp, TrendingDown, Clock, Zap } from "lucide-react";

export default function BankStatements() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState<any>(null);
  const emptyForm = { bankName: "", accountNumber: "", statementDate: "", openingBalance: "", closingBalance: "", totalCredits: "", totalDebits: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["/api/bank-statements", schoolId],
    queryFn: () => fetch(`/api/bank-statements?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/bank-statements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, schoolId, uploadedBy: profile?.id })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
      setShowAdd(false); setForm(emptyForm);
      toast({ title: "Bank statement added" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/bank-statements/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
      setShowDelete(null);
      toast({ title: "Statement deleted" });
    },
  });

  const handleSubmit = () => {
    if (!form.bankName || !form.statementDate || !form.closingBalance)
      return toast({ variant: "destructive", title: "Fill required fields" });
    createMut.mutate({
      bankName: form.bankName, accountNumber: form.accountNumber || null,
      statementDate: form.statementDate,
      openingBalance: Number(form.openingBalance) || 0,
      closingBalance: Number(form.closingBalance),
      totalCredits: Number(form.totalCredits) || 0,
      totalDebits: Number(form.totalDebits) || 0,
      notes: form.notes || null
    });
  };

  const totalClosing = (statements as any[]).reduce((s: number, b: any) => s + Number(b.closing_balance), 0);

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Statements</h1>
            <p className="text-gray-500 text-sm mt-0.5">{(statements as any[]).length} statements recorded manually</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus size={16} /> Add Statement
          </Button>
        </div>

        {/* Coming Soon Notice */}
        <div className="flex items-start gap-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Zap size={20} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-purple-900 text-sm">Automated Bank Feed — Coming Soon</p>
              <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold uppercase flex items-center gap-1">
                <Clock size={9} /> Soon
              </span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Direct integration with Stanbic, DFCU, Centenary, and other Ugandan banks for automatic statement imports is on the roadmap.
              For now, enter your bank statements manually below — all data is saved to the database for reconciliation.
            </p>
          </div>
        </div>

        {/* Summary */}
        {(statements as any[]).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Statements</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{(statements as any[]).length}</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Latest Closing Balance</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  UGX {Number((statements as any[])[0]?.closing_balance ?? 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Latest Statement</p>
                <p className="text-base font-bold text-teal-700 mt-1">
                  {(statements as any[])[0]?.bank_name ?? "—"}
                </p>
                <p className="text-xs text-gray-500">{(statements as any[])[0]?.statement_date ? new Date((statements as any[])[0].statement_date).toLocaleDateString() : "—"}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Statements list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}</div>
          ) : (statements as any[]).length === 0 ? (
            <Card className="text-center py-14">
              <Building2 size={44} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No bank statements yet. Add one to start reconciling.</p>
            </Card>
          ) : (
            (statements as any[]).map((s: any) => (
              <Card key={s.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={22} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{s.bank_name}</h3>
                        {s.account_number && <p className="text-sm text-gray-500">Account: {s.account_number}</p>}
                        <p className="text-sm text-gray-500">
                          Statement Date: <span className="font-medium">{new Date(s.statement_date).toLocaleDateString()}</span>
                        </p>
                        {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                        <p className="text-xs text-gray-400 mt-1">Uploaded by: {s.uploaded_by_name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-right mb-2">
                        <p className="text-xs text-gray-500">Closing Balance</p>
                        <p className="text-xl font-bold text-emerald-700">UGX {Number(s.closing_balance).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <TrendingUp size={14} />
                          <span>Credits: UGX {Number(s.total_credits).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-500">
                          <TrendingDown size={14} />
                          <span>Debits: UGX {Number(s.total_debits).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 mt-1" onClick={() => setShowDelete(s)}>
                        <Trash2 size={14} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Bank Statement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bank Name *</Label>
                <Input className="mt-1" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="e.g. Stanbic Bank" />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input className="mt-1" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Statement Date *</Label>
              <Input type="date" className="mt-1" value={form.statementDate} onChange={e => setForm(f => ({ ...f, statementDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Opening Balance (UGX)</Label>
                <Input type="number" className="mt-1" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} />
              </div>
              <div>
                <Label>Closing Balance (UGX) *</Label>
                <Input type="number" className="mt-1" value={form.closingBalance} onChange={e => setForm(f => ({ ...f, closingBalance: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Credits (UGX)</Label>
                <Input type="number" className="mt-1" value={form.totalCredits} onChange={e => setForm(f => ({ ...f, totalCredits: e.target.value }))} />
              </div>
              <div>
                <Label>Total Debits (UGX)</Label>
                <Input type="number" className="mt-1" value={form.totalDebits} onChange={e => setForm(f => ({ ...f, totalDebits: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? "Saving..." : "Add Statement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete Statement</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete the <strong>{showDelete?.bank_name}</strong> statement from {showDelete?.statement_date ? new Date(showDelete.statement_date).toLocaleDateString() : ""}? This may affect reconciliation records.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(showDelete?.id)}>
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BursarLayout>
  );
}
