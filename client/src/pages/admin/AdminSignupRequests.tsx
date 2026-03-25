import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2, XCircle, Phone, Clock, Building2,
  Users, Mail, MapPin, Copy, Eye, Filter
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  contacted: "bg-blue-100 text-blue-800",
};

const TYPE_COLORS: Record<string, string> = {
  trial: "bg-purple-100 text-purple-700",
  demo: "bg-indigo-100 text-indigo-700",
  getstarted: "bg-teal-100 text-teal-700",
};

export default function AdminSignupRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [showApprove, setShowApprove] = useState<any>(null);
  const [showReject, setShowReject] = useState<any>(null);
  const [showCreds, setShowCreds] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [approveForm, setApproveForm] = useState({ schoolEmail: "", schoolPhone: "", schoolAddress: "", schoolAbbr: "" });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["/api/admin/signup-requests", filter],
    queryFn: () => fetch(`/api/admin/signup-requests${filter !== "all" ? `?status=${filter}` : ""}`).then(r => r.json()),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status, adminNotes }: any) => fetch(`/api/admin/signup-requests/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes, reviewedBy: profile?.id })
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-requests"] });
      setShowReject(null); setNotes("");
      toast({ title: "Request updated" });
    },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/signup-requests/${id}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedBy: profile?.id, ...approveForm })
    }).then(r => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signup-requests"] });
      setShowApprove(null);
      setApproveForm({ schoolEmail: "", schoolPhone: "", schoolAddress: "", schoolAbbr: "" });
      if (data.success) setShowCreds(data);
      toast({ title: "School created!", description: data.message });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const filtered = (requests as any[]).filter((r: any) => filter === "all" || r.status === filter);
  const pending = (requests as any[]).filter((r: any) => r.status === "pending").length;
  const approved = (requests as any[]).filter((r: any) => r.status === "approved").length;
  const total = (requests as any[]).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">School Signup Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage trial and demo requests from prospective schools</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Requests", value: total, color: "bg-gray-100 text-gray-700" },
            { label: "Pending", value: pending, color: "bg-amber-100 text-amber-700" },
            { label: "Approved", value: approved, color: "bg-green-100 text-green-700" },
            { label: "Rejected", value: (requests as any[]).filter(r => r.status === "rejected").length, color: "bg-red-100 text-red-700" },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "contacted", "approved", "rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f === "all" ? `All (${total})` : f}
              {f === "pending" && pending > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{pending}</span>}
            </button>
          ))}
        </div>

        {/* Requests list */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-14">
            <Building2 size={40} className="mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">No {filter === "all" ? "" : filter} requests found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r: any) => (
              <Card key={r.id} className={`border-0 shadow-sm hover:shadow-md transition-shadow ${r.status === "pending" ? "border-l-4 border-l-amber-400" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-gray-900">{r.school_name}</h3>
                        <Badge className={`text-xs ${TYPE_COLORS[r.request_type] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.request_type === "getstarted" ? "Get Started" : r.request_type === "trial" ? "Free Trial" : "Demo"}
                        </Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.status}
                        </Badge>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5"><Users size={13} className="text-gray-400" />{r.contact_name}</div>
                        <div className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" />{r.email}</div>
                        {r.phone && <div className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" />{r.phone}</div>}
                        {r.district && <div className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{r.district}</div>}
                        {r.number_of_students && <div className="flex items-center gap-1.5"><Users size={13} className="text-gray-400" />{r.number_of_students} students</div>}
                        {r.school_type && <div className="flex items-center gap-1.5"><Building2 size={13} className="text-gray-400" />{r.school_type}</div>}
                      </div>
                      {r.message && <p className="text-sm text-gray-500 mt-2 italic">"{r.message}"</p>}
                      {r.admin_notes && <p className="text-xs text-gray-400 mt-1 bg-gray-50 rounded p-1.5">Note: {r.admin_notes}</p>}
                      {r.created_school_admin_email && r.status === "approved" && (
                        <div className="mt-2 p-2.5 bg-green-50 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-green-800">Credentials issued:</p>
                          {(r.resolved_username || r.created_school_admin_username) && (
                            <p className="text-green-700">Username: <strong>{r.resolved_username || r.created_school_admin_username}</strong></p>
                          )}
                          <p className="text-green-700">Password: {r.created_school_admin_password}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <Clock size={11} /> {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 sm:items-end min-w-[140px]">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 gap-1.5"
                            onClick={() => { setShowApprove(r); setApproveForm({ schoolEmail: r.email, schoolPhone: r.phone ?? "", schoolAddress: r.district ?? "Uganda", schoolAbbr: "" }); }}>
                            <CheckCircle2 size={13} /> Approve & Create
                          </Button>
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-blue-600 border-blue-300"
                            onClick={() => updateMut.mutate({ id: r.id, status: "contacted", adminNotes: notes })}>
                            <Phone size={13} /> Mark Contacted
                          </Button>
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-red-500 border-red-300"
                            onClick={() => { setShowReject(r); setNotes(""); }}>
                            <XCircle size={13} /> Reject
                          </Button>
                        </>
                      )}
                      {r.status === "contacted" && (
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 gap-1.5"
                          onClick={() => { setShowApprove(r); setApproveForm({ schoolEmail: r.email, schoolPhone: r.phone ?? "", schoolAddress: r.district ?? "Uganda", schoolAbbr: "" }); }}>
                          <CheckCircle2 size={13} /> Approve & Create
                        </Button>
                      )}
                      {r.status === "approved" && r.created_school_admin_password && (
                        <Button size="sm" variant="outline" className="w-full gap-1.5"
                          onClick={() => setShowCreds({ directorUsername: r.resolved_username || r.created_school_admin_username, directorEmail: r.created_school_admin_email, tempPassword: r.created_school_admin_password, school: { name: r.school_name } })}>
                          <Eye size={13} /> View Credentials
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={!!showApprove} onOpenChange={() => setShowApprove(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Approve & Create School Account</DialogTitle></DialogHeader>
          {showApprove && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
                Creating school account for <strong>{showApprove.school_name}</strong> with a <strong>30-day free trial</strong>.
                Login credentials will be generated automatically.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>School Abbreviation (5 chars max)</Label>
                  <Input className="mt-1" value={approveForm.schoolAbbr} placeholder="e.g. SMCK (auto-generated if blank)"
                    onChange={e => setApproveForm(f => ({ ...f, schoolAbbr: e.target.value.toUpperCase().slice(0,5) }))} />
                </div>
                <div>
                  <Label>School Email</Label>
                  <Input type="email" className="mt-1" value={approveForm.schoolEmail}
                    onChange={e => setApproveForm(f => ({ ...f, schoolEmail: e.target.value }))} />
                </div>
                <div>
                  <Label>School Phone</Label>
                  <Input className="mt-1" value={approveForm.schoolPhone}
                    onChange={e => setApproveForm(f => ({ ...f, schoolPhone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>School Address</Label>
                  <Input className="mt-1" value={approveForm.schoolAddress}
                    onChange={e => setApproveForm(f => ({ ...f, schoolAddress: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowApprove(null)}>Cancel</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(showApprove.id)}>
                  {approveMut.isPending ? "Creating..." : "Create School Account"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Reject Request</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Rejecting request from <strong>{showReject?.school_name}</strong>.</p>
          <div>
            <Label>Reason (optional — for your records)</Label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Outside service area..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowReject(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({ id: showReject?.id, status: "rejected", adminNotes: notes })}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={!!showCreds} onOpenChange={() => setShowCreds(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-green-700">School Account Created!</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these login details with the director of <strong>{showCreds?.school?.name}</strong>:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Login URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1">zaabupayapp.com/login</code>
                  <button onClick={() => copyToClipboard("zaabupayapp.com/login")}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
              {showCreds?.directorUsername && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Username</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm flex-1 text-indigo-700 font-bold">{showCreds.directorUsername}</code>
                    <button onClick={() => copyToClipboard(showCreds.directorUsername)}><Copy size={14} className="text-gray-500" /></button>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-blue-700">{showCreds?.directorEmail}</code>
                  <button onClick={() => copyToClipboard(showCreds?.directorEmail ?? "")}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm flex-1 text-green-700 font-bold">{showCreds?.tempPassword}</code>
                  <button onClick={() => copyToClipboard(showCreds?.tempPassword ?? "")}><Copy size={14} className="text-gray-500" /></button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
              The director logs in with their <strong>username</strong>. Remind them to change the password after first login. Trial expires in 30 days.
            </p>
            <Button className="w-full" onClick={() => setShowCreds(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
