import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const studentFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Gender is required' }) }),
  section: z.enum(['day', 'boarding'], { errorMap: () => ({ message: 'Boarding/day selection is required' }) }),
  schoolSection: z.enum(['nursery', 'primary', 'secondary', 'nursery_primary', 'primary_secondary', 'all'], { errorMap: () => ({ message: 'School section is required' }) }),
  address: z.string().min(1, 'Address is required'),
  classId: z.string().min(1, 'Please select a class'),
  streamId: z.string().optional(),
  parentName: z.string().min(1, 'Parent/Guardian name is required'),
  parentPhone: z.string().min(1, 'Parent/Guardian phone is required'),
  parentEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const StudentForm = ({ onSuccess, onCancel }: StudentFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const { data: streams = [] } = useQuery<any[]>({
    queryKey: ['/api/streams', selectedClassId],
    queryFn: () => fetch(`/api/streams?classId=${selectedClassId}`).then(r => r.json()),
    enabled: !!selectedClassId,
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', dateOfBirth: '', gender: 'male', section: 'day', schoolSection: 'primary', address: '',
      classId: '', streamId: '', parentName: '', parentPhone: '', parentEmail: '',
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (data: StudentFormData) => fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        streamId: data.streamId || undefined,
        schoolId: profile?.schoolId,
      }),
    }).then(r => { if (!r.ok) throw new Error('Failed to add student'); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({ title: 'Student Added', description: 'Student has been registered successfully.' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to add student' });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => createStudentMutation.mutate(data))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" {...form.register('firstName')} placeholder="First name" />
          {form.formState.errors.firstName && <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" {...form.register('lastName')} placeholder="Last name" />
          {form.formState.errors.lastName && <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Student Email (Optional)</Label>
          <Input id="email" type="email" {...form.register('email')} placeholder="student@email.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} />
          {form.formState.errors.dateOfBirth && <p className="text-sm text-red-600">{form.formState.errors.dateOfBirth.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={form.watch('gender')} onValueChange={v => form.setValue('gender', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.gender && <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Boarding/Day *</Label>
          <Select value={form.watch('section')} onValueChange={v => form.setValue('section', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="boarding">Boarding</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.section && <p className="text-sm text-red-600">{form.formState.errors.section.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>School Section *</Label>
          <Select value={form.watch('schoolSection')} onValueChange={v => form.setValue('schoolSection', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nursery">Nursery</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="nursery_primary">Nursery & Primary</SelectItem>
              <SelectItem value="primary_secondary">Primary & Secondary</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.schoolSection && <p className="text-sm text-red-600">{form.formState.errors.schoolSection.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Address *</Label>
          <Input id="address" {...form.register('address')} placeholder="Student home address" />
          {form.formState.errors.address && <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <div className="space-y-2">
          <Label>Class *</Label>
          <Select value={form.watch('classId')} onValueChange={v => { form.setValue('classId', v); setSelectedClassId(v); form.setValue('streamId', ''); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name} — Level {cls.level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.classId && <p className="text-sm text-red-600">{form.formState.errors.classId.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Stream (Optional)</Label>
          <Select value={form.watch('streamId') || ''} onValueChange={v => form.setValue('streamId', v)}>
            <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {streams.map((stream: any) => (
                <SelectItem key={stream.id} value={stream.id}>{stream.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parentName">Parent / Guardian Name *</Label>
          <Input id="parentName" {...form.register('parentName')} placeholder="Parent/Guardian name" />
          {form.formState.errors.parentName && <p className="text-sm text-red-600">{form.formState.errors.parentName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="parentPhone">Parent / Guardian Phone *</Label>
          <Input id="parentPhone" {...form.register('parentPhone')} placeholder="+256 700 000 000" />
          {form.formState.errors.parentPhone && <p className="text-sm text-red-600">{form.formState.errors.parentPhone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentEmail">Parent / Guardian Email (Optional)</Label>
        <Input id="parentEmail" type="email" {...form.register('parentEmail')} placeholder="parent@email.com" />
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={createStudentMutation.isPending} className="flex-1">
          {createStudentMutation.isPending ? 'Adding...' : 'Add Student'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
};
