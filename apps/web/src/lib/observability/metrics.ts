import { metrics as otelMetrics } from '@opentelemetry/api';

// ---------------------------------------------------------------------------
// Meter — uses the global MeterProvider registered by the NodeSDK in
// instrumentation.ts.  When the SDK hasn't been initialised (e.g. in tests
// or edge runtime) the API returns a no-op meter, so calls are always safe.
// ---------------------------------------------------------------------------

const meter = otelMetrics.getMeter('golab-portal');

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

const requestsCreated = meter.createCounter('golab_requests_created', {
  description: 'Total testing requests created',
});

const requestsCompleted = meter.createCounter('golab_requests_completed', {
  description: 'Total testing requests completed',
});

const paymentsProcessed = meter.createCounter('golab_payments_processed', {
  description: 'Total payments processed via Stripe',
});

const certificatesUploaded = meter.createCounter(
  'golab_certificates_uploaded',
  {
    description: 'Total certificates uploaded by labs',
  },
);

const certificatesReviewed = meter.createCounter(
  'golab_certificates_reviewed',
  {
    description: 'Total certificates reviewed',
  },
);

const notificationsSent = meter.createCounter('golab_notifications_sent', {
  description: 'Total notifications sent (email, in-app)',
});

const webhookReceived = meter.createCounter('golab_webhook_received', {
  description: 'Total webhook events received',
});

// ---------------------------------------------------------------------------
// Histograms
// ---------------------------------------------------------------------------

const quoteCalculationDuration = meter.createHistogram(
  'golab_quote_calculation_duration_ms',
  {
    description: 'Duration of quote calculations in ms',
    unit: 'ms',
  },
);

const apiRequestDuration = meter.createHistogram(
  'golab_api_request_duration_ms',
  {
    description: 'Duration of API requests in ms',
    unit: 'ms',
  },
);

// ---------------------------------------------------------------------------
// Gauges (use UpDownCounter for OTel gauge semantics)
// ---------------------------------------------------------------------------

const requestsActive = meter.createUpDownCounter('golab_requests_active', {
  description: 'Number of currently active testing requests',
});

const reviewQueueDepth = meter.createUpDownCounter(
  'golab_review_queue_depth',
  {
    description: 'Current depth of the certificate review queue',
  },
);

// ---------------------------------------------------------------------------
// Helper functions — single import point for business code
// ---------------------------------------------------------------------------

export const metrics = {
  /** Record a new testing request created */
  requestCreated: (attrs?: Record<string, string>) =>
    requestsCreated.add(1, attrs),

  /** Record a testing request completed */
  requestCompleted: (attrs?: Record<string, string>) =>
    requestsCompleted.add(1, attrs),

  /** Record a payment processed */
  paymentProcessed: (attrs?: Record<string, string>) =>
    paymentsProcessed.add(1, attrs),

  /** Record a certificate uploaded */
  certificateUploaded: (attrs?: Record<string, string>) =>
    certificatesUploaded.add(1, attrs),

  /** Record a certificate reviewed */
  certificateReviewed: (attrs?: Record<string, string>) =>
    certificatesReviewed.add(1, attrs),

  /** Record a notification sent */
  notificationSent: (attrs?: Record<string, string>) =>
    notificationsSent.add(1, attrs),

  /** Record a webhook event received */
  webhookReceived: (attrs?: Record<string, string>) =>
    webhookReceived.add(1, attrs),

  /** Record quote calculation duration */
  recordQuoteCalculation: (
    durationMs: number,
    attrs?: Record<string, string>,
  ) => quoteCalculationDuration.record(durationMs, attrs),

  /** Record API request duration */
  recordApiRequest: (durationMs: number, attrs?: Record<string, string>) =>
    apiRequestDuration.record(durationMs, attrs),

  /** Increment active requests gauge */
  requestActivated: (attrs?: Record<string, string>) =>
    requestsActive.add(1, attrs),

  /** Decrement active requests gauge */
  requestDeactivated: (attrs?: Record<string, string>) =>
    requestsActive.add(-1, attrs),

  /** Increment review queue depth */
  reviewQueued: (attrs?: Record<string, string>) =>
    reviewQueueDepth.add(1, attrs),

  /** Decrement review queue depth */
  reviewDequeued: (attrs?: Record<string, string>) =>
    reviewQueueDepth.add(-1, attrs),
} as const;
