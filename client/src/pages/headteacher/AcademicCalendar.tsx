import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { HTLayout } from '@/components/headteacher/HTLayout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Plus, BookOpen, Calendar, Flag, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EVENT_COLORS: Record<string, string> = {
  exam: 'bg-blue-100 text-blue-700 border-blue-200',
  holiday: 'bg-red-100 text-red-700 border-red-200',
  event: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  term: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function AcademicCalendar() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'event', date: '', endDate: '', description: '' });

  const { data: terms = [] } = useQuery<any[]>({
    queryKey: ['/api/terms', schoolId],
    queryFn: () => fetch(`/api/terms?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: exams = [] } = useQuery<any[]>({
    queryKey: ['/api/exams', schoolId],
    queryFn: () => fetch(`/api/exams?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/school-events', schoolId],
    queryFn: () => fetch(`/api/school-events?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const addEventMut = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/school-events', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/school-events', schoolId] });
      toast({ title: 'Event added to calendar' });
      setShowAdd(false);
      setForm({ title: '', type: 'event', date: '', endDate: '', description: '' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: 'Error', description: e.message }),
  });

  const allEvents = [
    ...terms.map((t: any) => ({ id: t.id, title: t.name, type: 'term', date: t.start_date, endDate: t.end_date })),
    ...exams.map((e: any) => ({ id: e.id, title: e.title, type: 'exam', date: e.exam_date, endDate: e.exam_date, status: e.status })),
    ...events.map((e: any) => ({ ...e, type: e.type || 'event' })),
  ].filter(e => e.date);

  const yearEvents = allEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === viewYear;
  });

  const grouped: Record<number, typeof allEvents> = {};
  yearEvents.forEach(ev => {
    const m = new Date(ev.date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(ev);
  });

  const upcomingExams = exams
    .filter((e: any) => new Date(e.exam_date) >= now)
    .sort((a: any, b: any) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
    .slice(0, 5);

  return (
    <HTLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Academic Calendar</h1>
            <p className="text-sm text-gray-500">Terms, exams, events and important dates</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" />Add Event
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setViewYear(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="font-bold text-gray-800 text-lg">{viewYear}</span>
              <Button variant="outline" size="sm" onClick={() => setViewYear(y => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              {MONTHS.map((month, idx) => {
                const monthEvents = grouped[idx] || [];
                return (
                  <Card key={idx} className={`border-0 shadow-sm ${monthEvents.length === 0 ? 'opacity-60' : ''}`}>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-700">{month} {viewYear}</CardTitle>
                      <span className="text-xs text-gray-400">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}</span>
                    </CardHeader>
                    {monthEvents.length > 0 && (
                      <CardContent className="px-4 pb-3 space-y-2">
                        {monthEvents.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map(ev => (
                          <div key={ev.id} className={`flex items-center gap-3 p-2 rounded-lg border text-xs ${EVENT_COLORS[ev.type] || EVENT_COLORS.event}`}>
                            {ev.type === 'exam' && <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />}
                            {ev.type === 'term' && <Calendar className="w-3.5 h-3.5 flex-shrink-0" />}
                            {ev.type === 'event' && <Flag className="w-3.5 h-3.5 flex-shrink-0" />}
                            {ev.type === 'holiday' && <Clock className="w-3.5 h-3.5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{ev.title}</p>
                              <p className="opacity-75">{new Date(ev.date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}{ev.endDate && ev.endDate !== ev.date ? ` – ${new Date(ev.endDate).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}` : ''}</p>
                            </div>
                            {(ev as any).status && <Badge className="text-[10px] bg-white/50">{(ev as any).status}</Badge>}
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Upcoming Exams</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {upcomingExams.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">No upcoming exams</p>
                ) : upcomingExams.map((exam: any) => (
                  <div key={exam.id} className="flex items-start gap-3 p-2.5 bg-blue-50 rounded-lg">
                    <div className="bg-blue-100 rounded-lg p-1.5 flex-shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{exam.title}</p>
                      <p className="text-[10px] text-gray-500">{new Date(exam.exam_date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <Badge className="text-[10px] mt-0.5 bg-blue-100 text-blue-700">{exam.exam_type?.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="py-3 px-4"><CardTitle className="text-sm font-semibold">Terms Overview</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {terms.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3">No terms configured</p>
                ) : terms.map((term: any) => {
                  const start = term.start_date ? new Date(term.start_date) : null;
                  const end = term.end_date ? new Date(term.end_date) : null;
                  const isCurrent = start && end && now >= start && now <= end;
                  return (
                    <div key={term.id} className={`p-3 rounded-lg border ${isCurrent ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-800">{term.name}</p>
                        {isCurrent && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">Current</Badge>}
                      </div>
                      {start && end && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          {start.toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-UG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Event Title *</Label>
              <Input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Sports Day, Parent Meeting" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">School Event</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
              </div>
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional description" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!form.title || !form.date || addEventMut.isPending}
                onClick={() => addEventMut.mutate({ ...form, schoolId })}
              >
                {addEventMut.isPending ? 'Adding...' : 'Add Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HTLayout>
  );
}
