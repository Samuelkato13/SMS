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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Users, Plus, Trash2, UserPlus, UserMinus, Search, Tag,
  DollarSign, Layers, ChevronRight, FileText, X
} from "lucide-react";

const GROUP_COLORS = [
  { value: "blue",   label: "Blue",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "green",  label: "Green",  cls: "bg-green-100 text-green-700 border-green-200" },
  { value: "purple", label: "Purple", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "orange", label: "Orange", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "red",    label: "Red",    cls: "bg-red-100 text-red-700 border-red-200" },
  { value: "teal",   label: "Teal",   cls: "bg-teal-100 text-teal-700 border-teal-200" },
];
function colorCls(c: string) {
  return GROUP_COLORS.find(g => g.value === c)?.cls ?? GROUP_COLORS[0].cls;
}

export default function GroupingStudio() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const isBursar = profile?.role === "bursar";

  // Groups list
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", color: "blue" });

  // Add members
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState({ classId: "", section: "" });
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  // Fee assignment
  const [feeAssignOpen, setFeeAssignOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useQuery<any[]>({
    queryKey: ["/api/student-groups", schoolId],
    queryFn: () => fetch(`/api/student-groups?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/student-groups", activeGroupId, "members"],
    queryFn: () => fetch(`/api/student-groups/${activeGroupId}/members`).then(r => r.json()),
    enabled: !!activeGroupId,
  });

  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ["/api/students", schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/classes", schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const { data: feeStructures = [] } = useQuery<any[]>({
    queryKey: ["/api/fee-structures", schoolId],
    queryFn: () => fetch(`/api/fee-structures?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId && isBursar,
  });

  const activeGroup = groups.find(g => g.id === activeGroupId);

  // Mutations
  const createGroupMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/student-groups", d),
    onSuccess: (g: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", schoolId] });
      toast({ title: `Group "${g.name}" created` });
      setCreateOpen(false);
      setGroupForm({ name: "", description: "", color: "blue" });
      setActiveGroupId(g.id);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateGroupMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/student-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", schoolId] });
      toast({ title: "Group updated" });
      setEditingGroup(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/student-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", schoolId] });
      toast({ title: "Group deleted" });
      if (activeGroupId === deleteConfirmId) setActiveGroupId(null);
      setDeleteConfirmId(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const addMembersMut = useMutation({
    mutationFn: ({ groupId, studentIds }: any) =>
      apiRequest("POST", `/api/student-groups/${groupId}/members`, { studentIds }),
    onSuccess: (r: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", activeGroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", schoolId] });
      toast({ title: `${r.added} student(s) added to group` });
      setAddMembersOpen(false);
      setSelectedToAdd(new Set());
      setMemberSearch("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const removeMemberMut = useMutation({
    mutationFn: ({ groupId, studentId }: any) =>
      apiRequest("DELETE", `/api/student-groups/${groupId}/members/${studentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", activeGroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-groups", schoolId] });
      toast({ title: "Student removed from group" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const assignFeeMut = useMutation({
    mutationFn: ({ groupId, feeStructureId }: any) =>
      apiRequest("POST", `/api/student-groups/${groupId}/assign-fee`, {
        feeStructureId, schoolId, recordedBy: profile?.id
      }),
    onSuccess: (r: any) => {
      toast({ title: `Fee assigned to ${r.assigned} student(s) (${r.total - r.assigned} already had pending)` });
      setFeeAssignOpen(false);
      setSelectedFeeId("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  // Students available to add (not already in group)
  const memberIds = new Set(members.map((m: any) => m.id));
  const availableStudents = allStudents
    .filter(s => !memberIds.has(s.id) && s.is_active !== false)
    .filter(s => !memberFilter.classId || s.class_id === memberFilter.classId)
    .filter(s => !memberFilter.section || s.section === memberFilter.section)
    .filter(s =>
      !memberSearch ||
      `${s.first_name} ${s.last_name} ${s.student_number}`.toLowerCase().includes(memberSearch.toLowerCase())
    )
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const toggleAdd = (id: string) => {
    setSelectedToAdd(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const openCreate = () => {
    setGroupForm({ name: "", description: "", color: "blue" });
    setEditingGroup(null);
    setCreateOpen(true);
  };

  const openEdit = (g: any) => {
    setGroupForm({ name: g.name, description: g.description || "", color: g.color || "blue" });
    setEditingGroup(g);
    setCreateOpen(true);
  };

  const handleSaveGroup = () => {
    if (!groupForm.name.trim()) return;
    if (editingGroup) {
      updateGroupMut.mutate({ id: editingGroup.id, data: groupForm });
    } else {
      createGroupMut.mutate({
        ...groupForm,
        schoolId,
        createdBy: profile?.id,
        createdByName: `${profile?.firstName} ${profile?.lastName}`,
      });
    }
  };

  const STRIPE: Record<string, string> = {
    director: "from-blue-600 to-indigo-600",
    head_teacher: "from-emerald-600 to-teal-600",
    bursar: "from-teal-600 to-cyan-600",
  };
  const stripe = STRIPE[profile?.role ?? ""] ?? "from-slate-600 to-slate-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${stripe} text-white px-6 py-5 shadow-lg`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-7 h-7" />
            <div>
              <h1 className="text-2xl font-bold">Grouping Studio</h1>
              <p className="text-white/70 text-sm">
                Create student groups for bulk actions like fee assignment, reporting, and more
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 gap-2"
          >
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Groups list */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Groups ({groups.length})
            </p>
            {loadingGroups ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No groups yet</p>
                <Button variant="ghost" size="sm" className="mt-2 text-blue-500" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-1" /> Create first group
                </Button>
              </div>
            ) : (
              groups.map((g: any) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroupId(g.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    activeGroupId === g.id
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        g.color === "blue" ? "bg-blue-500" :
                        g.color === "green" ? "bg-green-500" :
                        g.color === "purple" ? "bg-purple-500" :
                        g.color === "orange" ? "bg-orange-500" :
                        g.color === "red" ? "bg-red-500" : "bg-teal-500"
                      }`} />
                      <span className="text-sm font-semibold text-gray-800 truncate">{g.name}</span>
                    </div>
                    <Badge className="bg-gray-100 text-gray-600 text-xs flex-shrink-0">
                      {g.member_count}
                    </Badge>
                  </div>
                  {g.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate pl-5">{g.description}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Right: Group detail */}
          <div className="lg:col-span-2">
            {!activeGroupId ? (
              <div className="h-full flex items-center justify-center text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                <div>
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Select a group to manage its members</p>
                  <p className="text-xs mt-1">or create a new one</p>
                </div>
              </div>
            ) : (
              <Card className="shadow-sm border-0">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${colorCls(activeGroup?.color)}`}>
                        <Tag className="w-3 h-3 inline mr-1" />
                        {activeGroup?.name}
                      </div>
                      <Badge className="bg-gray-100 text-gray-600">
                        {members.length} student{members.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {isBursar && members.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50 text-xs"
                          onClick={() => setFeeAssignOpen(true)}
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Assign Fee
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                        onClick={() => { setAddMembersOpen(true); setSelectedToAdd(new Set()); }}
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add Students
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        onClick={() => openEdit(activeGroup)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-600 text-xs"
                        onClick={() => setDeleteConfirmId(activeGroup?.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {activeGroup?.description && (
                    <p className="text-xs text-gray-400 mt-2">{activeGroup.description}</p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {members.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No students in this group</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-blue-500"
                        onClick={() => { setAddMembersOpen(true); setSelectedToAdd(new Set()); }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Add students
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {members.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0 uppercase">
                            {m.first_name?.charAt(0)}{m.last_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{m.first_name} {m.last_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-400">{m.student_number}</p>
                              {m.class_name && (
                                <Badge className="text-xs bg-blue-50 text-blue-700">{m.class_name}</Badge>
                              )}
                              {m.section && (
                                <Badge className={`text-xs ${m.section === "boarding" ? "bg-purple-50 text-purple-700" : "bg-green-50 text-green-700"}`}>
                                  {m.section === "boarding" ? "Boarding" : "Day"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Remove from group"
                            onClick={() => removeMemberMut.mutate({ groupId: activeGroupId, studentId: m.id })}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Group Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); setEditingGroup(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g. Boarding Students, P7 Candidates, Fee Defaulters..."
                value={groupForm.name}
                onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What is this group for?"
                value={groupForm.description}
                onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setGroupForm(f => ({ ...f, color: c.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${c.cls}
                      ${groupForm.color === c.value ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingGroup(null); }}>Cancel</Button>
            <Button
              onClick={handleSaveGroup}
              disabled={(createGroupMut.isPending || updateGroupMut.isPending) || !groupForm.name.trim()}
            >
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Members Dialog ──────────────────────────────────────────────── */}
      <Dialog open={addMembersOpen} onOpenChange={open => { if (!open) setAddMembersOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Add Students to "{activeGroup?.name}"
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={memberFilter.classId || "all"} onValueChange={v => setMemberFilter(f => ({ ...f, classId: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.sort((a: any, b: any) => a.name.localeCompare(b.name)).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={memberFilter.section || "all"} onValueChange={v => setMemberFilter(f => ({ ...f, section: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                className="pl-9 h-8 text-xs"
                placeholder="Search by name or ID..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>

            {selectedToAdd.size > 0 && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-blue-700 font-medium">{selectedToAdd.size} selected</span>
                <button onClick={() => setSelectedToAdd(new Set())} className="text-xs text-blue-500 hover:text-blue-700">Clear</button>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
              {availableStudents.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No students available to add</p>
              ) : (
                availableStudents.map((s: any) => (
                  <label key={s.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50/60 transition-colors ${selectedToAdd.has(s.id) ? "bg-blue-50" : "bg-white"}`}>
                    <Checkbox checked={selectedToAdd.has(s.id)} onCheckedChange={() => toggleAdd(s.id)} />
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0 uppercase">
                      {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-gray-400">{s.student_number}</p>
                        {s.class_name && <Badge className="text-xs bg-blue-50 text-blue-700">{s.class_name}</Badge>}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddMembersOpen(false); setSelectedToAdd(new Set()); }}>Cancel</Button>
            <Button
              disabled={selectedToAdd.size === 0 || addMembersMut.isPending}
              onClick={() => addMembersMut.mutate({ groupId: activeGroupId, studentIds: Array.from(selectedToAdd) })}
            >
              Add {selectedToAdd.size > 0 ? `${selectedToAdd.size} ` : ""}Student{selectedToAdd.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Fee Dialog (Bursar only) ───────────────────────────────── */}
      <Dialog open={feeAssignOpen} onOpenChange={setFeeAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-teal-500" />
              Assign Fee to Group
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-500">
              This will create pending payment records for all <strong>{members.length}</strong> students
              in "{activeGroup?.name}".
            </p>
            <div className="space-y-1.5">
              <Label>Fee Structure *</Label>
              <Select value={selectedFeeId || "none"} onValueChange={v => setSelectedFeeId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select fee..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select fee...</SelectItem>
                  {feeStructures.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} — UGX {Number(f.amount).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFeeAssignOpen(false); setSelectedFeeId(""); }}>Cancel</Button>
            <Button
              disabled={!selectedFeeId || assignFeeMut.isPending}
              onClick={() => assignFeeMut.mutate({ groupId: activeGroupId, feeStructureId: selectedFeeId })}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {assignFeeMut.isPending ? "Assigning..." : "Assign Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and remove all its members. Student records are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteGroupMut.mutate(deleteConfirmId!)}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
