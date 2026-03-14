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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Printer, RotateCcw, Receipt } from "lucide-react";
import jsPDF from "jspdf";

const methodColor: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  mobile_money: "bg-blue-100 text-blue-700",
  bank_transfer: "bg-purple-100 text-purple-700",
  cheque: "bg-amber-100 text-amber-700",
};

export default function ReceiptsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showCancel, setShowCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/payments", schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/payments/${id}/reverse`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reversalReason: cancelReason })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setShowCancel(null); setCancelReason("");
      toast({ title: "Receipt cancelled" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const printReceipt = (p: any) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 120] });
    const schoolName = profile?.schoolName ?? "School";
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(schoolName, 40, 12, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Official Payment Receipt", 40, 18, { align: "center" });
    doc.line(5, 21, 75, 21);
    doc.setFontSize(9);
    doc.text(`Receipt No: ${p.receipt_number ?? "N/A"}`, 5, 27);
    doc.text(`Date: ${p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}`, 5, 33);
    doc.line(5, 36, 75, 36);
    doc.setFont("helvetica", "bold");
    doc.text(`Student: ${p.first_name ?? ""} ${p.last_name ?? ""}`, 5, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Admission No: ${p.student_code ?? "—"}`, 5, 48);
    doc.text(`Fee: ${p.fee_name ?? "—"}`, 5, 54);
    doc.line(5, 57, 75, 57);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(`AMOUNT PAID: UGX ${Number(p.amount).toLocaleString()}`, 40, 65, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Payment Method: ${p.payment_method?.replace("_", " ") ?? "—"}`, 5, 72);
    if (p.transaction_ref) doc.text(`Reference: ${p.transaction_ref}`, 5, 78);
    if (p.notes) doc.text(`Notes: ${p.notes}`, 5, 84);
    doc.line(5, 88, 75, 88);
    doc.setFontSize(8);
    doc.text("Cashier: " + (profile?.firstName ?? "") + " " + (profile?.lastName ?? ""), 5, 94);
    doc.text("Thank you for your payment!", 40, 101, { align: "center" });
    doc.save(`receipt-${p.receipt_number ?? "copy"}.pdf`);
  };

  const filtered = (payments as any[]).filter((p: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.first_name} ${p.last_name} ${p.receipt_number} ${p.student_code} ${p.fee_name}`.toLowerCase().includes(q);
    const paidDate = p.paid_at ? new Date(p.paid_at) : null;
    const matchFrom = !dateFrom || (paidDate && paidDate >= new Date(dateFrom));
    const matchTo = !dateTo || (paidDate && paidDate <= new Date(dateTo + "T23:59:59"));
    return matchSearch && matchFrom && matchTo;
  });

  const totalToday = (payments as any[]).filter((p: any) => {
    const today = new Date().toDateString();
    return !p.is_reversed && p.paid_at && new Date(p.paid_at).toDateString() === today;
  }).length;

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Search, reprint and manage receipts</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-medium">Total Receipts</p>
              <p className="text-2xl font-bold text-teal-700 mt-1">{(payments as any[]).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-medium">Today's Receipts</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalToday}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-medium">Cancelled Receipts</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{(payments as any[]).filter(p => p.is_reversed).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <Label className="text-xs mb-1 block">Search</Label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="Student, receipt no, fee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1 block">From Date</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">To Date</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
              </div>
              {(search || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipts table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt size={16} className="text-teal-600" /> Receipt Journal
              <Badge className="ml-auto bg-gray-100 text-gray-700">{filtered.length} receipts</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Receipt size={40} className="mx-auto mb-2 opacity-20" />
                <p>No receipts match your search</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Receipt No","Student","Fee","Amount","Method","Date","Status","Actions"].map(h => (
                        <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p: any) => (
                      <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.is_reversed ? "opacity-60 bg-red-50" : ""}`}>
                        <td className="p-3 font-mono text-xs text-teal-700 font-semibold">{p.receipt_number ?? "—"}</td>
                        <td className="p-3 font-medium whitespace-nowrap">{p.first_name} {p.last_name}</td>
                        <td className="p-3 text-gray-600 max-w-[150px] truncate">{p.fee_name}</td>
                        <td className="p-3 font-semibold text-emerald-700 whitespace-nowrap">UGX {Number(p.amount).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${methodColor[p.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                            {p.payment_method?.replace("_"," ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3">
                          {p.is_reversed
                            ? <div>
                                <Badge className="bg-red-100 text-red-700 text-xs block mb-1">Cancelled</Badge>
                                {p.reversal_reason && <p className="text-xs text-gray-400 max-w-[120px] truncate">{p.reversal_reason}</p>}
                              </div>
                            : <Badge className="bg-green-100 text-green-700 text-xs">Valid</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600 hover:text-teal-800" onClick={() => printReceipt(p)} title="Reprint receipt">
                              <Printer size={13} />
                            </Button>
                            {!p.is_reversed && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => setShowCancel(p)} title="Cancel receipt">
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

      {/* Cancel Dialog */}
      <Dialog open={!!showCancel} onOpenChange={() => setShowCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Cancel Receipt</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            Cancel receipt <strong>{showCancel?.receipt_number}</strong> for UGX {Number(showCancel?.amount ?? 0).toLocaleString()}?
            This marks the payment as cancelled and cannot be undone.
          </p>
          <div>
            <Label>Reason for Cancellation *</Label>
            <Textarea className="mt-1" rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="State clearly why this receipt is being cancelled..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancel(null)}>Keep Receipt</Button>
            <Button variant="destructive" className="flex-1"
              disabled={!cancelReason.trim() || cancelMut.isPending}
              onClick={() => cancelMut.mutate(showCancel?.id)}>
              {cancelMut.isPending ? "Cancelling..." : "Cancel Receipt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BursarLayout>
  );
}
