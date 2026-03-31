export interface TransitionContext {
  entityId: string;
  entityType: 'Request' | 'SubRequest';
  currentStatus: string;
  targetStatus: string;
  triggeredBy: {
    userId: string;
    role: string;
    type: 'user' | 'system' | 'webhook';
  };
  metadata?: Record<string, unknown>;
}

export interface StateTransition<TStatus extends string> {
  from: TStatus | TStatus[];
  to: TStatus;
  guard?: (context: TransitionContext) => Promise<boolean>;
  onTransition?: (context: TransitionContext) => Promise<void>;
  roles: string[];
}

export const REQUEST_TRANSITIONS: StateTransition<string>[] = [
  {
    from: 'DRAFT',
    to: 'QUOTE_CALCULATED',
    roles: ['SYSTEM'],
  },
  {
    from: 'QUOTE_CALCULATED',
    to: 'PENDING_CUSTOMER_REVIEW',
    roles: ['SYSTEM'],
  },
  {
    from: 'PENDING_CUSTOMER_REVIEW',
    to: 'ACCEPTED_BY_CUSTOMER',
    roles: ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  },
  {
    from: 'PENDING_CUSTOMER_REVIEW',
    to: 'CANCELLED',
    roles: ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  },
  {
    from: 'ACCEPTED_BY_CUSTOMER',
    to: 'INVOICE_GENERATED',
    roles: ['SYSTEM'],
  },
  {
    from: 'INVOICE_GENERATED',
    to: 'AWAITING_COD_PAYMENT',
    roles: ['SYSTEM'],
  },
  {
    from: 'INVOICE_GENERATED',
    to: 'CREDIT_APPROVED_FOR_REQUEST',
    roles: ['SYSTEM'],
  },
  {
    from: 'AWAITING_COD_PAYMENT',
    to: 'PAYMENT_RECEIVED',
    roles: ['SYSTEM', 'system'],
  },
  {
    from: ['PAYMENT_RECEIVED', 'CREDIT_APPROVED_FOR_REQUEST'],
    to: 'IN_PROGRESS',
    roles: ['SYSTEM'],
  },
  {
    from: 'IN_PROGRESS',
    to: 'PENDING_CUSTOMER_ACTION',
    roles: ['SYSTEM'],
  },
  {
    from: 'PENDING_CUSTOMER_ACTION',
    to: 'CLOSED',
    roles: ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  },
  {
    from: 'PENDING_CUSTOMER_ACTION',
    to: 'IN_PROGRESS',
    roles: ['CUSTOMER_ADMIN', 'CUSTOMER_USER'],
  },
  {
    from: ['DRAFT', 'PENDING_CUSTOMER_REVIEW', 'ACCEPTED_BY_CUSTOMER'],
    to: 'ON_HOLD',
    roles: ['GOLAB_ADMIN'],
  },
  {
    from: 'ON_HOLD',
    to: 'PENDING_CUSTOMER_REVIEW',
    roles: ['GOLAB_ADMIN'],
  },
];

export const SUB_REQUEST_TRANSITIONS: StateTransition<string>[] = [
  { from: 'PICKUP_REQUESTED', to: 'WAYBILL_AVAILABLE', roles: ['SYSTEM'] },
  { from: 'WAYBILL_AVAILABLE', to: 'PICKUP_SCHEDULED', roles: ['SYSTEM'] },
  { from: 'PICKUP_SCHEDULED', to: 'PICKUP_EXCEPTION', roles: ['SYSTEM'] },
  { from: 'PICKUP_SCHEDULED', to: 'AWAITING_COLLECTION', roles: ['SYSTEM'] },
  { from: 'AWAITING_COLLECTION', to: 'SAMPLE_COLLECTED', roles: ['SYSTEM'] },
  { from: 'SAMPLE_COLLECTED', to: 'IN_TRANSIT_TO_LAB', roles: ['SYSTEM'] },
  { from: 'IN_TRANSIT_TO_LAB', to: 'DELIVERED_TO_LAB', roles: ['SYSTEM'] },
  {
    from: 'DELIVERED_TO_LAB',
    to: 'SAMPLE_ACCEPTED_BY_LAB',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: ['SAMPLE_ACCEPTED_BY_LAB', 'TESTING_SCHEDULED', 'TESTING_IN_PROGRESS'],
    to: 'SAMPLE_EXCEPTION_LOGGED',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN', 'GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: ['SAMPLE_ACCEPTED_BY_LAB', 'SAMPLE_EXCEPTION_LOGGED'],
    to: 'TESTING_SCHEDULED',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN', 'GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: 'TESTING_SCHEDULED',
    to: 'TESTING_IN_PROGRESS',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: 'TESTING_IN_PROGRESS',
    to: 'TESTING_DELAYED',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: ['TESTING_IN_PROGRESS', 'TESTING_DELAYED'],
    to: 'TESTING_COMPLETED',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: 'TESTING_COMPLETED',
    to: 'AWAITING_GOLAB_REVIEW',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: 'AWAITING_GOLAB_REVIEW',
    to: 'APPROVED_FOR_RELEASE',
    roles: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: 'AWAITING_GOLAB_REVIEW',
    to: 'RETURNED_TO_LAB',
    roles: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: 'AWAITING_GOLAB_REVIEW',
    to: 'ON_HOLD_WITH_GOLAB',
    roles: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: 'RETURNED_TO_LAB',
    to: 'AWAITING_GOLAB_REVIEW',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
  {
    from: 'ON_HOLD_WITH_GOLAB',
    to: 'AWAITING_GOLAB_REVIEW',
    roles: ['GOLAB_ADMIN', 'GOLAB_REVIEWER'],
  },
  {
    from: 'APPROVED_FOR_RELEASE',
    to: 'RELEASED_TO_CUSTOMER',
    roles: ['SYSTEM'],
  },
  {
    from: 'DELIVERED_TO_LAB',
    to: 'SAMPLE_REJECTED',
    roles: ['LAB_ADMIN', 'LAB_TECHNICIAN'],
  },
];

export function findValidTransition<T extends string>(
  transitions: StateTransition<T>[],
  currentStatus: T,
  targetStatus: T,
  role: string,
): StateTransition<T> | null {
  return (
    transitions.find((t) => {
      const fromMatch = Array.isArray(t.from)
        ? t.from.includes(currentStatus)
        : t.from === currentStatus;
      return fromMatch && t.to === targetStatus && t.roles.includes(role);
    }) ?? null
  );
}
