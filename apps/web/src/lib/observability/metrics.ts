import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('golab-portal', '0.0.1');

// ── Counters ────────────────────────────────────────────────

/** Total lab test requests created */
export const requestsCreatedTotal = meter.createCounter('golab.requests_created_total', {
  description: 'Total number of lab test requests created',
  unit: '{request}',
});

/** Total request state transitions */
export const transitionsTotal = meter.createCounter('golab.transitions_total', {
  description: 'Total number of request state transitions',
  unit: '{transition}',
});

/** Total notifications sent (email, SMS, push) */
export const notificationsSentTotal = meter.createCounter('golab.notifications_sent_total', {
  description: 'Total number of notifications sent',
  unit: '{notification}',
});

/** Total payments received */
export const paymentsReceivedTotal = meter.createCounter('golab.payments_received_total', {
  description: 'Total number of payments received',
  unit: '{payment}',
});

// ── Histograms ──────────────────────────────────────────────

/** Time from request creation to completion */
export const requestProcessingDuration = meter.createHistogram(
  'golab.request_processing_duration_seconds',
  {
    description: 'Duration from request creation to completion',
    unit: 's',
    advice: {
      explicitBucketBoundaries: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
    },
  },
);

/** API endpoint response time */
export const apiRequestDuration = meter.createHistogram(
  'golab.api_request_duration_seconds',
  {
    description: 'API request duration',
    unit: 's',
    advice: {
      explicitBucketBoundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    },
  },
);

/** Time from certificate upload to review completion */
export const certificateReviewDuration = meter.createHistogram(
  'golab.certificate_review_duration_seconds',
  {
    description: 'Duration of certificate review process',
    unit: 's',
    advice: {
      explicitBucketBoundaries: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
    },
  },
);

// ── Gauges ──────────────────────────────────────────────────

/** Currently active (non-terminal) requests */
export const activeRequestsCount = meter.createGauge('golab.active_requests_count', {
  description: 'Number of currently active requests',
  unit: '{request}',
});

/** Requests awaiting review */
export const pendingReviewsCount = meter.createGauge('golab.pending_reviews_count', {
  description: 'Number of requests pending review',
  unit: '{request}',
});

/** BullMQ queue depth */
export const queueDepth = meter.createGauge('golab.queue_depth', {
  description: 'Current queue depth',
  unit: '{job}',
});
