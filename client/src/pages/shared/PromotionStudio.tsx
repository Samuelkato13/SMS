import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowRight, CheckSquare, Square, Users, History, GraduationCap, Search, TrendingUp, CalendarDays, ChevronRight } from "lucide-react";

export default function PromotionStudio() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: allStudents = [], isLoading: loadingStudents } = useQuery<any[]>({
    queryKey: ["/api/students", schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: promotionLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/promotions", schoolId],
    queryFn: () => fetch(`/api/promotions?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const classStudents = allStudents
    .filter(s => s.class_id === fromClassId && s.is_active !== false)
    .filter(s =>
      !search ||
      `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const allSelected = classStudents.length > 0 && classStudents.every(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(classStudents.map(s => s.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const promoteMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/promotions", data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions", schoolId] });
      toast({ title: `${res.moved} student(s) promoted successfully` });
      setSelectedIds(new Set());
      setFromClassId("");
      setToClassId("");
      setNotes("");
      setConfirmOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Promotion failed", description: e.message }),
  });

  const handlePromote = () => {
    if (!toClassId || selectedIds.size === 0) return;
    promoteMut.mutate({
      schoolId,
      fromClassId: fromClassId || null,
      toClassId,
      studentIds: Array.from(selectedIds),
      notes,
      promotedBy: profile?.id,
      promotedByName: `${profile?.firstName} ${profile?.lastName}`,
      academicYear: String(new Date().getFullYear()),
    });
  };

  const fromClass = classes.find(c => c.id === fromClassId);
  const toClass = classes.find(c => c.id === toClassId);

  const COLOR_STRIPE: Record<string, string> = {
    director: "from-blue-600 to-indigo-600",
    head_teacher: "from-emerald-600 to-teal-600",
  };
  const stripe = COLOR_STRIPE[profile?.role ?? ""] ?? "from-slate-600 to-slate-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${stripe} text-white px-6 py-5 shadow-lg`}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <TrendingUp className="w-7 h-7" />
          <div>
            <h1 className="text-2xl font-bold">Promotion Studio</h1>
            <p className="text-white/70 text-sm">Move students to the next class or any class in the school</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Main Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Source + Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Step 1 — Select Source Class & Students
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Source Class (students to promote from)</Label>
                  <Select value={fromClassId} onValueChange={v => { setFromClassId(v); setSelectedIds(new Set()); setSearch(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose source class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.sort((a, b) => a.name.localeCompare(b.name)).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fromClassId && (
                  <>
                    {/* Search bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search students..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>

                    {/* Select all bar */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <button
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={toggleAll}
                      >
                        {allSelected ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                        {allSelected ? "Deselect All" : "Select All"} ({classStudents.length})
                      </button>
                      {selectedIds.size > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">{selectedIds.size} selected</Badge>
                      )}
                    </div>

                    {/* Student list */}
                    {loadingStudents ? (
                      <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
                    ) : classStudents.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No students found in this class</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 rounded-lg border border-gray-100 overflow-hidden max-h-80 overflow-y-auto">
                        {classStudents.map((s: any) => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-blue-50/60 ${
                              selectedIds.has(s.id) ? "bg-blue-50" : "bg-white"
                            }`}
                          >
                            <Checkbox
                              checked={selectedIds.has(s.id)}
                              onCheckedChange={() => toggleOne(s.id)}
                            />
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0 uppercase">
                              {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-gray-400">{s.student_number}</p>
                            </div>
                            {s.section && (
                              <Badge className={`text-xs ${s.section === "boarding" ? "bg-purple-50 text-purple-700" : "bg-green-50 text-green-700"}`}>
                                {s.section === "boarding" ? "Boarding" : "Day"}
                              </Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Target + Summary */}
          <div className="space-y-4">
            <Card className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                  Step 2 — Select Target Class
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Move selected students to</Label>
                  <Select value={toClassId} onValueChange={setToClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose target class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter(c => c.id !== fromClassId)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.section ? `(${c.section})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary card */}
                {selectedIds.size > 0 && toClassId && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-500 font-semibold uppercase mb-2">Promotion Summary</p>
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="font-semibold text-gray-700">{fromClass?.name || "Any class"}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-blue-700">{toClass?.name}</span>
                    </div>
                    <p className="text-2xl font-black text-blue-800 mt-2">{selectedIds.size}</p>
                    <p className="text-xs text-gray-500">student(s) will be promoted</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="e.g. End of year 2025 promotion..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={selectedIds.size === 0 || !toClassId || promoteMut.isPending}
                  onClick={() => setConfirmOpen(true)}
                >
                  <ArrowRight className="w-4 h-4" />
                  Promote {selectedIds.size > 0 ? `${selectedIds.size} Student(s)` : "Students"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Promotion History */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400" />
              Recent Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {promotionLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No promotion history yet</p>
            ) : (
              <div className="space-y-2">
                {promotionLogs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{log.from_class_name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-blue-700">{log.to_class_name}</span>
                        <Badge className="bg-blue-50 text-blue-600 text-xs">{log.student_count} students</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CalendarDays className="w-3 h-3 text-gray-300" />
                        <span className="text-xs text-gray-400">
                          {new Date(log.promoted_at).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}
                          {log.promoted_by_name ? ` · by ${log.promoted_by_name}` : ""}
                        </span>
                      </div>
                      {log.notes && <p className="text-xs text-gray-500 mt-0.5 italic">"{log.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to move <strong>{selectedIds.size}</strong> student(s) from{" "}
              <strong>{fromClass?.name || "current class"}</strong> to{" "}
              <strong>{toClass?.name}</strong>. This will update their class assignment immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handlePromote}
              disabled={promoteMut.isPending}
            >
              {promoteMut.isPending ? "Promoting..." : "Yes, Promote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
