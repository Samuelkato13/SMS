import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useSchoolContext } from "@/contexts/SchoolContext";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Printer, RotateCcw, Search, CreditCard, X, Smartphone,
  Banknote, ArrowDownCircle, Tag, Hash, Phone, Info
} from "lucide-react";
import jsPDF from "jspdf";

const CATEGORY_LABELS: Record<string, string> = {
  tuition: "Tuition", transport: "Transport", boarding: "Boarding",
  uniform: "Uniform", exam: "Exam", development: "Development",
  swimming: "Swimming", library: "Library", lunch: "Lunch",
  other: "Other",
};
const CATEGORY_COLORS: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-800", transport: "bg-orange-100 text-orange-800",
  boarding: "bg-purple-100 text-purple-800", uniform: "bg-pink-100 text-pink-800",
  exam: "bg-red-100 text-red-800", development: "bg-indigo-100 text-indigo-800",
  swimming: "bg-cyan-100 text-cyan-800", library: "bg-yellow-100 text-yellow-800",
  lunch: "bg-lime-100 text-lime-800", other: "bg-gray-100 text-gray-700",
};
const METHOD_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800", mobile_money: "bg-blue-100 text-blue-800",
  bank_transfer: "bg-purple-100 text-purple-800", cheque: "bg-amber-100 text-amber-800",
};
const ADJ_TYPES = [
  { value: "discount", label: "Discount" },
  { value: "waiver", label: "Full/Partial Waiver" },
  { value: "bursary", label: "Bursary/Scholarship" },
  { value: "advance", label: "Advance Payment" },
  { value: "overpayment", label: "Overpayment Credit" },
];
const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2025", "2026", "2027"];

function ugx(n: number) { return `UGX ${Number(n).toLocaleString()}`; }

export default function PaymentsReceived() {
  const { profile } = useAuth();
  const { school } = useSchoolContext();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const schoolName = school?.name ?? "ZaabuPay School";

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("payments");
  const [showRecord, setShowRecord] = useState(false);
  const [showReverse, setShowReverse] = useState<any>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [prn, setPrn] = useState<{ prn: string; instructions: string } | null>(null);
  const [prnLoading, setPrnLoading] = useState(false);

  const emptyForm = {
    studentSearch: "", selectedStudent: null as any,
    feeStructureId: "", amount: "", paymentMethod: "cash",
    provider: "", phoneNumber: "", transactionRef: "", notes: "", prnNumber: ""
  };
  const [form, setForm] = useState(emptyForm);

  const emptyAdj = {
    studentSearch: "", selectedStudent: null as any,
    feeStructureId: "", adjustmentType: "discount", amount: "",
    reason: "", academicYear: "2025", term: "Term 1",
  };
  const [adjForm, setAdjForm] = useState(emptyAdj);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/payments", schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: adjustments = [] } = useQuery({
    queryKey: ["/api/fee-adjustments", schoolId],
    queryFn: () => fetch(`/api/fee-adjustments?schoolId=${schoolId}`).then(r => r.json()),
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
      const r = await fetch("/api/payments/record", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, receiptNumber, schoolId, recordedBy: profile?.id })
      });
      if (!r.ok) throw new Error((await r.json()).message ?? "Failed");
      return r.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/summary"] });
      setShowRecord(false);
      setPrn(null);
      setForm(emptyForm);
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
      setShowReverse(null); setReversalReason("");
      toast({ title: "Payment reversed" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Reversal failed", description: e.message }),
  });

  const adjMut = useMutation({
    mutationFn: (data: any) => fetch("/api/fee-adjustments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, schoolId, appliedBy: profile?.id, appliedByName: `${profile?.firstName} ${profile?.lastName}` })
    }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fee-adjustments"] });
      setShowAdjust(false);
      setAdjForm(emptyAdj);
      toast({ title: "Adjustment recorded" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const generatePRN = async () => {
    if (!form.selectedStudent || !form.amount) {
      toast({ variant: "destructive", title: "Select student and enter amount first" });
      return;
    }
    setPrnLoading(true);
    try {
      const r = await fetch("/api/payments/prn", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, studentId: form.selectedStudent.id, amount: form.amount, feeStructureId: form.feeStructureId })
      });
      const data = await r.json();
      setPrn(data);
      setForm(f => ({ ...f, prnNumber: data.prn }));
    } catch {
      toast({ variant: "destructive", title: "Failed to generate PRN" });
    } finally {
      setPrnLoading(false);
    }
  };

  const printReceipt = (p: any) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 120] });
    const feeName = p.fee_name ?? fees.find((f: any) => f.id === p.fee_structure_id)?.name ?? "School Fee";
    const feeCategory = p.fee_category ?? fees.find((f: any) => f.id === p.fee_structure_id)?.category ?? "tuition";

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(schoolName.toUpperCase(), 40, 10, { align: "center" });
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL PAYMENT RECEIPT", 40, 16, { align: "center" });
    doc.line(5, 18, 75, 18);

    doc.setFontSize(8);
    doc.text(`Receipt No:`, 5, 24); doc.setFont("helvetica", "bold");
    doc.text(String(p.receipt_number ?? "N/A"), 35, 24);
    doc.setFont("helvetica", "normal");
    doc.text(`Date:`, 5, 30); doc.text(new Date(p.paid_at ?? p.created_at).toLocaleDateString(), 35, 30);
    doc.text(`Student:`, 5, 36); doc.text(`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—", 35, 36);
    doc.text(`Std No:`, 5, 42); doc.text(String(p.payment_code ?? p.student_code ?? "—"), 35, 42);
    doc.text(`Fee Type:`, 5, 48); doc.text(`${feeName} (${CATEGORY_LABELS[feeCategory] ?? feeCategory})`, 35, 48);
    doc.line(5, 52, 75, 52);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text(`Amount Paid:`, 5, 60);
    doc.text(`UGX ${Number(p.amount).toLocaleString()}`, 35, 60);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Method:`, 5, 67); doc.text(String(p.payment_method ?? "Cash").replace("_", " ").toUpperCase(), 35, 67);
    if (p.provider) { doc.text(`Provider:`, 5, 73); doc.text(String(p.provider).toUpperCase(), 35, 73); }
    if (p.transaction_ref) { doc.text(`Ref:`, 5, 79); doc.text(String(p.transaction_ref), 35, 79); }
    if (p.prn_number) { doc.text(`PRN:`, 5, 85); doc.setFont("helvetica", "bold"); doc.text(String(p.prn_number), 35, 85); doc.setFont("helvetica", "normal"); }
    if (p.notes) { doc.text(`Notes:`, 5, 91); doc.text(String(p.notes).slice(0, 30), 35, 91); }
    doc.line(5, 95, 75, 95);
    doc.setFontSize(7);
    doc.text("Thank you for your payment.", 40, 101, { align: "center" });
    doc.text("Keep this receipt for your records.", 40, 106, { align: "center" });
    doc.text("SKYVALE Technologies Uganda Limited", 40, 112, { align: "center" });
    doc.save(`receipt-${p.receipt_number ?? "new"}.pdf`);
  };

  const handleRecord = () => {
    if (!form.selectedStudent) return toast({ variant: "destructive", title: "Select a student" });
    if (!form.feeStructureId) return toast({ variant: "destructive", title: "Select a fee type" });
    if (!form.amount || isNaN(Number(form.amount))) return toast({ variant: "destructive", title: "Enter valid amount" });
    recordMut.mutate({
      studentId: form.selectedStudent.id,
      feeStructureId: form.feeStructureId,
      paymentCode: form.selectedStudent.payment_code,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      provider: form.provider || null,
      phoneNumber: form.phoneNumber || null,
      transactionRef: form.transactionRef || null,
      notes: form.notes || null,
      prnNumber: form.prnNumber || null,
    });
  };

  const handleAdj = () => {
    if (!adjForm.selectedStudent) return toast({ variant: "destructive", title: "Select a student" });
    if (!adjForm.amount || isNaN(Number(adjForm.amount))) return toast({ variant: "destructive", title: "Enter valid amount" });
    adjMut.mutate({
      studentId: adjForm.selectedStudent.id,
      feeStructureId: adjForm.feeStructureId || null,
      adjustmentType: adjForm.adjustmentType,
      amount: Number(adjForm.amount),
      reason: adjForm.reason || null,
      academicYear: adjForm.academicYear,
      term: adjForm.term,
    });
  };

  const matchStudents = (search: string) => students.filter((s: any) =>
    search.length > 1 &&
    `${s.first_name} ${s.last_name} ${s.admission_number} ${s.payment_code}`.toLowerCase().includes(search.toLowerCase())
  );

  const filtered = (payments as any[]).filter((p: any) => {
    const q = search.toLowerCase();
    return !q || `${p.first_name} ${p.last_name} ${p.receipt_number} ${p.student_code} ${p.fee_name}`.toLowerCase().includes(q);
  });

  const StudentSearchInput = ({ formState, setFormState }: { formState: any; setFormState: (fn: (f: any) => any) => void }) => {
    const matches = matchStudents(formState.studentSearch);
    return formState.selectedStudent ? (
      <div className="flex items-center justify-between mt-1 p-2 border rounded-lg bg-teal-50">
        <div>
          <p className="font-medium text-sm">{formState.selectedStudent.first_name} {formState.selectedStudent.last_name}</p>
          <p className="text-xs text-gray-500">{formState.selectedStudent.admission_number} · {formState.selectedStudent.payment_code}</p>
        </div>
        <button onClick={() => setFormState(f => ({ ...f, selectedStudent: null, studentSearch: "" }))}><X size={16} /></button>
      </div>
    ) : (
      <div className="relative mt-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Type name, admission no, or payment code..."
          value={formState.studentSearch}
          onChange={e => setFormState(f => ({ ...f, studentSearch: e.target.value }))}
          className="pl-8"
        />
        {matches.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
            {matches.map((s: any) => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 hover:bg-teal-50 text-sm border-b last:border-0"
                onClick={() => setFormState(f => ({ ...f, selectedStudent: s, studentSearch: "" }))}
              >
                <span className="font-medium">{s.first_name} {s.last_name}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-xs text-gray-500">{s.admission_number}</span>
                <span className="text-xs text-teal-600 ml-2 font-mono">{s.payment_code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <BursarLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments & Adjustments</h1>
            <p className="text-gray-500 text-sm mt-0.5">Record payments, generate PRNs, and manage fee adjustments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAdjust(true)} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
              <Tag size={15} /> Discount / Adjustment
            </Button>
            <Button onClick={() => setShowRecord(true)} className="bg-teal-600 hover:bg-teal-700 gap-2">
              <Plus size={16} /> Record Payment
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="payments">Payments ({filtered.length})</TabsTrigger>
            <TabsTrigger value="adjustments">Fee Adjustments ({(adjustments as any[]).length})</TabsTrigger>
          </TabsList>

          {/* ── Payments Tab ── */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search by student, receipt, fee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}</div>
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
                          {["Receipt No", "Student", "Fee Type", "Category", "Amount", "Method", "Ref/PRN", "Date", "Actions"].map(h => (
                            <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p: any) => {
                          const feeData = (fees as any[]).find((f: any) => f.id === p.fee_structure_id);
                          const cat = feeData?.category ?? "other";
                          return (
                            <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.is_reversed ? "opacity-50 bg-red-50/30" : ""}`}>
                              <td className="p-3 font-mono text-xs text-teal-700 font-semibold whitespace-nowrap">
                                {p.receipt_number ?? "—"}
                                {p.is_reversed && <Badge className="ml-1 text-xs bg-red-100 text-red-700">Reversed</Badge>}
                              </td>
                              <td className="p-3 font-medium whitespace-nowrap">
                                {p.first_name} {p.last_name}
                                <span className="block text-xs text-gray-400 font-mono">{p.student_code}</span>
                              </td>
                              <td className="p-3 text-xs text-gray-600 max-w-[120px] truncate">{p.fee_name ?? "—"}</td>
                              <td className="p-3">
                                <Badge className={`text-xs ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}`}>
                                  {CATEGORY_LABELS[cat] ?? cat}
                                </Badge>
                              </td>
                              <td className="p-3 font-semibold text-emerald-700 whitespace-nowrap">{ugx(Number(p.amount))}</td>
                              <td className="p-3">
                                <Badge className={`text-xs ${METHOD_COLORS[p.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                                  {p.payment_method === "mobile_money" && p.provider
                                    ? p.provider.toUpperCase()
                                    : (p.payment_method?.replace("_", " ") ?? "Cash")}
                                </Badge>
                              </td>
                              <td className="p-3 text-xs text-gray-500 font-mono max-w-[100px] truncate">
                                {p.prn_number ?? p.transaction_ref ?? "—"}
                              </td>
                              <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                                {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-teal-600" title="Print receipt" onClick={() => printReceipt(p)}>
                                    <Printer size={13} />
                                  </Button>
                                  {!p.is_reversed && (
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700" title="Reverse" onClick={() => setShowReverse(p)}>
                                      <RotateCcw size={13} />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Adjustments Tab ── */}
          <TabsContent value="adjustments" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fee Adjustments Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(adjustments as any[]).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Tag className="mx-auto mb-3 opacity-20" size={40} />
                    <p className="text-sm">No fee adjustments yet</p>
                    <Button className="mt-3" size="sm" onClick={() => setShowAdjust(true)}>Record a Discount or Waiver</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {["Student", "ID", "Type", "Fee", "Amount", "Reason", "Term", "Applied By", "Date"].map(h => (
                            <th key={h} className="text-left p-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(adjustments as any[]).map((a: any) => (
                          <tr key={a.id} className="border-b hover:bg-amber-50/30">
                            <td className="p-3 font-medium">{a.student_name}</td>
                            <td className="p-3 text-xs text-gray-400 font-mono">{a.payment_code}</td>
                            <td className="p-3">
                              <Badge className={`text-xs capitalize ${
                                a.adjustment_type === "discount" ? "bg-amber-100 text-amber-800" :
                                a.adjustment_type === "waiver" ? "bg-purple-100 text-purple-800" :
                                a.adjustment_type === "bursary" ? "bg-blue-100 text-blue-800" :
                                "bg-green-100 text-green-800"
                              }`}>{ADJ_TYPES.find(t => t.value === a.adjustment_type)?.label ?? a.adjustment_type}</Badge>
                            </td>
                            <td className="p-3 text-xs text-gray-600">{a.fee_name ?? "General"}</td>
                            <td className="p-3 font-bold text-amber-700">{ugx(Number(a.amount))}</td>
                            <td className="p-3 text-xs text-gray-500 max-w-[150px] truncate">{a.reason ?? "—"}</td>
                            <td className="p-3 text-xs text-gray-500">{a.term ?? "—"}</td>
                            <td className="p-3 text-xs text-gray-500">{a.applied_by_name ?? "—"}</td>
                            <td className="p-3 text-xs text-gray-400">
                              {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Record Payment Dialog ── */}
      <Dialog open={showRecord} onOpenChange={v => { setShowRecord(v); if (!v) { setPrn(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student *</Label>
              <StudentSearchInput formState={form} setFormState={setForm} />
            </div>

            <div>
              <Label>Fee Type *</Label>
              <Select value={form.feeStructureId} onValueChange={v => {
                const fee = (fees as any[]).find((f: any) => f.id === v);
                setForm(f => ({ ...f, feeStructureId: v, amount: fee ? String(fee.amount) : f.amount }));
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select fee..." /></SelectTrigger>
                <SelectContent>
                  {(fees as any[]).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[f.category ?? "other"] ?? "bg-gray-100 text-gray-700"}`}>
                          {CATEGORY_LABELS[f.category ?? "other"] ?? f.category}
                        </span>
                        {f.name} — {ugx(f.amount)} ({f.term})
                      </div>
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
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v, provider: "", phoneNumber: "", prnNumber: "" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash"><span className="flex items-center gap-2"><Banknote size={13} /> Cash</span></SelectItem>
                    <SelectItem value="mobile_money"><span className="flex items-center gap-2"><Smartphone size={13} /> Mobile Money</span></SelectItem>
                    <SelectItem value="bank_transfer"><span className="flex items-center gap-2"><ArrowDownCircle size={13} /> Bank Transfer</span></SelectItem>
                    <SelectItem value="cheque"><span className="flex items-center gap-2"><Hash size={13} /> Cheque</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile money specific fields */}
            {form.paymentMethod === "mobile_money" && (
              <div className="space-y-3">
                {/* Coming Soon banner */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={16} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Direct MTN / Airtel Integration — Coming Soon</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Automatic push &amp; pull payments will be available in a future update. For now, record the transaction details manually after the parent has paid via mobile money.
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Provider</Label>
                      <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
                        <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                          <SelectItem value="airtel">Airtel Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payer's Phone Number</Label>
                      <div className="relative mt-1">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input className="pl-8 h-9" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="07XX XXX XXX" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Transaction Reference / PRN</Label>
                      <Input
                        className="mt-1 h-9 font-mono text-sm"
                        value={form.prnNumber || form.transactionRef}
                        onChange={e => setForm(f => ({ ...f, prnNumber: e.target.value, transactionRef: e.target.value }))}
                        placeholder="Enter the mobile money transaction ID..."
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 mt-5">
                      <Button
                        size="sm" variant="outline"
                        className="h-9 text-xs border-blue-300 text-blue-700 whitespace-nowrap"
                        onClick={generatePRN} disabled={prnLoading}
                      >
                        {prnLoading ? "..." : "Gen. Ref No."}
                      </Button>
                      <span className="text-[9px] text-gray-400">Demo only</span>
                    </div>
                  </div>
                  {prn && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Info size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Demo Reference Number</p>
                          <p className="text-xs font-bold text-blue-800 font-mono">{prn.prn}</p>
                          <p className="text-xs text-gray-500 mt-1">Real MTN/Airtel integration coming soon. Use this number for record-keeping only.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {form.paymentMethod === "bank_transfer" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ArrowDownCircle size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-800">Direct Bank Transfer Integration — Coming Soon</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Automated bank feed &amp; direct transfer verification coming in a future update. Enter the bank reference number below after confirming the transfer on your bank statement.
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Bank Transaction Reference *</Label>
                  <Input className="mt-1" value={form.transactionRef} onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))} placeholder="e.g. TXN2025031400456" />
                </div>
              </div>
            )}

            {form.paymentMethod === "cheque" && (
              <div>
                <Label>Cheque Number *</Label>
                <Input className="mt-1" value={form.transactionRef} onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))} placeholder="Cheque number" />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowRecord(false); setPrn(null); setForm(emptyForm); }}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2" onClick={handleRecord} disabled={recordMut.isPending}>
                <Printer size={15} /> {recordMut.isPending ? "Saving..." : "Record & Print Receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Fee Adjustment Dialog ── */}
      <Dialog open={showAdjust} onOpenChange={v => { setShowAdjust(v); if (!v) setAdjForm(emptyAdj); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Fee Adjustment</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">Use this for discounts, bursaries, waivers, or advance fee credits.</p>
          <div className="space-y-4">
            <div>
              <Label>Student *</Label>
              <StudentSearchInput formState={adjForm} setFormState={setAdjForm} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Adjustment Type *</Label>
                <Select value={adjForm.adjustmentType} onValueChange={v => setAdjForm(f => ({ ...f, adjustmentType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADJ_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" className="mt-1" value={adjForm.amount} onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Related Fee (optional)</Label>
              <Select value={adjForm.feeStructureId} onValueChange={v => setAdjForm(f => ({ ...f, feeStructureId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select fee type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General (no specific fee)</SelectItem>
                  {(fees as any[]).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} ({CATEGORY_LABELS[f.category ?? "other"] ?? f.category})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic Year</Label>
                <Select value={adjForm.academicYear} onValueChange={v => setAdjForm(f => ({ ...f, academicYear: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={adjForm.term} onValueChange={v => setAdjForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason / Notes *</Label>
              <Textarea className="mt-1" rows={2} value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} placeholder="State clearly why this adjustment is being made..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAdjust(false); setAdjForm(emptyAdj); }}>Cancel</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleAdj} disabled={adjMut.isPending}>
                {adjMut.isPending ? "Saving..." : "Record Adjustment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reverse Dialog ── */}
      <Dialog open={!!showReverse} onOpenChange={() => setShowReverse(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Reverse Payment</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Reversing receipt <strong>{showReverse?.receipt_number}</strong> — {ugx(Number(showReverse?.amount ?? 0))}.
            This cannot be undone.
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
