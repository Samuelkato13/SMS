import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { firestoreService } from '@/lib/firestore';
import { storageService } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { InsertSchool } from '@/types';
import { Upload } from 'lucide-react';

const schoolFormSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  abbreviation: z.string().min(2, 'Abbreviation must be at least 2 characters').max(5, 'Abbreviation must be at most 5 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

interface SchoolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SchoolForm = ({ onSuccess, onCancel }: SchoolFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: '',
      abbreviation: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  const createSchoolMutation = useMutation({
    mutationFn: async (data: SchoolFormData) => {
      // First create the school
      const schoolId = await firestoreService.createSchool(data);
      
      // If logo file is provided, upload it
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await storageService.uploadSchoolLogo(schoolId, logoFile);
        // Update school with logo URL
        await firestoreService.update('schools', schoolId, { logoUrl });
      }

      return schoolId;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'School has been created successfully',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create school',
      });
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    setLoading(true);
    try {
      await createSchoolMutation.mutateAsync(data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select an image file',
        });
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
        });
        return;
      }
      
      setLogoFile(file);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">School Name *</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Enter school name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="abbreviation">Abbreviation *</Label>
          <Input
            id="abbreviation"
            {...form.register('abbreviation')}
            placeholder="e.g., GHS"
            className="uppercase"
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              form.setValue('abbreviation', value);
            }}
          />
          {form.formState.errors.abbreviation && (
            <p className="text-sm text-red-600">{form.formState.errors.abbreviation.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="school@example.com"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            {...form.register('phone')}
            placeholder="+256 XXX XXX XXX"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          {...form.register('address')}
          placeholder="Enter school address"
          rows={3}
        />
        {form.formState.errors.address && (
          <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">School Logo</Label>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
            />
          </div>
          {logoFile && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Upload className="w-4 h-4" />
              <span>{logoFile.name}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">Upload a logo image (max 5MB, PNG/JPG preferred)</p>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Creating School...' : 'Create School'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
};
