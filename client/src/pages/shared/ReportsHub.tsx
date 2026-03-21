import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BarChart3, Users, CreditCard, FileText, Clock, DollarSign,
  RefreshCw, Download, Printer, Plus, Trash2, Filter, Calendar,
  TrendingUp, Activity, ChevronRight, School, BookOpen, X
} from "lucide-react";
import jsPDF from "jspdf";

// ── Role access matrix ────────────────────────────────────────────────────────
const TAB_ACCESS: Record<string, string[]> = {
  channel_graphs:      ["bursar", "director", "super_admin"],
  class_graphs:        ["head_teacher", "director", "super_admin"],
  students_report:     ["director", "head_teacher", "class_teacher", "super_admin"],
  transaction_report:  ["bursar", "director", "super_admin"],
  channel_summary:     ["bursar", "director", "super_admin"],
  timetable:           ["director", "head_teacher", "class_teacher", "subject_teacher", "bursar", "super_admin"],
  detailed_fees:       ["bursar", "director", "super_admin"],
  balance_adjustments: ["bursar", "director", "super_admin"],
};

const ALL_TABS = [
  { id: "channel_graphs",      label: "Channel Graphs",      icon: BarChart3    },
  { id: "class_graphs",        label: "Class Graphs",        icon: Activity     },
  { id: "students_report",     label: "Students Report",     icon: Users        },
  { id: "transaction_report",  label: "Transaction Report",  icon: CreditCard   },
  { id: "channel_summary",     label: "Channel Summary",     icon: TrendingUp   },
  { id: "timetable",           label: "Timetable",           icon: Clock        },
  { id: "detailed_fees",       label: "Detailed Fees",       icon: DollarSign   },
  { id: "balance_adjustments", label: "Balance Adjustments", icon: RefreshCw    },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", mobile_money: "Mobile Money", bank_transfer: "Bank Transfer",
  cheque: "Cheque", mtn: "MTN Mobile Money", airtel: "Airtel Money",
};
const METHOD_COLORS: Record<string, string> = {
  cash: "bg-emerald-500", mobile_money: "bg-blue-500",
  bank_transfer: "bg-purple-500", cheque: "bg-amber-500",
  mtn: "bg-yellow-500", airtel: "bg-red-500",
};

function ugx(n: number) { return `UGX ${Number(n).toLocaleString()}`; }

function CSSBar({ pct, color = "bg-blue-500", label = "" }: { pct: number; color?: string; label?: string }) {
  return (
    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
      {label && (
        <span className="absolute right-2 top-0 text-[9px] font-semibold text-gray-600 leading-4">{label}</span>
      )}
    </div>
  );
}

export default function ReportsHub() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const role = profile?.role ?? "";

  const visibleTabs = ALL_TABS.filter(t => TAB_ACCESS[t.id]?.includes(role));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id ?? "");

  // Date range for financial reports
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo]   = useState(today);

  // Student report filters
  const [filterClass, setFilterClass] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [studentSearch, setStudentSearch] = useState("");

  // Timetable state
  const [ttClass, setTtClass] = useState("");
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: "Monday", periodNumber: "1", subjectId: "", teacherId: "",
    startTime: "07:30", endTime: "08:30", room: "",
  });

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students", schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects", schoolId],
    queryFn: () => fetch(`/api/subjects?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users", schoolId],
    queryFn: () => fetch(`/api/users?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: marks = [] } = useQuery<any[]>({
    queryKey: ["/api/marks", schoolId],
    queryFn: () => fetch(`/api/marks?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && ["class_graphs"].includes(activeTab),
  });
  const { data: payments = [], isLoading: loadPay } = useQuery<any[]>({
    queryKey: ["/api/payments/report", schoolId, from, to],
    queryFn: () => fetch(`/api/payments/report?schoolId=${schoolId}&from=${from}&to=${to}`).then(r => r.json()),
    enabled: !!schoolId && ["channel_graphs", "transaction_report", "channel_summary", "detailed_fees", "balance_adjustments"].includes(activeTab),
  });
  const { data: feeStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/fee-structures", schoolId],
    queryFn: () => fetch(`/api/fee-structures?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && ["detailed_fees"].includes(activeTab),
  });
  const { data: feeAdjustments = [] } = useQuery<any[]>({
    queryKey: ["/api/fee-adjustments", schoolId],
    queryFn: () => fetch(`/api/fee-adjustments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && activeTab === "balance_adjustments",
  });
  const { data: allPayments = [] } = useQuery<any[]>({
    queryKey: ["/api/payments", schoolId],
    queryFn: () => fetch(`/api/payments?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && activeTab === "balance_adjustments",
  });
  const { data: timetableData = [], isLoading: loadTT } = useQuery<any[]>({
    queryKey: ["/api/timetable", schoolId, ttClass],
    queryFn: () => fetch(`/api/timetable?schoolId=${schoolId}${ttClass ? `&classId=${ttClass}` : ""}`).then(r => r.json()),
    enabled: !!schoolId && activeTab === "timetable",
  });

  // ── Timetable CRUD ────────────────────────────────────────────────────────
  const addSlotMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/timetable", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({ title: "Timetable slot added" });
      setAddSlotOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });
  const deleteSlotMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/timetable/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({ title: "Slot removed" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const canEditTimetable = ["director", "head_teacher", "super_admin"].includes(role);

  // ── Derived data ──────────────────────────────────────────────────────────
  const activeStudents = useMemo(() => students.filter((s: any) => s.is_active !== false), [students]);

  // Channel / payment method data
  const byChannel = useMemo(() => {
    const acc: Record<string, number> = {};
    (payments as any[]).forEach((p: any) => {
      const key = p.payment_method || "cash";
      acc[key] = (acc[key] || 0) + Number(p.amount);
    });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [payments]);
  const totalPay = byChannel.reduce((s, [, v]) => s + v, 0);

  // Class performance data
  const classPerf = useMemo(() => classes.map((c: any) => {
    const cm = (marks as any[]).filter((m: any) => m.class_id === c.id);
    const avg = cm.length ? cm.reduce((s: number, m: any) => s + Number(m.marks_obtained ?? 0), 0) / cm.length : 0;
    const pass = cm.length ? cm.filter((m: any) => (m.marks_obtained / m.total_marks) >= 0.5).length / cm.length * 100 : 0;
    const studentCount = activeStudents.filter((s: any) => s.class_id === c.id).length;
    return { name: c.name, avg: parseFloat(avg.toFixed(1)), pass: parseFloat(pass.toFixed(1)), studentCount };
  }).filter(c => c.studentCount > 0).sort((a, b) => b.avg - a.avg), [classes, marks, activeStudents]);
  const maxAvg = Math.max(...classPerf.map(c => c.avg), 100);

  // Student report data
  const filteredStudents = useMemo(() => {
    let list = students as any[];
    if (filterStatus === "active") list = list.filter(s => s.is_active !== false);
    else if (filterStatus === "inactive") list = list.filter(s => s.is_active === false);
    if (filterClass) list = list.filter(s => s.class_id === filterClass);
    if (filterGender) list = list.filter(s => s.gender === filterGender);
    if (filterSection) list = list.filter(s => s.section === filterSection);
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      list = list.filter(s =>
        `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [students, filterStatus, filterClass, filterGender, filterSection, studentSearch]);

  // Reversed payments (from allPayments which includes reversed ones)
  const adjustments = useMemo(() => (allPayments as any[]).filter(p => p.is_reversed), [allPayments]);

  // Timetable grid per day+period
  const ttGrid = useMemo(() => {
    const grid: Record<string, Record<number, any>> = {};
    DAYS.forEach(d => { grid[d] = {}; });
    timetableData.forEach((e: any) => {
      if (!grid[e.day_of_week]) grid[e.day_of_week] = {};
      grid[e.day_of_week][e.period_number] = e;
    });
    return grid;
  }, [timetableData]);

  const teachers = users.filter((u: any) => ["subject_teacher", "class_teacher"].includes(u.role));

  // ── PDF Exports ───────────────────────────────────────────────────────────
  const exportTransactionPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Transaction Report", 105, 18, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Period: ${from} to ${to}`, 105, 26, { align: "center" });
    doc.text(`Total: ${ugx(totalPay)}  |  Transactions: ${payments.length}`, 105, 32, { align: "center" });
    let y = 44;
    ["Receipt No", "Student", "Amount (UGX)", "Method", "Date"].forEach((h, i) =>
      { doc.setFont("helvetica", "bold"); doc.text(h, [14, 55, 105, 145, 170][i], y); }
    );
    doc.setFont("helvetica", "normal"); y += 6;
    (payments as any[]).slice(0, 50).forEach((p: any) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(String(p.receipt_number ?? "—").slice(0, 12), 14, y);
      doc.text(`${p.first_name ?? ""} ${p.last_name ?? ""}`.slice(0, 22), 55, y);
      doc.text(Number(p.amount).toLocaleString(), 105, y);
      doc.text(String(p.payment_method ?? "—"), 145, y);
      doc.text(p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—", 170, y);
      y += 7;
    });
    doc.save(`transactions_${from}_${to}.pdf`);
  };

  const exportStudentsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Students Report", 105, 18, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Total: ${filteredStudents.length} students  |  Generated: ${new Date().toLocaleDateString()}`, 105, 26, { align: "center" });
    let y = 40;
    ["#", "Name", "Class", "Gender", "Section", "Status"].forEach((h, i) =>
      { doc.setFont("helvetica", "bold"); doc.text(h, [14, 22, 90, 125, 150, 175][i], y); }
    );
    doc.setFont("helvetica", "normal"); y += 7;
    filteredStudents.slice(0, 60).forEach((s: any, idx: number) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const cls = classes.find((c: any) => c.id === s.class_id);
      doc.text(String(idx + 1), 14, y);
      doc.text(`${s.first_name} ${s.last_name}`.slice(0, 24), 22, y);
      doc.text(String(cls?.name ?? "—"), 90, y);
      doc.text(String(s.gender ?? "—"), 125, y);
      doc.text(String(s.section ?? "—"), 150, y);
      doc.text(s.is_active !== false ? "Active" : "Inactive", 175, y);
      y += 7;
    });
    doc.save(`students_report_${today}.pdf`);
  };

  const exportFeesPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Detailed Fees Report", 105, 18, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Period: ${from} to ${to}`, 105, 26, { align: "center" });
    let y = 40;
    const payByStudent = (payments as any[]).reduce((acc: any, p: any) => {
      if (!acc[p.student_id]) acc[p.student_id] = { name: `${p.first_name} ${p.last_name}`, total: 0, count: 0 };
      acc[p.student_id].total += Number(p.amount);
      acc[p.student_id].count += 1;
      return acc;
    }, {});
    ["Student", "Payments", "Total Paid (UGX)"].forEach((h, i) => {
      doc.setFont("helvetica", "bold"); doc.text(h, [14, 100, 150][i], y);
    });
    doc.setFont("helvetica", "normal"); y += 7;
    Object.values(payByStudent).sort((a: any, b: any) => b.total - a.total).slice(0, 60).forEach((p: any) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(String(p.name).slice(0, 30), 14, y);
      doc.text(String(p.count), 100, y);
      doc.text(Number(p.total).toLocaleString(), 150, y);
      y += 7;
    });
    doc.save(`fees_detailed_${from}_${to}.pdf`);
  };

  const exportTimetablePDF = () => {
    const cls = classes.find((c: any) => c.id === ttClass);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(`Class Timetable — ${cls?.name ?? "All Classes"}`, 148, 16, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const colW = 38, startX = 25, startY = 28, rowH = 12;
    DAYS.forEach((d, i) => {
      doc.setFont("helvetica", "bold");
      doc.text(d, startX + i * colW + colW / 2, startY, { align: "center" });
    });
    PERIODS.forEach((p, pi) => {
      const rowY = startY + (pi + 1) * rowH;
      doc.setFont("helvetica", "bold");
      doc.text(`P${p}`, 14, rowY);
      DAYS.forEach((d, di) => {
        const slot = ttGrid[d]?.[p];
        doc.setFont("helvetica", "normal");
        doc.text(slot?.subject_name?.slice(0, 12) ?? "—", startX + di * colW + colW / 2, rowY, { align: "center" });
      });
    });
    doc.save(`timetable_${cls?.name ?? "all"}.pdf`);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const DateRangeBar = () => (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs mt-1 w-36" />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs mt-1 w-36" />
      </div>
      {["Today", "This Month", "This Year"].map((lbl, i) => (
        <Button key={lbl} size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
          const now = new Date();
          if (i === 0) { setFrom(today); setTo(today); }
          else if (i === 1) {
            setFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
            setTo(today);
          } else {
            setFrom(`${now.getFullYear()}-01-01`); setTo(today);
          }
        }}>{lbl}</Button>
      ))}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports Hub</h1>
          <p className="text-sm text-gray-500">
            {visibleTabs.length} report{visibleTabs.length !== 1 ? "s" : ""} available for your role
          </p>
        </div>
      </div>

      {visibleTabs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No reports available for your role.</p>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1.5">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Tab: Channel Graphs ──────────────────────────────────────── */}
          {activeTab === "channel_graphs" && (
            <div className="space-y-4">
              <DateRangeBar />
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Payment Channels — {from} to {to}</span>
                    <Badge className="bg-blue-50 text-blue-700">{ugx(totalPay)} total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {byChannel.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">No payments in this period</p>
                  ) : (
                    <div className="space-y-4">
                      {byChannel.map(([method, amount]) => {
                        const pct = totalPay > 0 ? (amount / totalPay) * 100 : 0;
                        const color = METHOD_COLORS[method] ?? "bg-gray-400";
                        return (
                          <div key={method} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color}`} />
                                <span className="font-medium text-gray-700">
                                  {METHOD_LABELS[method] ?? method.replace(/_/g, " ")}
                                </span>
                                <Badge className="text-xs bg-gray-50 text-gray-600">
                                  {(payments as any[]).filter(p => (p.payment_method || "cash") === method).length} txns
                                </Badge>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-gray-900">{ugx(amount)}</span>
                                <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                              </div>
                            </div>
                            <CSSBar pct={pct} color={color} />
                          </div>
                        );
                      })}

                      {/* Pie-style legend */}
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Distribution</p>
                        <div className="flex flex-wrap gap-2">
                          {byChannel.map(([method, amount]) => {
                            const pct = totalPay > 0 ? (amount / totalPay) * 100 : 0;
                            const color = METHOD_COLORS[method] ?? "bg-gray-400";
                            return (
                              <div key={method} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1">
                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-xs text-gray-600">{METHOD_LABELS[method] ?? method}</span>
                                <span className="text-xs font-bold text-gray-700">{pct.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily trend */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daily Collection Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const byDay: Record<string, number> = {};
                    (payments as any[]).forEach((p: any) => {
                      const d = p.paid_at ? p.paid_at.slice(0, 10) : "—";
                      byDay[d] = (byDay[d] || 0) + Number(p.amount);
                    });
                    const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
                    const mx = Math.max(...days.map(([, v]) => v), 1);
                    if (!days.length) return <p className="text-center text-gray-400 py-6 text-sm">No data</p>;
                    return (
                      <div className="space-y-2">
                        {days.map(([d, amt]) => (
                          <div key={d} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{d}</span>
                            <div className="flex-1">
                              <CSSBar pct={(amt / mx) * 100} color="bg-blue-500" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-28 text-right">{ugx(amt)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Class Graphs ────────────────────────────────────────── */}
          {activeTab === "class_graphs" && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Classes", value: classes.length, color: "bg-blue-500" },
                  { label: "Active Students", value: activeStudents.length, color: "bg-emerald-500" },
                  { label: "Marks Recorded", value: marks.length, color: "bg-purple-500" },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-xl font-bold text-gray-900">{s.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Average Score per Class</CardTitle>
                </CardHeader>
                <CardContent>
                  {classPerf.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      No marks recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {classPerf.map(c => (
                        <div key={c.name} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <School className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium text-gray-700">{c.name}</span>
                              <span className="text-xs text-gray-400">{c.studentCount} students</span>
                            </div>
                            <div className="text-right text-xs">
                              <span className="font-bold text-gray-900">{c.avg}%</span>
                              <span className="text-gray-400 ml-2">Pass: {c.pass}%</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <div className="flex-1">
                              <CSSBar pct={(c.avg / maxAvg) * 100} color="bg-blue-500" />
                            </div>
                            <div className="w-24">
                              <CSSBar pct={c.pass} color={c.pass >= 60 ? "bg-emerald-500" : c.pass >= 40 ? "bg-amber-500" : "bg-red-500"} />
                            </div>
                          </div>
                          <div className="flex gap-1 text-[9px] text-gray-400 justify-end">
                            <span className="w-4 text-center text-blue-500">●</span> Avg
                            <span className="w-4 text-center text-emerald-500 ml-2">●</span> Pass rate
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enrollment per class */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Enrollment per Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {classes.map((c: any) => {
                      const cnt = activeStudents.filter((s: any) => s.class_id === c.id).length;
                      const total = Math.max(...classes.map((cc: any) => activeStudents.filter((s: any) => s.class_id === cc.id).length), 1);
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-24 truncate flex-shrink-0">{c.name}</span>
                          <div className="flex-1">
                            <CSSBar pct={total > 0 ? (cnt / total) * 100 : 0} color="bg-indigo-500" />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-6 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Students Report ──────────────────────────────────────── */}
          {activeTab === "students_report" && (
            <div className="space-y-4">
              {/* Filters */}
              <Card className="border-0 shadow-sm p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Search name or ID..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Select value={filterClass || "all"} onValueChange={v => setFilterClass(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All classes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All classes</SelectItem>
                      {classes.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterGender || "all"} onValueChange={v => setFilterGender(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All genders" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterSection || "all"} onValueChange={v => setFilterSection(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All sections" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {["active", "inactive", "all"].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize
                        ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 ml-2">{filteredStudents.length} results</span>
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportStudentsPDF}>
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Summary strips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total", value: filteredStudents.length, color: "bg-blue-100 text-blue-700" },
                  { label: "Male", value: filteredStudents.filter((s: any) => s.gender === "Male").length, color: "bg-indigo-100 text-indigo-700" },
                  { label: "Female", value: filteredStudents.filter((s: any) => s.gender === "Female").length, color: "bg-pink-100 text-pink-700" },
                  { label: "Boarding", value: filteredStudents.filter((s: any) => s.section === "boarding").length, color: "bg-purple-100 text-purple-700" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["#", "Name", "ID", "Class", "Gender", "Section", "Status"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.slice(0, 100).map((s: any, idx: number) => {
                        const cls = classes.find((c: any) => c.id === s.class_id);
                        return (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2.5">
                              <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{s.student_number}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{cls?.name ?? "—"}</td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-xs ${s.gender === "Male" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                                {s.gender ?? "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              {s.section ? (
                                <Badge className={`text-xs ${s.section === "boarding" ? "bg-purple-50 text-purple-700" : "bg-green-50 text-green-700"}`}>
                                  {s.section === "boarding" ? "Boarding" : "Day"}
                                </Badge>
                              ) : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-xs ${s.is_active !== false ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                {s.is_active !== false ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredStudents.length > 100 && (
                    <p className="text-center text-xs text-gray-400 py-3">
                      Showing 100 of {filteredStudents.length} — use PDF export for full list
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Transaction Report ───────────────────────────────────── */}
          {activeTab === "transaction_report" && (
            <div className="space-y-4">
              <DateRangeBar />

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Collected", value: ugx(totalPay), color: "bg-emerald-100 text-emerald-700" },
                  { label: "Transactions", value: payments.length, color: "bg-blue-100 text-blue-700" },
                  { label: "Unique Students", value: new Set((payments as any[]).map(p => p.student_id)).size, color: "bg-indigo-100 text-indigo-700" },
                  { label: "Reversed", value: adjustments.length, color: "bg-red-100 text-red-700" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Payment Transactions</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportTransactionPDF}>
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadPay ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No payments in this period</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Receipt #", "Student", "Amount", "Method", "Date", "Status"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(payments as any[]).map((p: any) => (
                          <tr key={p.id} className={`hover:bg-gray-50 ${p.is_reversed ? "opacity-60" : ""}`}>
                            <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{p.receipt_number ?? "—"}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                              {p.first_name} {p.last_name}
                            </td>
                            <td className="px-4 py-2.5 text-sm font-bold text-gray-900">{ugx(p.amount)}</td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-xs ${p.payment_method === "cash" ? "bg-green-50 text-green-700" : p.payment_method === "mobile_money" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                                {METHOD_LABELS[p.payment_method] ?? (p.payment_method ?? "Cash")}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {p.is_reversed ? (
                                <Badge className="text-xs bg-red-50 text-red-600">Reversed</Badge>
                              ) : (
                                <Badge className="text-xs bg-emerald-50 text-emerald-700">Valid</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Channel Summary ──────────────────────────────────────── */}
          {activeTab === "channel_summary" && (
            <div className="space-y-4">
              <DateRangeBar />

              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Channel Totals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {byChannel.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">No data</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-xs font-semibold text-gray-500">Channel</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500">Transactions</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500">Total (UGX)</th>
                            <th className="text-right py-2 text-xs font-semibold text-gray-500">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {byChannel.map(([method, amount]) => {
                            const count = (payments as any[]).filter(p => (p.payment_method || "cash") === method).length;
                            const pct = totalPay > 0 ? (amount / totalPay) * 100 : 0;
                            const color = METHOD_COLORS[method] ?? "bg-gray-400";
                            return (
                              <tr key={method} className="hover:bg-gray-50">
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                                    <span className="font-medium text-gray-700">
                                      {METHOD_LABELS[method] ?? method.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 text-right text-gray-600">{count}</td>
                                <td className="py-2.5 text-right font-bold text-gray-900">
                                  {Number(amount).toLocaleString()}
                                </td>
                                <td className="py-2.5 text-right">
                                  <Badge className="text-xs bg-gray-50 text-gray-600">{pct.toFixed(1)}%</Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td className="py-2.5 font-bold text-gray-800">Total</td>
                            <td className="py-2.5 text-right font-bold">{payments.length}</td>
                            <td className="py-2.5 text-right font-bold text-gray-900">{ugx(totalPay)}</td>
                            <td className="py-2.5 text-right font-bold">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </CardContent>
                </Card>

                {/* Provider breakdown (MTN vs Airtel) */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Mobile Money Providers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const mmPays = (payments as any[]).filter(p => p.payment_method === "mobile_money");
                      const byProv: Record<string, number> = {};
                      mmPays.forEach(p => {
                        const prov = p.provider || "unknown";
                        byProv[prov] = (byProv[prov] || 0) + Number(p.amount);
                      });
                      const provTotal = Object.values(byProv).reduce((a, b) => a + b, 0);
                      const entries = Object.entries(byProv).sort((a, b) => b[1] - a[1]);
                      if (!entries.length) return <p className="text-center text-gray-400 py-8 text-sm">No mobile money transactions</p>;
                      return (
                        <div className="space-y-3">
                          {entries.map(([prov, amt]) => (
                            <div key={prov} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium capitalize text-gray-700">
                                  {prov === "mtn" ? "MTN Mobile Money" : prov === "airtel" ? "Airtel Money" : prov}
                                </span>
                                <span className="font-bold text-gray-900">{ugx(amt)}</span>
                              </div>
                              <CSSBar
                                pct={provTotal > 0 ? (amt / provTotal) * 100 : 0}
                                color={prov === "mtn" ? "bg-yellow-500" : "bg-red-500"}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Tab: Timetable ───────────────────────────────────────────── */}
          {activeTab === "timetable" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={ttClass || "all"} onValueChange={v => setTtClass(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm w-48">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canEditTimetable && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                    onClick={() => { setAddSlotOpen(true); }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Slot
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={exportTimetablePDF}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>

              {/* Timetable grid */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0 overflow-x-auto">
                  {loadTT ? (
                    <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
                  ) : (
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 w-16">Period</th>
                          {DAYS.map(d => (
                            <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-gray-500">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {PERIODS.map(p => (
                          <tr key={p} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-xs font-bold text-gray-500">P{p}</td>
                            {DAYS.map(d => {
                              const slot = ttGrid[d]?.[p];
                              return (
                                <td key={d} className="px-2 py-2 text-center min-w-[100px]">
                                  {slot ? (
                                    <div className="relative group">
                                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 text-center">
                                        <p className="text-xs font-bold text-blue-800">{slot.subject_name ?? "—"}</p>
                                        {slot.teacher_name && (
                                          <p className="text-[9px] text-blue-500 truncate">{slot.teacher_name}</p>
                                        )}
                                        {slot.room && (
                                          <p className="text-[9px] text-gray-400">{slot.room}</p>
                                        )}
                                      </div>
                                      {canEditTimetable && (
                                        <button
                                          onClick={() => deleteSlotMut.mutate(slot.id)}
                                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-10 border border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-[10px] text-gray-300">free</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {timetableData.length === 0 && !loadTT && canEditTimetable && (
                <div className="text-center text-gray-400 text-sm py-2">
                  No timetable entries yet. Click "Add Slot" to build the timetable.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Detailed Fees Report ─────────────────────────────────── */}
          {activeTab === "detailed_fees" && (
            <div className="space-y-4">
              <DateRangeBar />
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Fees Collected by Student</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportFeesPDF}>
                      <Download className="w-3 h-3" /> PDF
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {(() => {
                    const payByStudent: Record<string, {
                      name: string; studentNumber: string; class: string;
                      total: number; count: number; methods: Record<string, number>;
                    }> = {};
                    (payments as any[]).filter(p => !p.is_reversed).forEach((p: any) => {
                      if (!payByStudent[p.student_id]) {
                        payByStudent[p.student_id] = {
                          name: p.student_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
                          studentNumber: p.student_code ?? p.payment_code ?? "—",
                          class: p.class_name ?? "—",
                          total: 0, count: 0, methods: {},
                        };
                      }
                      payByStudent[p.student_id].total += Number(p.amount);
                      payByStudent[p.student_id].count += 1;
                      const m = p.payment_method || "cash";
                      payByStudent[p.student_id].methods[m] = (payByStudent[p.student_id].methods[m] || 0) + Number(p.amount);
                    });
                    const rows = Object.values(payByStudent).sort((a, b) => b.total - a.total);
                    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
                    if (!rows.length) return <div className="text-center py-10 text-gray-400 text-sm">No data for this period</div>;
                    return (
                      <>
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                              {["Student", "ID", "Class", "Payments", "Methods", "Total Paid"].map(h => (
                                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rows.map((r, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{r.name}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{r.studentNumber}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-600">{r.class}</td>
                                <td className="px-4 py-2.5 text-center text-sm text-gray-700">{r.count}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.keys(r.methods).map(m => (
                                      <Badge key={m} className="text-xs bg-gray-50 text-gray-600">
                                        {METHOD_LABELS[m] ?? m}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-sm font-bold text-emerald-700">{ugx(r.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td colSpan={5} className="px-4 py-2.5 text-sm font-bold text-gray-700">Grand Total</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-emerald-700">{ugx(grandTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                        {/* Fee structures summary */}
                        {feeStructures.length > 0 && (
                          <div className="p-4 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Fee Structures on Record</p>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {feeStructures.map((f: any) => (
                                <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-gray-700">{f.name}</p>
                                  <p className="text-sm font-bold text-gray-900 mt-0.5">{ugx(f.amount)}</p>
                                  <p className="text-xs text-gray-400">{f.term} · Due {f.due_date}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Balance Adjustments ──────────────────────────────────── */}
          {activeTab === "balance_adjustments" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{adjustments.length}</p>
                  <p className="text-xs text-red-500 font-medium mt-0.5">Reversed Payments</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-700">{feeAdjustments.length}</p>
                  <p className="text-xs text-amber-500 font-medium mt-0.5">Fee Adjustments</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">
                    {ugx(feeAdjustments.reduce((s: number, a: any) => s + Number(a.amount), 0))}
                  </p>
                  <p className="text-xs text-blue-500 font-medium mt-0.5">Total Discounts</p>
                </div>
              </div>

              {/* Reversed Payments */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-700">Reversed Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {adjustments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No reversed payments</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Receipt #", "Student", "Amount", "Method", "Reversal Reason", "Date"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {adjustments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-red-50/30">
                            <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{p.receipt_number ?? "—"}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</td>
                            <td className="px-4 py-2.5 text-sm font-bold text-red-600 line-through">{ugx(p.amount)}</td>
                            <td className="px-4 py-2.5">
                              <Badge className="text-xs bg-red-50 text-red-700">
                                {METHOD_LABELS[p.payment_method] ?? (p.payment_method ?? "—")}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                              {p.reversal_reason ?? <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Fee Adjustments (discounts, waivers, advance) */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-700">Fee Adjustments (Discounts / Waivers / Advances)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {feeAdjustments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No fee adjustments recorded</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {["Student", "Type", "Fee", "Amount", "Reason", "Applied By", "Date"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {feeAdjustments.map((a: any) => (
                          <tr key={a.id} className="hover:bg-amber-50/20">
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{a.student_name}</td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-xs capitalize ${
                                a.adjustment_type === "discount" ? "bg-amber-50 text-amber-700" :
                                a.adjustment_type === "waiver" ? "bg-purple-50 text-purple-700" :
                                a.adjustment_type === "bursary" ? "bg-blue-50 text-blue-700" :
                                "bg-green-50 text-green-700"
                              }`}>{a.adjustment_type}</Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{a.fee_name ?? "—"}</td>
                            <td className="px-4 py-2.5 text-sm font-bold text-amber-700">{ugx(a.amount)}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[180px] truncate">{a.reason ?? "—"}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{a.applied_by_name ?? "—"}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">
                              {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Add Timetable Slot Dialog ────────────────────────────────────────── */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Timetable Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Class *</Label>
                <Select value={ttClass || "none"} onValueChange={v => setTtClass(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select class...</SelectItem>
                    {classes.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Day *</Label>
                <Select value={slotForm.dayOfWeek} onValueChange={v => setSlotForm(f => ({ ...f, dayOfWeek: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Period *</Label>
                <Select value={slotForm.periodNumber} onValueChange={v => setSlotForm(f => ({ ...f, periodNumber: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(p => <SelectItem key={p} value={String(p)}>P{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input type="time" value={slotForm.startTime} onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input type="time" value={slotForm.endTime} onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={slotForm.subjectId || "none"} onValueChange={v => setSlotForm(f => ({ ...f, subjectId: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select subject..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Free period</SelectItem>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Teacher</Label>
                <Select value={slotForm.teacherId || "none"} onValueChange={v => setSlotForm(f => ({ ...f, teacherId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select teacher..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teachers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Room</Label>
                <Input
                  placeholder="e.g. Room 12"
                  value={slotForm.room}
                  onChange={e => setSlotForm(f => ({ ...f, room: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddSlotOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!ttClass || addSlotMut.isPending}
              onClick={() => addSlotMut.mutate({
                schoolId,
                classId: ttClass,
                subjectId: slotForm.subjectId || null,
                teacherId: slotForm.teacherId || null,
                dayOfWeek: slotForm.dayOfWeek,
                periodNumber: parseInt(slotForm.periodNumber),
                startTime: slotForm.startTime || null,
                endTime: slotForm.endTime || null,
                room: slotForm.room || null,
              })}
            >
              {addSlotMut.isPending ? "Adding..." : "Add Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
