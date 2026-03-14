import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Printer, RotateCcw, Search, CreditCard, X } from "lucide-react";
import jsPDF from "jspdf";

const methodColor: Record<string, string> = {
  cash: "bg-green-100 text-green-800",
  mobile_money: "bg-blue-100 text-blue-800",
  bank_transfer: "bg-purple-100 text-purple-800",
  cheque: "bg-amber-100 text-amber-800",
  card: "bg-indigo-100 text-indigo-800",
};

export default function PaymentsReceived() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [search, setSearch] = useState("");
  const [showRecord, setShowRecord] = useState(false);
  const [showReverse, setShowReverse] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState("");

  const [form, setForm] = useState({
    studentSearch: "", selectedStudent: null as any,
    feeStructureId: "", amount: "", paymentMethod: "cash",
    transactionRef: "", notes: ""
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/payments", schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["/api/students", schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: fees = [] } = useQuery({
    queryKey: ["/api/fees", schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const recordMut = useMutation({
    mutationFn: async (data: any) => {
      const rcpRes = await fetch("/api/payments/receipt-number", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId })
      });
      const { receiptNumber } = await rcpRes.json();
      return fetch("/api/payments/record", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, receiptNumber, schoolId, recordedBy: profile?.id })
      }).then(r => r.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/summary"] });
      setShowRecord(false);
      setForm({ studentSearch: "", selectedStudent: null, feeStructureId: "", amount: "", paymentMethod: "cash", transactionRef: "", notes: "" });
      toast({ title: "Payment recorded", description: `Receipt: ${data.receipt_number}` });
      printReceipt(data);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const reverseMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/${id}/reverse`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reversalReason })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/summary"] });
      setShowReverse(null); setReversalReason("");
      toast({ title: "Payment reversed" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const printReceipt = (p: any) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 100] });
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL RECEIPT", 40, 10, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Receipt No: ${p.receipt_number ?? "N/A"}`, 5, 20);
    doc.text(`Date: ${new Date(p.paid_at ?? p.created_at).toLocaleDateString()}`, 5, 26);
    doc.text(`Student: ${p.first_name ?? ""} ${p.last_name ?? ""}`, 5, 32);
    doc.text(`Amount: UGX ${Number(p.amount).toLocaleString()}`, 5, 38);
    doc.text(`Method: ${p.payment_method?.replace("_"," ")}`, 5, 44);
    if (p.transaction_ref) doc.text(`Ref: ${p.transaction_ref}`, 5, 50);
    doc.text("Thank you for your payment.", 40, 60, { align: "center" });
    doc.save(`receipt-${p.receipt_number ?? "new"}.pdf`);
  };

  const filtered = (payments as any[]).filter((p: any) => {
    const q = search.toLowerCase();
    return !q || `${p.first_name} ${p.last_name} ${p.receipt_number} ${p.student_code}`.toLowerCase().includes(q);
  });

  const matchStudents = students.filter((s: any) =>
    form.studentSearch.length > 1 &&
    `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(form.studentSearch.toLowerCase())
  );

  const handleRecord = () => {
    if (!form.selectedStudent) return toast({ variant: "destructive", title: "Select a student" });
    if (!form.feeStructureId) return toast({ variant: "destructive", title: "Select a fee" });
    if (!form.amount || isNaN(Number(form.amount))) return toast({ variant: "destructive", title: "Enter valid amount" });
    recordMut.mutate({
      studentId: form.selectedStudent.id,
      feeStructureId: form.feeStructureId,
      paymentCode: form.selectedStudent.payment_code,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      transactionRef: form.transactionRef || null,
      notes: form.notes || null,
    });
  };

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments Received</h1>
            <p className="text-gray-500 text-sm mt-0.5">{filtered.length} payment records</p>
          </div>
          <Button onClick={() => setShowRecord(true)} className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus size={16} /> Record New Payment
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by student, receipt..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 text-gray-500">
                <CreditCard size={44} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Receipt No","Student","Admission","Class","Amount","Method","Ref","Date","Status","Actions"].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p: any) => (
                      <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.is_reversed ? "opacity-50" : ""}`}>
                        <td className="p-3 font-mono text-xs text-teal-700 font-semibold">{p.receipt_number ?? "—"}</td>
                        <td className="p-3 font-medium whitespace-nowrap">{p.first_name} {p.last_name}</td>
                        <td className="p-3 text-gray-500 text-xs">{p.student_code}</td>
                        <td className="p-3 text-gray-500 text-xs">—</td>
                        <td className="p-3 font-semibold text-emerald-700 whitespace-nowrap">UGX {Number(p.amount).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${methodColor[p.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                            {p.payment_method?.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500 text-xs font-mono">{p.transaction_ref ?? "—"}</td>
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3">
                          {p.is_reversed
                            ? <Badge className="bg-red-100 text-red-700 text-xs">Reversed</Badge>
                            : <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => printReceipt({ ...p })}>
                              <Printer size={13} />
                            </Button>
                            {!p.is_reversed && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => setShowReverse(p)}>
                                <RotateCcw size={13} />
                              </Button>
                            )}
                          </div>
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

      {/* Record Payment Dialog */}
      <Dialog open={showRecord} onOpenChange={setShowRecord}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student search */}
            <div>
              <Label>Student *</Label>
              {form.selectedStudent ? (
                <div className="flex items-center justify-between mt-1 p-2 border rounded-lg bg-teal-50">
                  <div>
                    <p className="font-medium text-sm">{form.selectedStudent.first_name} {form.selectedStudent.last_name}</p>
                    <p className="text-xs text-gray-500">{form.selectedStudent.admission_number} · {form.selectedStudent.payment_code}</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, selectedStudent: null, studentSearch: "" }))}><X size={16} /></button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Type name or admission number..."
                    value={form.studentSearch}
                    onChange={e => setForm(f => ({ ...f, studentSearch: e.target.value }))}
                    className="pl-8"
                  />
                  {matchStudents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {matchStudents.map((s: any) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm border-b last:border-0"
                          onClick={() => setForm(f => ({ ...f, selectedStudent: s, studentSearch: "" }))}
                        >
                          <span className="font-medium">{s.first_name} {s.last_name}</span>
                          <span className="text-gray-500 ml-2 text-xs">{s.admission_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Fee Structure *</Label>
              <Select value={form.feeStructureId} onValueChange={v => setForm(f => ({ ...f, feeStructureId: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select fee..." />
                </SelectTrigger>
                <SelectContent>
                  {(fees as any[]).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} — UGX {Number(f.amount).toLocaleString()} ({f.term})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" className="mt-1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>Payment Method *</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.paymentMethod !== "cash" && (
              <div>
                <Label>Reference / Transaction Number</Label>
                <Input className="mt-1" value={form.transactionRef} onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))} placeholder="e.g. 1234567890" />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowRecord(false)}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2" onClick={handleRecord} disabled={recordMut.isPending}>
                <Printer size={15} /> {recordMut.isPending ? "Saving..." : "Record & Print Receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reverse Dialog */}
      <Dialog open={!!showReverse} onOpenChange={() => setShowReverse(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reverse Payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You are reversing receipt <strong>{showReverse?.receipt_number}</strong> for UGX {Number(showReverse?.amount ?? 0).toLocaleString()}.
            This action cannot be undone.
          </p>
          <div>
            <Label>Reason for Reversal *</Label>
            <Textarea className="mt-1" rows={3} value={reversalReason} onChange={e => setReversalReason(e.target.value)} placeholder="State clearly why this payment is being reversed..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowReverse(null)}>Cancel</Button>
            <Button
              variant="destructive" className="flex-1"
              disabled={!reversalReason.trim() || reverseMut.isPending}
              onClick={() => reverseMut.mutate(showReverse?.id)}
            >
              {reverseMut.isPending ? "Reversing..." : "Confirm Reversal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BursarLayout>
  );
}
