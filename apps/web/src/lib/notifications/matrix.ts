import type { NotificationEventType, NotificationMatrixEntry } from './types';

/**
 * Notification matrix: maps event types to channels and message templates.
 *
 * Portal is always included. Email and WhatsApp are added for
 * customer-facing events that warrant out-of-band notification.
 */
export const notificationMatrix: Record<NotificationEventType, NotificationMatrixEntry> = {
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
  'invoice.generated': {
    title: () => 'Invoice Generated',
    body: (d) =>
      `Invoice ${d.invoiceRef ?? ''} has been generated for request ${d.requestRef ?? 'N/A'}.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'payment.confirmed': {
    title: () => 'Payment Confirmed',
    body: (d) =>
      `Payment for request ${d.requestRef ?? 'N/A'} has been confirmed. Testing will begin shortly.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'credit.approved': {
    title: () => 'Credit Application Approved',
    body: (d) =>
      `Your credit application for ${d.organizationName ?? 'your organization'} has been approved.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'credit.declined': {
    title: () => 'Credit Application Declined',
    body: (d) =>
      `Your credit application for ${d.organizationName ?? 'your organization'} was not approved. Please contact support for details.`,
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
    channels: ['PORTAL'],
  },
  'sample.exception': {
    title: () => 'Sample Issue Reported',
    body: (d) =>
      `An issue was reported with samples for request ${d.requestRef ?? 'N/A'}: ${d.issueDescription ?? 'See details in portal.'}`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'testing.started': {
    title: () => 'Testing In Progress',
    body: (d) => `Testing has begun for request ${d.requestRef ?? 'N/A'}.`,
    channels: ['PORTAL'],
  },
  'testing.completed': {
    title: () => 'Testing Completed',
    body: (d) =>
      `Testing for request ${d.requestRef ?? 'N/A'} is complete. Results are being reviewed.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'results.ready': {
    title: () => 'Results Ready',
    body: (d) =>
      `Test results for request ${d.requestRef ?? 'N/A'} are now available in the portal.`,
    channels: ['PORTAL', 'EMAIL', 'WHATSAPP'],
  },
  'certificate.available': {
    title: () => 'Certificate Available',
    body: (d) => `The test certificate for request ${d.requestRef ?? 'N/A'} is ready for download.`,
    channels: ['PORTAL', 'EMAIL'],
  },
  'request.status_changed': {
    title: () => 'Request Status Updated',
    body: (d) => `Request ${d.requestRef ?? 'N/A'} status changed to ${d.newStatus ?? 'updated'}.`,
    channels: ['PORTAL'],
  },
};
