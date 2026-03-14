import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Users, Pencil } from 'lucide-react';

export default function Classes() {
  const { profile } = useAuth();
  const { canCreate, canUpdate } = useRole();
  const { toast } = useToast();
  const schoolId = profile?.schoolId;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', stream: '', capacity: '40' });

  const { data: classes = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/classes', schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${schoolId}`).then(r => r.json()),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/classes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', schoolId] });
      toast({ title: 'Class created successfully' });
      setOpen(false);
      setForm({ name: '', grade: '', stream: '', capacity: '40' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate({ ...form, schoolId, capacity: parseInt(form.capacity) });
  };

  return (
    <RoleGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-500 text-sm mt-1">Manage school classes and streams</p>
          </div>
          {canCreate('classes') && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div>
                    <Label>Class Name *</Label>
                    <Input placeholder="e.g. Primary 4, S3 West" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Grade / Level</Label>
                      <Input placeholder="e.g. P4, S3" value={form.grade}
                        onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Stream</Label>
                      <Input placeholder="e.g. East, West, A" value={form.stream}
                        onChange={e => setForm(f => ({ ...f, stream: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input type="number" value={form.capacity}
                      onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating...' : 'Create Class'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="h-28 bg-gray-100 rounded mt-4" /></Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No classes yet</h3>
              <p className="text-gray-500 text-sm mt-1">Create your first class to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls: any) => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{cls.name}</CardTitle>
                      {cls.grade && (
                        <p className="text-sm text-gray-500 mt-0.5">{cls.grade}{cls.stream ? ` · ${cls.stream}` : ''}</p>
                      )}
                    </div>
                    {canUpdate('classes') && (
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-blue-600 -mt-1">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      {cls.student_count || 0} students
                    </span>
                    {cls.capacity && (
                      <Badge variant="secondary" className="text-xs">
                        Cap: {cls.capacity}
                      </Badge>
                    )}
                  </div>
                  {cls.class_teacher_name && (
                    <p className="text-xs text-gray-500 mt-2">
                      Class Teacher: <span className="font-medium">{cls.class_teacher_name}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
