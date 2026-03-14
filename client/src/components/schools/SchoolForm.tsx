import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const schoolFormSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  abbreviation: z.string().min(2, 'Min 2 chars').max(5, 'Max 5 chars'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

interface SchoolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SchoolForm = ({ onSuccess, onCancel }: SchoolFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: { name: '', abbreviation: '', email: '', phone: '', address: '' },
  });

  const createSchoolMutation = useMutation({
    mutationFn: (data: SchoolFormData) => fetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, abbreviation: data.abbreviation.toUpperCase() }),
    }).then(r => { if (!r.ok) throw new Error('Failed to create school'); return r.json(); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schools'] });
      toast({ title: 'School Created', description: 'School has been created successfully.' });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create school' });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => createSchoolMutation.mutate(data))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">School Name *</Label>
          <Input id="name" {...form.register('name')} placeholder="e.g., Greenhill Academy" />
          {form.formState.errors.name && <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="abbreviation">Abbreviation *</Label>
          <Input id="abbreviation" {...form.register('abbreviation')} placeholder="e.g., GHA" className="uppercase" onChange={e => form.setValue('abbreviation', e.target.value.toUpperCase())} />
          {form.formState.errors.abbreviation && <p className="text-sm text-red-600">{form.formState.errors.abbreviation.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...form.register('email')} placeholder="school@example.com" />
          {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" {...form.register('phone')} placeholder="+256 700 000 000" />
          {form.formState.errors.phone && <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea id="address" {...form.register('address')} placeholder="School physical address" rows={3} />
        {form.formState.errors.address && <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>}
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" disabled={createSchoolMutation.isPending} className="flex-1">
          {createSchoolMutation.isPending ? 'Creating...' : 'Create School'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
};
