import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { firestoreService } from '@/lib/firestore';
import { validatePaymentCode } from '@/utils/paymentCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { X, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

const paymentFormSchema = z.object({
  paymentCode: z.string().min(1, 'Payment code is required').refine(validatePaymentCode, {
    message: 'Invalid payment code format',
  }),
  phoneNumber: z.string().regex(/^\+256\d{9}$/, 'Please enter a valid Ugandan phone number (+256XXXXXXXXX)'),
  amount: z.number().min(1000, 'Minimum amount is UGX 1,000'),
  provider: z.enum(['mtn', 'airtel'], {
    required_error: 'Please select a payment provider',
  }),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentModal = ({ open, onOpenChange }: PaymentModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'mtn' | 'airtel' | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentCode: '',
      phoneNumber: '+256',
      amount: 0,
      provider: undefined,
    },
  });

  const { data: student } = useQuery({
    queryKey: ['/api/student/payment-code', form.watch('paymentCode')],
    queryFn: () => firestoreService.getStudentByPaymentCode(form.watch('paymentCode')),
    enabled: !!form.watch('paymentCode') && validatePaymentCode(form.watch('paymentCode')),
  });

  const processPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!student) {
        throw new Error('Student not found with the provided payment code');
      }

      // Mock mobile money payment processing
      // In a real implementation, this would call MTN/Airtel APIs
      const paymentRecord = {
        studentId: student.id,
        feeStructureId: 'default-fee', // This would be dynamic
        schoolId: student.schoolId,
        paymentCode: data.paymentCode,
        amount: data.amount,
        paymentMethod: 'mobile_money' as const,
        provider: data.provider,
        phoneNumber: data.phoneNumber,
        transactionRef: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
        status: 'completed' as const, // In real implementation, this would start as 'pending'
        paidAt: new Date(),
        recordedBy: 'system', // Would be current user ID
      };

      return firestoreService.create('payments', paymentRecord);
    },
    onSuccess: () => {
      toast({
        title: 'Payment Successful',
        description: 'The fee payment has been processed successfully',
      });
      form.reset();
      setSelectedProvider(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);
    try {
      await processPaymentMutation.mutateAsync(data);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (provider: 'mtn' | 'airtel') => {
    setSelectedProvider(provider);
    form.setValue('provider', provider);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span>Mobile Money Payment</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="paymentCode">Student Payment Code *</Label>
            <Input
              id="paymentCode"
              {...form.register('paymentCode')}
              placeholder="GH-2025-00123"
              className="font-mono"
            />
            {form.formState.errors.paymentCode && (
              <p className="text-sm text-red-600">{form.formState.errors.paymentCode.message}</p>
            )}
            {student && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-sm text-green-600">Student found ✓</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Provider *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleProviderSelect('mtn')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-colors",
                  selectedProvider === 'mtn'
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-orange-300"
                )}
              >
                <div className="w-8 h-8 bg-orange-500 rounded mb-2"></div>
                <span className="text-sm font-medium">MTN</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderSelect('airtel')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-colors",
                  selectedProvider === 'airtel'
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-red-300"
                )}
              >
                <div className="w-8 h-8 bg-red-500 rounded mb-2"></div>
                <span className="text-sm font-medium">Airtel</span>
              </button>
            </div>
            {form.formState.errors.provider && (
              <p className="text-sm text-red-600">{form.formState.errors.provider.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              {...form.register('phoneNumber')}
              placeholder="+256 7XX XXX XXX"
            />
            {form.formState.errors.phoneNumber && (
              <p className="text-sm text-red-600">{form.formState.errors.phoneNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX) *</Label>
            <Input
              id="amount"
              type="number"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="350000"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !student}
            className="w-full"
          >
            {loading ? 'Processing Payment...' : 'Process Payment'}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            You will receive an SMS prompt to authorize the payment
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
