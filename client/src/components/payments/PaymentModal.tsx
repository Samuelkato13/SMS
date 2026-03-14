import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { validatePaymentCode } from '@/utils/paymentCode';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { X, Smartphone, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const paymentFormSchema = z.object({
  paymentCode: z.string().min(1, 'Payment code is required'),
  phoneNumber: z.string().regex(/^\+256\d{9}$/, 'Enter a valid number (+256XXXXXXXXX)'),
  amount: z.number().min(1000, 'Minimum UGX 1,000'),
  provider: z.enum(['mtn', 'airtel'], { required_error: 'Select a payment provider' }),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentModal = ({ open, onOpenChange }: PaymentModalProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<'mtn' | 'airtel' | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { paymentCode: '', phoneNumber: '+256', amount: 0, provider: undefined },
  });

  const paymentCode = form.watch('paymentCode');

  const { data: studentData } = useQuery<any[]>({
    queryKey: ['/api/students', profile?.schoolId],
    queryFn: () => fetch(`/api/students?schoolId=${profile?.schoolId}`).then(r => r.json()),
    enabled: !!profile?.schoolId,
  });

  const foundStudent = studentData?.find(s => s.payment_code?.toUpperCase() === paymentCode?.toUpperCase());

  const processPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!foundStudent) throw new Error('Student not found with the provided payment code');
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: foundStudent.id,
          schoolId: foundStudent.school_id,
          paymentCode: data.paymentCode,
          amount: data.amount,
          paymentMethod: 'mobile_money',
          provider: data.provider,
          phoneNumber: data.phoneNumber,
          recordedBy: profile?.id,
        }),
      });
      if (!res.ok) throw new Error('Payment processing failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({ title: 'Payment Successful', description: 'Fee payment has been processed.' });
      form.reset();
      setSelectedProvider(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Payment Failed', description: error.message || 'Failed to process payment' });
    },
  });

  const handleProviderSelect = (provider: 'mtn' | 'airtel') => {
    setSelectedProvider(provider);
    form.setValue('provider', provider);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Mobile Money Payment
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((data) => processPaymentMutation.mutate(data))} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="paymentCode">Student Payment Code *</Label>
            <Input id="paymentCode" {...form.register('paymentCode')} placeholder="GH-2025-00123" className="font-mono" />
            {form.formState.errors.paymentCode && <p className="text-xs text-red-600">{form.formState.errors.paymentCode.message}</p>}
            {foundStudent && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">{foundStudent.first_name} {foundStudent.last_name}</p>
                  <p className="text-xs text-green-600">{foundStudent.class_name} • Student found</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Provider *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleProviderSelect('mtn')} className={cn(
                "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors",
                selectedProvider === 'mtn' ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300"
              )}>
                <div className="w-8 h-8 bg-orange-500 rounded-lg mb-2" />
                <span className="text-sm font-medium">MTN MoMo</span>
              </button>
              <button type="button" onClick={() => handleProviderSelect('airtel')} className={cn(
                "flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-colors",
                selectedProvider === 'airtel' ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-300"
              )}>
                <div className="w-8 h-8 bg-red-500 rounded-lg mb-2" />
                <span className="text-sm font-medium">Airtel Money</span>
              </button>
            </div>
            {form.formState.errors.provider && <p className="text-xs text-red-600">{form.formState.errors.provider.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input id="phoneNumber" {...form.register('phoneNumber')} placeholder="+256 700 000 000" />
            {form.formState.errors.phoneNumber && <p className="text-xs text-red-600">{form.formState.errors.phoneNumber.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX) *</Label>
            <Input id="amount" type="number" {...form.register('amount', { valueAsNumber: true })} placeholder="350000" />
            {form.formState.errors.amount && <p className="text-xs text-red-600">{form.formState.errors.amount.message}</p>}
          </div>

          <Button type="submit" disabled={processPaymentMutation.isPending || !foundStudent} className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
            {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400">You will receive an SMS prompt to authorize the payment</p>
      </DialogContent>
    </Dialog>
  );
};
