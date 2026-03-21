'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PasswordStrength } from '@/components/auth/password-strength';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: 'Account', description: 'Your login credentials' },
  { title: 'Company', description: 'Your company details' },
  { title: 'Address', description: 'Company address' },
  { title: 'Payment', description: 'Payment preference' },
] as const;

type FieldName =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'name'
  | 'phone'
  | 'companyName'
  | 'registrationNumber'
  | 'vatNumber'
  | 'industry'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'province'
  | 'postalCode'
  | 'country'
  | 'paymentType';

const STEP_FIELDS: Record<number, FieldName[]> = {
  0: ['email', 'password', 'confirmPassword', 'name'],
  1: ['companyName'],
  2: ['addressLine1', 'city', 'province', 'postalCode'],
  3: ['paymentType'],
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
      companyName: '',
      registrationNumber: '',
      vatNumber: '',
      industry: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'ZA',
      paymentType: 'COD' as const,
    },
  });

  const password = watch('password') ?? '';
  const paymentType = watch('paymentType');

  async function nextStep() {
    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(data: Record<string, unknown>) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast({
          title: 'Registration failed',
          description: body?.message ?? 'An error occurred during registration.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Account created',
        description: 'Please check your email to verify your account.',
        variant: 'success',
      });
      router.push('/login');
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Step {step + 1} of {STEPS.length}: {STEPS[step].description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-blue-600' : 'bg-gray-200',
              )}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Account */}
          <div className={cn(step !== 0 && 'hidden')}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  disabled={isLoading}
                  {...register('name')}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="name@company.co.za"
                  disabled={isLoading}
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register('password')}
                />
                <PasswordStrength password={password} />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 12 345 6789"
                  disabled={isLoading}
                  {...register('phone')}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Company */}
          <div className={cn(step !== 1 && 'hidden')}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  placeholder="Acme (Pty) Ltd"
                  disabled={isLoading}
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-600">{errors.companyName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Registration number (optional)</Label>
                <Input
                  id="registrationNumber"
                  placeholder="2024/123456/07"
                  disabled={isLoading}
                  {...register('registrationNumber')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT number (optional)</Label>
                <Input
                  id="vatNumber"
                  placeholder="4123456789"
                  disabled={isLoading}
                  {...register('vatNumber')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry (optional)</Label>
                <Input
                  id="industry"
                  placeholder="Mining, Agriculture, etc."
                  disabled={isLoading}
                  {...register('industry')}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Address */}
          <div className={cn(step !== 2 && 'hidden')}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address line 1</Label>
                <Input
                  id="addressLine1"
                  placeholder="123 Main Street"
                  disabled={isLoading}
                  {...register('addressLine1')}
                />
                {errors.addressLine1 && (
                  <p className="text-sm text-red-600">{errors.addressLine1.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
                <Input
                  id="addressLine2"
                  placeholder="Suite 100"
                  disabled={isLoading}
                  {...register('addressLine2')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Johannesburg"
                    disabled={isLoading}
                    {...register('city')}
                  />
                  {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input
                    id="province"
                    placeholder="Gauteng"
                    disabled={isLoading}
                    {...register('province')}
                  />
                  {errors.province && (
                    <p className="text-sm text-red-600">{errors.province.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input
                    id="postalCode"
                    placeholder="2000"
                    disabled={isLoading}
                    {...register('postalCode')}
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-red-600">{errors.postalCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" disabled={isLoading} {...register('country')} />
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Payment */}
          <div className={cn(step !== 3 && 'hidden')}>
            <div className="space-y-4">
              <Label>Payment type</Label>
              <RadioGroup
                value={paymentType}
                onValueChange={(value) => setValue('paymentType', value as 'COD' | 'CREDIT')}
              >
                <div className="flex items-start space-x-3 rounded-md border border-gray-200 dark:border-gray-800 p-4">
                  <RadioGroupItem value="COD" id="cod" className="mt-0.5" />
                  <div>
                    <Label htmlFor="cod" className="cursor-pointer font-medium">
                      Cash on Delivery (COD)
                    </Label>
                    <p className="text-sm text-gray-500">
                      Pay for each test request before processing begins.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 rounded-md border border-gray-200 dark:border-gray-800 p-4">
                  <RadioGroupItem value="CREDIT" id="credit" className="mt-0.5" />
                  <div>
                    <Label htmlFor="credit" className="cursor-pointer font-medium">
                      Credit Account
                    </Label>
                    <p className="text-sm text-gray-500">
                      Apply for a credit account. Subject to approval. 30-day terms.
                    </p>
                  </div>
                </div>
              </RadioGroup>
              {errors.paymentType && (
                <p className="text-sm text-red-600">{errors.paymentType.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep} disabled={isLoading} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
