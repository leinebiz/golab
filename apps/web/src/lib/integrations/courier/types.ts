import type { WaybillStatus } from '@golab/database';

// ============================================================
// Address
// ============================================================

export interface Address {
  contactName: string;
  companyName?: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email?: string;
}

// ============================================================
// Tracking
// ============================================================

export interface TrackingEvent {
  timestamp: Date;
  status: WaybillStatus;
  location?: string;
  description: string;
  rawPayload?: Record<string, unknown>;
}

// ============================================================
// Pickup & Waybill
// ============================================================

export interface PickupRequest {
  subRequestId: string;
  collectionAddress: Address;
  deliveryAddress: Address;
  packageDescription: string;
  /** ISO date for requested pickup */
  preferredDate?: string;
  /** Special instructions for the driver */
  instructions?: string;
}

export interface PickupResult {
  courierBookingId: string;
  waybillNumber: string;
  estimatedDelivery: Date;
  pdfUrl: string;
}

export interface TrackingResult {
  waybillNumber: string;
  currentStatus: WaybillStatus;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

// ============================================================
// Provider Interface
// ============================================================

export interface CourierProvider {
  readonly name: string;

  /** Book a pickup and return the waybill details */
  createPickup(request: PickupRequest): Promise<PickupResult>;

  /** Poll tracking status for a waybill */
  getTrackingStatus(waybillNumber: string): Promise<TrackingResult>;

  /** Cancel a previously booked pickup */
  cancelPickup(courierBookingId: string): Promise<void>;

  /** Verify an inbound webhook signature; returns true if valid */
  verifyWebhook(payload: string, signature: string): boolean;
}
