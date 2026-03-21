import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Users, CreditCard, GraduationCap, Phone, Trash2 } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth: string;
  gender: string;
  class_id: string;
  class_name?: string;
  class_level?: string;
  school_id: string;
  payment_code: string;
  guardian_name: string;
  guardian_phone: string;
  address: string;
  section?: string;
  is_active: boolean;
}

interface NewStudentForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  email: string;
  section: string;
}

export const StudentList = () => {
  const { profile } = useAuth();
  const { canCreate, canDelete } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState<NewStudentForm>({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
    classId: '', guardianName: '', guardianPhone: '', address: '', email: '', section: 'day'
  });

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const addStudentMutation = useMutation({
    mutationFn: (data: any) => fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, schoolId: profile?.schoolId }),
    }).then(r => {
      if (!r.ok) throw new Error('Failed to add student');
      return r.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students', profile?.schoolId] });
      toast({ title: "Student Added!", description: "New student has been registered successfully." });
      setShowAddDialog(false);
      setNewStudent({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', classId: '', guardianName: '', guardianPhone: '', address: '', email: '', section: 'day' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: "Error", description: "Failed to add student. Please try again." });
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/students/${id}`, { method: 'DELETE' }).then(r => {
      if (!r.ok) throw new Error('Failed to delete student');
      return r.json();
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students', profile?.schoolId] });
      toast({ title: 'Student removed', description: 'The student record has been deleted.' });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete student.' });
    },
  });

  const handleAddStudent = () => {
    if (!newStudent.firstName || !newStudent.lastName || !newStudent.classId || !newStudent.guardianName || !newStudent.guardianPhone || !newStudent.dateOfBirth || !newStudent.address) {
      toast({ variant: 'destructive', title: "Validation Error", description: "Please fill all required fields." });
      return;
    }
    addStudentMutation.mutate({
      firstName: newStudent.firstName,
      lastName: newStudent.lastName,
      email: newStudent.email,
      dateOfBirth: newStudent.dateOfBirth,
      gender: newStudent.gender,
      classId: newStudent.classId,
      guardianName: newStudent.guardianName,
      guardianPhone: newStudent.guardianPhone,
      address: newStudent.address,
      section: newStudent.section,
    });
  };

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.payment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.guardian_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-gray-500">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500">{filtered.length} of {students.length} students</p>
        </div>
        {canCreate('students') && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Register New Student</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                  <Label>First Name *</Label>
                  <Input value={newStudent.firstName} onChange={e => setNewStudent(p => ({...p, firstName: e.target.value}))} placeholder="First name" />
                </div>
                <div className="space-y-1">
                  <Label>Last Name *</Label>
                  <Input value={newStudent.lastName} onChange={e => setNewStudent(p => ({...p, lastName: e.target.value}))} placeholder="Last name" />
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth *</Label>
                  <Input type="date" value={newStudent.dateOfBirth} onChange={e => setNewStudent(p => ({...p, dateOfBirth: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <Label>Gender *</Label>
                  <Select value={newStudent.gender} onValueChange={v => setNewStudent(p => ({...p, gender: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Class *</Label>
                  <Select value={newStudent.classId} onValueChange={v => setNewStudent(p => ({...p, classId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Email (Optional)</Label>
                  <Input type="email" value={newStudent.email} onChange={e => setNewStudent(p => ({...p, email: e.target.value}))} placeholder="student@email.com" />
                </div>
                <div className="space-y-1">
                  <Label>Guardian Name *</Label>
                  <Input value={newStudent.guardianName} onChange={e => setNewStudent(p => ({...p, guardianName: e.target.value}))} placeholder="Parent/Guardian name" />
                </div>
                <div className="space-y-1">
                  <Label>Guardian Phone *</Label>
                  <Input value={newStudent.guardianPhone} onChange={e => setNewStudent(p => ({...p, guardianPhone: e.target.value}))} placeholder="+256 700 000 000" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Address *</Label>
                  <Input value={newStudent.address} onChange={e => setNewStudent(p => ({...p, address: e.target.value}))} placeholder="Student's home address" />
                </div>
                <div className="space-y-1">
                  <Label>Section *</Label>
                  <Select value={newStudent.section} onValueChange={v => setNewStudent(p => ({...p, section: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="boarding">Boarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddStudent} disabled={addStudentMutation.isPending} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  {addStudentMutation.isPending ? 'Adding...' : 'Register Student'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, payment code, or guardian..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Student Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium text-gray-500">No students found</h3>
          <p className="text-sm mt-1">{searchTerm ? 'Try a different search' : 'Add students to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow border border-gray-100">
              <CardContent className="p-5">
                <div className="flex items-start space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${
                    student.gender === 'female' ? 'bg-gradient-to-br from-pink-400 to-rose-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                  }`}>
                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{student.first_name} {student.last_name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{student.class_name || 'No class'}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{student.payment_code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate text-xs">{student.guardian_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-xs">{student.guardian_phone}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={student.is_active ? 'default' : 'secondary'} className="text-xs">
                      {student.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {student.section && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        student.section === 'boarding'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {student.section === 'boarding' ? 'Boarding' : 'Day'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {student.gender}
                    </Badge>
                    {canDelete('students') && (
                      <button
                        onClick={() => setDeleteTarget(student)}
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Delete student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>?
              This will remove all their records including marks, attendance, and payment history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteStudentMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteStudentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
