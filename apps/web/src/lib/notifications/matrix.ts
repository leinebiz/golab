import type { NotificationEventType, NotificationMatrixEntry } from './types';

/**
 * Notification matrix: maps all 19 business-required event types to
 * channels and message templates.
 *
 * Portal is always included. Email and WhatsApp are added for
 * customer-facing events that warrant out-of-band notification.
 */
export const notificationMatrix: Record<NotificationEventType, NotificationMatrixEntry> = {
  // ── Onboarding ─────────────────────────────────────
  'profile.created': {
    title: () => 'Welcome to GoLab',
    body: (d) =>
      `Your profile for ${d.organizationName ?? 'your organization'} has been created. Complete your setup to start requesting tests.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Credit ─────────────────────────────────────────
  'credit.submitted': {
    title: () => 'Credit Application Submitted',
    body: (d) =>
      `Credit application for ${d.organizationName ?? 'your organization'} has been submitted and is under review.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'credit.approved': {
    title: () => 'Credit Application Approved',
    body: (d) =>
      `Your credit application for ${d.organizationName ?? 'your organization'} has been approved with a limit of ${d.creditLimit ?? 'N/A'}.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'credit.declined': {
    title: () => 'Credit Application Declined',
    body: (d) =>
      `Your credit application for ${d.organizationName ?? 'your organization'} was not approved. Please contact support for details.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Quoting ────────────────────────────────────────
  'quote.ready': {
    title: () => 'Quote Ready for Review',
    body: (d) =>
      `Your quote for request ${d.requestRef ?? 'N/A'} is ready. Please review and accept to proceed.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'quote.accepted': {
    title: () => 'Quote Accepted',
    body: (d) => `Quote for request ${d.requestRef ?? 'N/A'} has been accepted.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Payments & Invoicing ───────────────────────────
  'payment_link.issued': {
    title: () => 'Payment Link Ready',
    body: (d) =>
      `A payment link for request ${d.requestRef ?? 'N/A'} has been sent. Please complete payment to proceed.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'payment.confirmed': {
    title: () => 'Payment Confirmed',
    body: (d) =>
      `Payment for request ${d.requestRef ?? 'N/A'} has been confirmed. Testing will begin shortly.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'invoice.generated': {
    title: () => 'Invoice Generated',
    body: (d) =>
      `Invoice ${d.invoiceRef ?? ''} has been generated for request ${d.requestRef ?? 'N/A'}.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Logistics ──────────────────────────────────────
  'collection.scheduled': {
    title: () => 'Collection Scheduled',
    body: (d) =>
      `Courier collection for request ${d.requestRef ?? 'N/A'} has been scheduled. Please have samples ready.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'waybill.available': {
    title: () => 'Waybill Available',
    body: (d) =>
      `The waybill for request ${d.requestRef ?? 'N/A'} is ready for printing. Access it from your documents panel.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'sample.collected': {
    title: () => 'Sample Collected',
    body: (d) =>
      `Samples for request ${d.requestRef ?? 'N/A'} have been collected and are in transit.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'sample.delivered': {
    title: () => 'Sample Delivered to Lab',
    body: (d) =>
      `Samples for request ${d.requestRef ?? 'N/A'} have been delivered to the laboratory.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Laboratory ─────────────────────────────────────
  'lab.accepted_sample': {
    title: () => 'Lab Accepted Sample',
    body: (d) =>
      `The laboratory has accepted samples for request ${d.requestRef ?? 'N/A'}. Testing will commence shortly.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'sample.exception': {
    title: () => 'Sample Issue Reported',
    body: (d) =>
      `An issue was reported with samples for request ${d.requestRef ?? 'N/A'}: ${d.issueDescription ?? 'See details in portal.'}`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'testing.delayed': {
    title: () => 'Testing Delayed',
    body: (d) =>
      `Testing for request ${d.requestRef ?? 'N/A'} has been delayed. ${d.reason ? `Reason: ${d.reason}` : 'Check portal for details.'}`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'testing.completed': {
    title: () => 'Testing Completed',
    body: (d) =>
      `Testing for request ${d.requestRef ?? 'N/A'} is complete. Results are being reviewed by GoLab.`,
    channels: ['PORTAL', 'EMAIL'],
  },

  // ── Review & Release ───────────────────────────────
  'certificate.awaiting_review': {
    title: () => 'Certificate Awaiting Review',
    body: (d) =>
      `A certificate for request ${d.requestRef ?? 'N/A'} has been uploaded and is awaiting GoLab review.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'results.ready': {
    title: () => 'Results Ready',
    body: (d) =>
      `Test results for request ${d.requestRef ?? 'N/A'} have been approved and are now available in the portal.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },

  // ── Customer Actions ───────────────────────────────
  'customer.action_required': {
    title: () => 'Action Required',
    body: (d) =>
      `Your input is needed for request ${d.requestRef ?? 'N/A'}. Please review the results and choose how to proceed.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'request.closed': {
    title: () => 'Request Closed',
    body: (d) =>
      `Request ${d.requestRef ?? 'N/A'} has been closed. All documents are available in your certificate repository.`,
    channels: ['PORTAL', 'EMAIL'],
  },
};
