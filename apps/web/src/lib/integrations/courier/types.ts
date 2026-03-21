import type { WaybillStatus } from '@golab/database';

/**
 * Address structure for pickup/delivery locations.
 */
export interface CourierAddress {
  contactName: string;
  contactPhone: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

/**
 * Request to create a courier pickup.
 */
export interface PickupRequest {
  /** Internal reference for correlation */
  subRequestId: string;
  /** Human-readable reference (e.g. sub-request reference) */
  reference: string;
  collectionAddress: CourierAddress;
  deliveryAddress: CourierAddress;
  /** Number of parcels */
  parcelCount: number;
  /** Total weight in kg */
  weightKg: number;
  /** Special handling instructions */
  instructions?: string;
  /** Requested pickup date (ISO string) */
  preferredPickupDate?: string;
}

/**
 * Response from a successful pickup creation.
 */
export interface WaybillResponse {
  /** Courier's booking/reference ID */
  courierBookingId: string;
  /** Waybill number for tracking */
  waybillNumber: string;
  /** Estimated delivery date */
  estimatedDelivery: Date;
  /** URL to track the shipment on the courier's site */
  trackingUrl?: string;
}

/**
 * A single event in the tracking history.
 */
export interface TrackingEvent {
  /** ISO timestamp of the event */
  timestamp: string;
  /** Machine-readable status code */
  status: WaybillStatus;
  /** Human-readable description */
  description: string;
  /** Location where the event occurred */
  location?: string;
}

/**
 * Current tracking status of a shipment.
 */
export interface TrackingStatus {
  waybillNumber: string;
  currentStatus: WaybillStatus;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

/**
 * Abstraction over courier service providers.
 */
export interface CourierProvider {
  readonly name: string;

  /** Book a pickup and get a waybill */
  createPickup(request: PickupRequest): Promise<WaybillResponse>;

  /** Get a waybill label as PDF bytes */
  getWaybill(waybillNumber: string): Promise<Buffer>;

  /** Get current tracking status and event history */
  trackShipment(waybillNumber: string): Promise<TrackingStatus>;

  /** Cancel a previously booked pickup */
  cancelPickup(courierBookingId: string): Promise<void>;
}
