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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, DollarSign, Tag } from "lucide-react";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const YEARS = ["2024", "2025", "2026"];
const CATEGORIES = [
  { value: "tuition", label: "Tuition" }, { value: "transport", label: "Transport" },
  { value: "boarding", label: "Boarding" }, { value: "uniform", label: "Uniform" },
  { value: "exam", label: "Exam" }, { value: "development", label: "Development" },
  { value: "swimming", label: "Swimming" }, { value: "library", label: "Library" },
  { value: "lunch", label: "Lunch" }, { value: "other", label: "Other" },
];
const CATEGORY_COLORS: Record<string, string> = {
  tuition: "bg-blue-100 text-blue-800", transport: "bg-orange-100 text-orange-800",
  boarding: "bg-purple-100 text-purple-800", uniform: "bg-pink-100 text-pink-800",
  exam: "bg-red-100 text-red-800", development: "bg-indigo-100 text-indigo-800",
  swimming: "bg-cyan-100 text-cyan-800", library: "bg-yellow-100 text-yellow-800",
  lunch: "bg-lime-100 text-lime-800", other: "bg-gray-100 text-gray-700",
};

export default function FeeManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState<any>(null);

  const emptyForm = { name: "", description: "", amount: "", dueDate: "", classId: "", academicYear: "2025", term: "Term 1", isOptional: false, category: "tuition" };
  const [form, setForm] = useState(emptyForm);

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["/api/fees", schoolId],
    queryFn: () => fetch(`/api/fees?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes", schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => fetch("/api/fees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, schoolId })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fees"] });
      setShowForm(false); setForm(emptyForm);
      toast({ title: "Fee structure created" });
    },
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/fees/${editItem.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fees"] });
      setShowForm(false); setEditItem(null); setForm(emptyForm);
      toast({ title: "Fee structure updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/fees/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fees"] });
      setShowDelete(null);
      toast({ title: "Fee structure deleted" });
    },
  });

  const openEdit = (f: any) => {
    setEditItem(f);
    setForm({
      name: f.name, description: f.description ?? "",
      amount: String(f.amount), dueDate: f.due_date?.split("T")[0] ?? "",
      classId: f.class_id ?? "", academicYear: f.academic_year, term: f.term ?? "Term 1",
      isOptional: f.is_optional ?? false, category: f.category ?? "tuition"
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount || !form.dueDate)
      return toast({ variant: "destructive", title: "Fill required fields (Name, Amount, Due Date)" });
    const data = {
      name: form.name, description: form.description, amount: Number(form.amount),
      dueDate: form.dueDate, classId: form.classId || null,
      academicYear: form.academicYear, term: form.term, isOptional: form.isOptional,
      category: form.category,
    };
    editItem ? updateMut.mutate(data) : createMut.mutate(data);
  };

  // Group by term
  const grouped = (fees as any[]).reduce((acc: any, f: any) => {
    const key = `${f.term} ${f.academic_year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const totalByTerm = (list: any[]) => list.reduce((s: number, f: any) => s + Number(f.amount), 0);

  return (
    <BursarLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
            <p className="text-gray-500 text-sm mt-0.5">{(fees as any[]).length} fee structures configured</p>
          </div>
          <Button onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus size={16} /> Add Fee Structure
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="text-center py-14 text-gray-500">
            <FileText size={44} className="mx-auto mb-3 opacity-20" />
            <p>No fee structures yet. Click "Add Fee Structure" to start.</p>
          </Card>
        ) : (
          Object.entries(grouped).map(([term, items]: [string, any]) => (
            <Card key={term}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar size={16} className="text-teal-600" /> {term}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{items.length} fees</span>
                    <Badge className="bg-teal-100 text-teal-800 font-semibold">
                      UGX {totalByTerm(items).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Fee Name","Category","Amount (UGX)","Due Date","Class","Optional","Actions"].map(h => (
                          <th key={h} className="text-left p-3 font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((f: any) => (
                        <tr key={f.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            {f.name}
                            {f.description && <p className="text-xs text-gray-400 truncate max-w-[150px]">{f.description}</p>}
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs ${CATEGORY_COLORS[f.category ?? "other"] ?? "bg-gray-100 text-gray-700"}`}>
                              <Tag size={10} className="mr-1" />{CATEGORIES.find(c => c.value === f.category)?.label ?? f.category ?? "Other"}
                            </Badge>
                          </td>
                          <td className="p-3 font-semibold text-emerald-700">
                            <span className="flex items-center gap-1"><DollarSign size={13} />{Number(f.amount).toLocaleString()}</span>
                          </td>
                          <td className="p-3 text-gray-600">{f.due_date ? new Date(f.due_date).toLocaleDateString() : "—"}</td>
                          <td className="p-3 text-gray-500">{f.class_name ?? "All Classes"}</td>
                          <td className="p-3">
                            {f.is_optional
                              ? <Badge className="bg-amber-100 text-amber-700 text-xs">Optional</Badge>
                              : <Badge className="bg-red-100 text-red-700 text-xs">Compulsory</Badge>}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(f)}>
                                <Pencil size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700" onClick={() => setShowDelete(f)}>
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditItem(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fee Name *</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. School Fees Term 1" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium mr-2 ${CATEGORY_COLORS[c.value]}`}>{c.label}</span>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (UGX) *</Label>
                <Input type="number" className="mt-1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Due Date *</Label>
                <Input type="date" className="mt-1" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic Year</Label>
                <Select value={form.academicYear} onValueChange={v => setForm(f => ({ ...f, academicYear: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={form.term} onValueChange={v => setForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Apply to Class (leave blank for all classes)</Label>
              <Select value={form.classId} onValueChange={v => setForm(f => ({ ...f, classId: v === "__all" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Classes</SelectItem>
                  {(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="optional" checked={form.isOptional} onCheckedChange={v => setForm(f => ({ ...f, isOptional: v }))} />
              <Label htmlFor="optional">Optional fee (student can opt out)</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}>
                {editItem ? "Update Fee" : "Create Fee"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete Fee Structure</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete <strong>{showDelete?.name}</strong>? This cannot be undone and may affect existing payments.</p>
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
