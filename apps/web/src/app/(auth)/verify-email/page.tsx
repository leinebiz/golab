'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type VerificationState = 'loading' | 'success' | 'error' | 'missing-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>(token ? 'loading' : 'missing-token');

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const response = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        setState(response.ok ? 'success' : 'error');
      } catch {
        setState('error');
      }
    }

    verify();
  }, [token]);

  if (state === 'loading') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Verifying email</CardTitle>
          <CardDescription>Please wait while we verify your email address...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Email verified</CardTitle>
          <CardDescription>Your email has been verified. You can now sign in.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (state === 'missing-token') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>This verification link is missing a token.</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="link">Back to sign in</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Verification failed</CardTitle>
        <CardDescription>This verification link may be expired or invalid.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Link href="/login">
          <Button variant="link">Back to sign in</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function VerifyEmailFallback() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Verifying email</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
