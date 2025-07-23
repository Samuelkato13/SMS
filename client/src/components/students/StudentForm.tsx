import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { firestoreService } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { generatePaymentCode } from '@/utils/paymentCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { InsertStudent } from '@/types';

const studentFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female'], {
    required_error: 'Please select gender',
  }),
  classId: z.string().min(1, 'Please select a class'),
  guardianName: z.string().min(1, 'Guardian name is required'),
  guardianPhone: z.string().min(1, 'Guardian phone is required'),
  guardianEmail: z.string().email('Invalid email').optional().or(z.literal('')),
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
  const [loading, setLoading] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['/api/classes', profile?.schoolId],
    queryFn: () => firestoreService.getClassesBySchool(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const { data: school } = useQuery({
    queryKey: ['/api/school', profile?.schoolId],
    queryFn: () => firestoreService.getSchoolById(profile!.schoolId),
    enabled: !!profile?.schoolId,
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      gender: undefined,
      classId: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      address: '',
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      // Get current student count for payment code generation
      const existingStudents = await firestoreService.getStudentsBySchool(profile!.schoolId);
      const studentCounter = existingStudents.length + 1;
      
      const paymentCode = generatePaymentCode(
        school?.abbreviation || 'SCH',
        new Date().getFullYear(),
        studentCounter
      );

      const studentData: InsertStudent = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth),
        email: data.email || undefined,
        guardianEmail: data.guardianEmail || undefined,
        schoolId: profile!.schoolId,
      };

      return firestoreService.create<InsertStudent>('students', studentData);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Student has been added successfully',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add student',
      });
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      await createStudentMutation.mutateAsync(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...form.register('firstName')}
            placeholder="Enter first name"
          />
          {form.formState.errors.firstName && (
            <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            {...form.register('lastName')}
            placeholder="Enter last name"
          />
          {form.formState.errors.lastName && (
            <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Student Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="Enter student email (optional)"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...form.register('dateOfBirth')}
          />
          {form.formState.errors.dateOfBirth && (
            <p className="text-sm text-red-600">{form.formState.errors.dateOfBirth.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select onValueChange={(value) => form.setValue('gender', value as 'male' | 'female')}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.gender && (
            <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Class *</Label>
          <Select onValueChange={(value) => form.setValue('classId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classItem) => (
                <SelectItem key={classItem.id} value={classItem.id}>
                  {classItem.name} - Level {classItem.level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.classId && (
            <p className="text-sm text-red-600">{form.formState.errors.classId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guardianName">Guardian Name *</Label>
          <Input
            id="guardianName"
            {...form.register('guardianName')}
            placeholder="Enter guardian name"
          />
          {form.formState.errors.guardianName && (
            <p className="text-sm text-red-600">{form.formState.errors.guardianName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardianPhone">Guardian Phone *</Label>
          <Input
            id="guardianPhone"
            {...form.register('guardianPhone')}
            placeholder="Enter guardian phone"
          />
          {form.formState.errors.guardianPhone && (
            <p className="text-sm text-red-600">{form.formState.errors.guardianPhone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guardianEmail">Guardian Email</Label>
        <Input
          id="guardianEmail"
          type="email"
          {...form.register('guardianEmail')}
          placeholder="Enter guardian email (optional)"
        />
        {form.formState.errors.guardianEmail && (
          <p className="text-sm text-red-600">{form.formState.errors.guardianEmail.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          {...form.register('address')}
          placeholder="Enter student address"
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
        )}
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Adding Student...' : 'Add Student'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};
