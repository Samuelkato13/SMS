import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { BursarLayout } from "@/components/bursar/BursarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, AlertTriangle, FileText } from "lucide-react";
import jsPDF from "jspdf";

const methodColor: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  mobile_money: "bg-blue-100 text-blue-700",
  bank_transfer: "bg-purple-100 text-purple-700",
  cheque: "bg-amber-100 text-amber-700",
};

export default function FinancialReports() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId;

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 8) + "01";
  const [reportType, setReportType] = useState("daily");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["/api/payments/report", schoolId, from, to],
    queryFn: () => fetch(`/api/payments/report?schoolId=${schoolId}&from=${from}&to=${to}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: defaulters = [], isLoading: loadDef } = useQuery({
    queryKey: ["/api/students/defaulters", schoolId],
    queryFn: () => fetch(`/api/students/defaulters?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && reportType === "defaulters",
  });

  const setPreset = (type: string) => {
    setReportType(type);
    const now = new Date();
    if (type === "daily") { setFrom(today); setTo(today); }
    else if (type === "monthly") {
      const f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const t2 = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setFrom(f); setTo(t2);
    } else if (type === "term") {
      setFrom(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]);
      setTo(today);
    }
  };

  const totalAmount = (payments as any[]).reduce((s: number, p: any) => s + Number(p.amount), 0);

  const byMethod = (payments as any[]).reduce((acc: any, p: any) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + Number(p.amount);
    return acc;
  }, {});

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Financial Report", 105, 20, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Period: ${from} to ${to}`, 105, 30, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 36, { align: "center" });
    doc.text(`Total Collected: UGX ${totalAmount.toLocaleString()}`, 14, 50);
    doc.text(`Number of Payments: ${(payments as any[]).length}`, 14, 58);
    let y = 70;
    doc.setFont("helvetica", "bold");
    doc.text("Receipt No", 14, y); doc.text("Student", 55, y); doc.text("Amount", 120, y); doc.text("Method", 155, y); doc.text("Date", 180, y);
    doc.setFont("helvetica", "normal"); y += 6;
    (payments as any[]).slice(0, 40).forEach((p: any) => {
      doc.text(p.receipt_number ?? "—", 14, y);
      doc.text(`${p.first_name ?? ""} ${p.last_name ?? ""}`.slice(0, 22), 55, y);
      doc.text(`UGX ${Number(p.amount).toLocaleString()}`, 120, y);
      doc.text(p.payment_method?.replace("_"," ") ?? "—", 155, y);
      doc.text(p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—", 180, y);
      y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`financial-report-${from}-${to}.pdf`);
  };

  const exportDefaultersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Fee Defaulters Report", 105, 20, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });
    let y = 42;
    doc.setFont("helvetica", "bold");
    doc.text("Student", 14, y); doc.text("Adm No", 70, y); doc.text("Class", 100, y);
    doc.text("Billed", 125, y); doc.text("Paid", 155, y); doc.text("Balance", 175, y);
    doc.setFont("helvetica", "normal"); y += 6;
    (defaulters as any[]).forEach((d: any) => {
      doc.text(d.student_name.slice(0, 24), 14, y);
      doc.text(d.admission_number ?? "—", 70, y);
      doc.text((d.class_name ?? "—").slice(0, 14), 100, y);
      doc.text(`${Number(d.total_billed).toLocaleString()}`, 125, y);
      doc.text(`${Number(d.total_paid).toLocaleString()}`, 155, y);
      doc.text(`${Number(d.balance).toLocaleString()}`, 175, y);
      y += 6; if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save(`defaulters-report.pdf`);
  };

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Generate and export financial summaries</p>
        </div>

        {/* Report type & date filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label className="text-xs mb-1 block">Report Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "daily", label: "Daily" },
                    { key: "monthly", label: "Monthly" },
                    { key: "term", label: "Term" },
                    { key: "custom", label: "Custom" },
                    { key: "defaulters", label: "Defaulters" },
                    { key: "methods", label: "By Method" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setPreset(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        reportType === key ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-300 hover:border-teal-400"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {reportType !== "defaulters" && reportType !== "methods" && (
                <>
                  <div>
                    <Label className="text-xs mb-1 block">From</Label>
                    <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">To</Label>
                    <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
                  </div>
                  <Button onClick={exportPDF} variant="outline" className="gap-2 border-teal-400 text-teal-700 hover:bg-teal-50">
                    <Download size={15} /> Export PDF
                  </Button>
                </>
              )}

              {reportType === "defaulters" && (
                <Button onClick={exportDefaultersPDF} variant="outline" className="gap-2 border-teal-400 text-teal-700 hover:bg-teal-50">
                  <Download size={15} /> Export PDF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Payment Method summary */}
        {(reportType === "methods" || reportType !== "defaulters") && reportType !== "defaulters" && Object.keys(byMethod).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(byMethod).map(([method, amt]: [string, any]) => (
              <Card key={method} className="border">
                <CardContent className="p-4">
                  <Badge className={`text-xs mb-2 ${methodColor[method] ?? "bg-gray-100 text-gray-700"}`}>
                    {method.replace("_", " ")}
                  </Badge>
                  <p className="text-lg font-bold text-gray-900">UGX {Number(amt).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">
                    {(payments as any[]).filter(p => p.payment_method === method).length} txns
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payments Table */}
        {reportType !== "defaulters" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 size={16} className="text-teal-600" />
                  {reportType === "daily" ? "Today's Collections" : "Payments in Period"}
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                  Total: UGX {totalAmount.toLocaleString()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
              ) : (payments as any[]).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileText size={36} className="mx-auto mb-2 opacity-20" />
                  <p>No payments in selected period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Receipt No","Student","Adm No","Class","Fee","Amount","Method","Date","Recorded By"].map(h => (
                          <th key={h} className="text-left p-2.5 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(payments as any[]).map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-2.5 font-mono text-xs text-teal-700">{p.receipt_number ?? "—"}</td>
                          <td className="p-2.5 font-medium whitespace-nowrap">{p.first_name} {p.last_name}</td>
                          <td className="p-2.5 text-gray-500 text-xs">{p.admission_number}</td>
                          <td className="p-2.5 text-gray-500 text-xs">{p.class_name ?? "—"}</td>
                          <td className="p-2.5 text-gray-600 max-w-[140px] truncate">{p.fee_name}</td>
                          <td className="p-2.5 font-semibold text-emerald-700 whitespace-nowrap">UGX {Number(p.amount).toLocaleString()}</td>
                          <td className="p-2.5">
                            <Badge className={`text-xs ${methodColor[p.payment_method] ?? "bg-gray-100 text-gray-700"}`}>
                              {p.payment_method?.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-2.5 text-gray-500 text-xs">{p.recorded_by_name}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-teal-50">
                      <tr>
                        <td colSpan={5} className="p-2.5 font-semibold text-right text-gray-700">Total:</td>
                        <td className="p-2.5 font-bold text-emerald-700">UGX {totalAmount.toLocaleString()}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Defaulters */}
        {reportType === "defaulters" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" /> Fee Defaulters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadDef ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
              ) : (defaulters as any[]).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>No defaulters found — all fees cleared!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 border-b">
                      <tr>
                        {["Student Name","Adm No","Payment Code","Class","Total Billed","Total Paid","Balance"].map(h => (
                          <th key={h} className="text-left p-2.5 font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(defaulters as any[]).map((d: any) => (
                        <tr key={d.id} className="border-b hover:bg-red-50">
                          <td className="p-2.5 font-medium">{d.student_name}</td>
                          <td className="p-2.5 text-gray-500 text-xs">{d.admission_number}</td>
                          <td className="p-2.5 font-mono text-xs text-teal-700">{d.payment_code}</td>
                          <td className="p-2.5 text-gray-500">{d.class_name ?? "—"}</td>
                          <td className="p-2.5 text-gray-700">UGX {Number(d.total_billed).toLocaleString()}</td>
                          <td className="p-2.5 text-emerald-700">UGX {Number(d.total_paid).toLocaleString()}</td>
                          <td className="p-2.5 font-bold text-red-700">UGX {Number(d.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </BursarLayout>
  );
}
