'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type CreditStatus = 'NOT_APPLIED' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED' | 'SUSPENDED';

interface CreditApplication {
  id: string;
  organizationId: string;
  organizationName: string;
  status: CreditStatus;
  creditLimit: string;
  applicationDate: string;
  requestedLimit: string;
  reason: string;
}

const STATUS_VARIANT: Record<
  CreditStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  NOT_APPLIED: 'secondary',
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  DECLINED: 'destructive',
  SUSPENDED: 'destructive',
};

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(num);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PLACEHOLDER_APPLICATIONS: CreditApplication[] = [];

export default function CreditApplicationsPage() {
  const [applications] = useState<CreditApplication[]>(PLACEHOLDER_APPLICATIONS);
  const [selectedApp, setSelectedApp] = useState<CreditApplication | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [approvedLimit, setApprovedLimit] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const pendingApplications = applications.filter((a) => a.status === 'PENDING_REVIEW');
  const reviewedApplications = applications.filter((a) => a.status !== 'PENDING_REVIEW');

  function handleReview(action: 'approve' | 'decline') {
    setReviewAction(action);
    if (action === 'approve' && selectedApp) {
      setApprovedLimit(selectedApp.requestedLimit);
    }
  }

  async function submitReview() {
    if (!selectedApp || !reviewAction) return;
    setSelectedApp(null);
    setReviewAction(null);
    setApprovedLimit('');
    setReviewNotes('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit Applications</h1>
        <p className="text-gray-500">Review and manage customer credit applications</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {applications.filter((a) => a.status === 'APPROVED').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Declined / Suspended</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {
                applications.filter((a) => a.status === 'DECLINED' || a.status === 'SUSPENDED')
                  .length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {selectedApp && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewing: {selectedApp.organizationName}</CardTitle>
            <CardDescription>
              Applied on {formatDate(selectedApp.applicationDate)} -- Requested{' '}
              {formatCurrency(selectedApp.requestedLimit)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Organization</p>
                <p className="font-medium">{selectedApp.organizationName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested Limit</p>
                <p className="font-medium">{formatCurrency(selectedApp.requestedLimit)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Reason</p>
                <p>{selectedApp.reason}</p>
              </div>
            </div>

            {reviewAction === null && (
              <div className="flex gap-2">
                <Button
                  onClick={() => handleReview('approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => handleReview('decline')}>
                  Decline
                </Button>
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Cancel
                </Button>
              </div>
            )}

            {reviewAction === 'approve' && (
              <div className="max-w-lg space-y-4">
                <div>
                  <label
                    htmlFor="approvedLimit"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Approved Credit Limit (ZAR)
                  </label>
                  <Input
                    id="approvedLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={approvedLimit}
                    onChange={(e) => setApprovedLimit(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="approveNotes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Review Notes
                  </label>
                  <Textarea
                    id="approveNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={submitReview} className="bg-green-600 hover:bg-green-700">
                    Confirm Approval
                  </Button>
                  <Button variant="outline" onClick={() => setReviewAction(null)}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {reviewAction === 'decline' && (
              <div className="max-w-lg space-y-4">
                <div>
                  <label
                    htmlFor="declineNotes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Decline Reason
                  </label>
                  <Textarea
                    id="declineNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    required
                    rows={2}
                    placeholder="Reason for declining..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={submitReview}>
                    Confirm Decline
                  </Button>
                  <Button variant="outline" onClick={() => setReviewAction(null)}>
                    Back
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>Applications awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplications.length === 0 ? (
            <p className="text-sm text-gray-500">No pending applications.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Requested Limit</th>
                    <th className="pb-2 pr-4">Applied</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApplications.map((app) => (
                    <tr key={app.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{app.organizationName}</td>
                      <td className="py-3 pr-4 font-mono">{formatCurrency(app.requestedLimit)}</td>
                      <td className="py-3 pr-4">{formatDate(app.applicationDate)}</td>
                      <td className="py-3">
                        <Button size="sm" onClick={() => setSelectedApp(app)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewed Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewedApplications.length === 0 ? (
            <p className="text-sm text-gray-500">No reviewed applications.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Organization</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Limit</th>
                    <th className="pb-2 pr-4">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewedApplications.map((app) => (
                    <tr key={app.id} className="border-b">
                      <td className="py-3 pr-4 font-medium">{app.organizationName}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={STATUS_VARIANT[app.status]}>
                          {app.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono">{formatCurrency(app.creditLimit)}</td>
                      <td className="py-3 pr-4">{formatDate(app.applicationDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
