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
  gender: z.enum(['male', 'female'], { required_error: 'Please select gender' }),
  classId: z.string().min(1, 'Please select a class'),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
  address: z.string().min(1, 'Address is required'),
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

  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => fetch(`/api/classes?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', dateOfBirth: '',
      gender: undefined, classId: '', guardianName: '', guardianPhone: '', address: '',
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: (data: StudentFormData) => fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, schoolId: profile?.schoolId }),
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
          <Select onValueChange={v => form.setValue('gender', v as 'male' | 'female')}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.gender && <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Class *</Label>
          <Select onValueChange={v => form.setValue('classId', v)}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name} — Level {cls.level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.classId && <p className="text-sm text-red-600">{form.formState.errors.classId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guardianName">Guardian Name *</Label>
          <Input id="guardianName" {...form.register('guardianName')} placeholder="Parent/Guardian name" />
          {form.formState.errors.guardianName && <p className="text-sm text-red-600">{form.formState.errors.guardianName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardianPhone">Guardian Phone *</Label>
          <Input id="guardianPhone" {...form.register('guardianPhone')} placeholder="+256 700 000 000" />
          {form.formState.errors.guardianPhone && <p className="text-sm text-red-600">{form.formState.errors.guardianPhone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea id="address" {...form.register('address')} placeholder="Student home address" />
        {form.formState.errors.address && <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>}
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
