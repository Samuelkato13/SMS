import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { CTLayout } from '@/components/classteacher/CTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Users, User, Clock, CheckCheck, Plus, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TEMPLATES = [
  { label: 'Parent Meeting', text: 'Dear Parent/Guardian of {name}, you are kindly invited to a parent-teacher meeting on [DATE] at [TIME] at the school. Please confirm attendance. Thank you.' },
  { label: 'Exam Reminder', text: 'Dear Parent/Guardian of {name}, please be reminded that end-of-term examinations begin on [DATE]. Ensure your child attends school punctually with all required materials.' },
  { label: 'Performance Concern', text: 'Dear Parent/Guardian of {name}, we wish to bring to your attention that your child\'s academic performance requires attention. Please schedule a meeting with the class teacher at your earliest convenience.' },
  { label: 'Fee Reminder', text: 'Dear Parent/Guardian of {name}, this is a reminder that school fees are due. Please visit the school bursar to settle any outstanding balance.' },
  { label: 'Absence Notice', text: 'Dear Parent/Guardian of {name}, we note that your child was absent from school on [DATE]. Please provide a valid reason. Regular attendance is important for academic success.' },
  { label: 'General Info', text: 'Dear Parent/Guardian of {name}, we wish to inform you that [MESSAGE]. For any queries, please contact the school office.' },
];

export default function ParentCommunication() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ type: 'individual', studentId: '', subject: '', message: '' });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const myClass = classes.find((c: any) => c.class_teacher_id === profile?.id);

  const { data: allStudents = [] } = useQuery<any[]>({
    queryKey: ['/api/students', schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const students = allStudents.filter((s: any) => s.class_id === myClass?.id);

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/parent-communications', schoolId, myClass?.id],
    queryFn: () => fetch(`/api/parent-communications?schoolId=${schoolId}&classId=${myClass?.id}`).then(r => r.json()),
    enabled: !!schoolId && !!myClass?.id,
  });

  const sendMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/parent-communications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parent-communications', schoolId, myClass?.id] });
      toast({ title: form.type === 'broadcast' ? `Message sent to all ${students.length} parents` : 'Message sent to parent' });
      setShowCompose(false);
      setForm({ type: 'individual', studentId: '', subject: '', message: '' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const useTemplate = (template: typeof TEMPLATES[0]) => {
    const selectedStudent = students.find((s: any) => s.id === form.studentId);
    const name = selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : '[Student Name]';
    setForm(f => ({ ...f, message: template.text.replace(/{name}/g, name), subject: template.label }));
  };

  const handleSend = () => {
    if (!form.message.trim()) return toast({ variant: 'destructive', title: 'Message cannot be empty' });
    if (form.type === 'individual' && !form.studentId) return toast({ variant: 'destructive', title: 'Please select a student' });
    sendMut.mutate({
      schoolId, classId: myClass?.id,
      studentId: form.type === 'individual' ? form.studentId : null,
      type: form.type, subject: form.subject, message: form.message,
      sentBy: profile?.id,
    });
  };

  const broadcastCount = messages.filter((m: any) => m.type === 'broadcast').length;
  const individualCount = messages.filter((m: any) => m.type === 'individual').length;

  return (
    <CTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Parent Communication</h1>
            <p className="text-sm text-gray-500">{myClass?.name} · {students.length} families</p>
          </div>
          <Button onClick={() => setShowCompose(true)} className="bg-orange-600 hover:bg-orange-700 gap-2">
            <Plus className="w-4 h-4" />Compose Message
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{messages.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Messages</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{broadcastCount}</p>
            <p className="text-xs text-gray-500 mt-1">Broadcasts</p>
          </Card>
          <Card className="border-0 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{individualCount}</p>
            <p className="text-xs text-gray-500 mt-1">Individual</p>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Message History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No messages sent yet</p>
                <p className="text-xs text-gray-400 mt-1">Compose a message to communicate with parents</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...messages].sort((a:any,b:any)=>new Date(b.sent_at).getTime()-new Date(a.sent_at).getTime()).map((msg: any) => {
                  const student = students.find((s: any) => s.id === msg.student_id);
                  return (
                    <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type==='broadcast'?'bg-purple-100':'bg-blue-100'}`}>
                          {msg.type === 'broadcast' ? <Users className="w-4 h-4 text-purple-600" /> : <User className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{msg.subject || 'No Subject'}</p>
                            <Badge className={`text-[10px] ${msg.type==='broadcast'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>
                              {msg.type === 'broadcast' ? 'All Parents' : student ? `${student.first_name} ${student.last_name}` : 'Individual'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{msg.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-3 h-3" />{new Date(msg.sent_at).toLocaleString('en-UG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCheck className="w-3 h-3" />Sent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Compose Parent Message</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({...f, type:'individual', studentId:''}))}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${form.type==='individual'?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-600 hover:border-blue-300'}`}
              >
                <User className="w-3.5 h-3.5 inline mr-1" />Individual Parent
              </button>
              <button
                onClick={() => setForm(f => ({...f, type:'broadcast', studentId:''}))}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${form.type==='broadcast'?'bg-purple-600 text-white border-purple-600':'border-gray-200 text-gray-600 hover:border-purple-300'}`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />Broadcast to All
              </button>
            </div>

            {form.type === 'individual' && (
              <div>
                <Label>Select Student *</Label>
                <Select value={form.studentId || 'none'} onValueChange={v => setForm(f=>({...f,studentId:v==='none'?'':v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose student..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose student...</SelectItem>
                    {students.map((s:any) => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.guardian_name} ({s.guardian_phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type === 'broadcast' && (
              <div className="bg-purple-50 rounded-lg p-3 text-xs text-purple-700">
                This message will be logged for all <strong>{students.length}</strong> families in {myClass?.name}.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Message Template</Label>
                <span className="text-[10px] text-gray-400">optional quick start</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => useTemplate(t)}
                    className="text-[10px] px-2 py-1 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors flex items-center gap-1">
                    <FileText className="w-2.5 h-2.5" />{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div><Label>Subject</Label><Input className="mt-1" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="e.g. Parent Meeting Reminder" /></div>
            <div>
              <Label>Message *</Label>
              <textarea
                value={form.message}
                onChange={e=>setForm(f=>({...f,message:e.target.value}))}
                placeholder="Type your message here..."
                rows={5}
                className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-gray-400 mt-0.5 text-right">{form.message.length} characters</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
              <Button
                className={`gap-2 ${form.type==='broadcast'?'bg-purple-600 hover:bg-purple-700':'bg-orange-600 hover:bg-orange-700'}`}
                disabled={sendMut.isPending || !form.message.trim()}
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />{sendMut.isPending ? 'Sending...' : form.type==='broadcast'?`Send to All (${students.length})`:'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CTLayout>
  );
}
