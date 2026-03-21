/**
 * Lab Routing Engine
 *
 * Routes test requests to the closest capable laboratories.
 * Supports multi-lab splitting when no single lab covers all requested tests.
 */

/** Geographic coordinates */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A lab with its location and test capabilities */
export interface RoutableLab {
  id: string;
  name: string;
  location: LatLng;
  /** IDs of tests this lab can perform */
  testCatalogueIds: string[];
}

/** A test requested by the customer */
export interface RequestedTest {
  testCatalogueId: string;
  sampleCount: number;
  accreditationRequired: boolean;
}

/** Routing assignment: which tests go to which lab */
export interface LabAssignment {
  labId: string;
  labName: string;
  distanceKm: number;
  tests: RequestedTest[];
}

/** Complete routing plan */
export interface RoutingPlan {
  assignments: LabAssignment[];
  /** Tests that could not be routed to any lab */
  unroutable: RequestedTest[];
  totalLabCount: number;
}

const EARTH_RADIUS_KM = 6371;

/** Convert degrees to radians */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the Haversine distance between two geographic points.
 * Returns distance in kilometers.
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinHalfLng * sinHalfLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Find the closest lab that can perform a given test.
 */
function findClosestCapableLab(
  testId: string,
  collectionLocation: LatLng,
  labs: RoutableLab[],
): { lab: RoutableLab; distanceKm: number } | null {
  let closest: { lab: RoutableLab; distanceKm: number } | null = null;

  for (const lab of labs) {
    if (!lab.testCatalogueIds.includes(testId)) continue;

    const dist = haversineDistance(collectionLocation, lab.location);
    if (!closest || dist < closest.distanceKm) {
      closest = { lab, distanceKm: dist };
    }
  }

  return closest;
}

/**
 * Route requested tests to the closest capable labs.
 *
 * Algorithm:
 * 1. For each requested test, find the closest lab that can perform it
 * 2. Group tests by assigned lab
 * 3. Return the routing plan with distances
 *
 * If a preferred lab is specified, it is used for all tests it can handle.
 * Remaining tests fall back to closest-capable routing.
 */
export function routeTests(
  requestedTests: RequestedTest[],
  collectionLocation: LatLng,
  availableLabs: RoutableLab[],
  preferredLabId?: string,
): RoutingPlan {
  const assignmentMap = new Map<string, LabAssignment>();
  const unroutable: RequestedTest[] = [];

  // If preferred lab exists, try to route as many tests as possible to it
  const preferredLab = preferredLabId
    ? availableLabs.find((l) => l.id === preferredLabId)
    : undefined;

  for (const test of requestedTests) {
    // Try preferred lab first
    if (preferredLab && preferredLab.testCatalogueIds.includes(test.testCatalogueId)) {
      const distanceKm = haversineDistance(collectionLocation, preferredLab.location);
      const existing = assignmentMap.get(preferredLab.id);
      if (existing) {
        existing.tests.push(test);
      } else {
        assignmentMap.set(preferredLab.id, {
          labId: preferredLab.id,
          labName: preferredLab.name,
          distanceKm: Math.round(distanceKm * 100) / 100,
          tests: [test],
        });
      }
      continue;
    }

    // Fall back to closest capable lab
    const match = findClosestCapableLab(test.testCatalogueId, collectionLocation, availableLabs);
    if (!match) {
      unroutable.push(test);
      continue;
    }

    const existing = assignmentMap.get(match.lab.id);
    if (existing) {
      existing.tests.push(test);
    } else {
      assignmentMap.set(match.lab.id, {
        labId: match.lab.id,
        labName: match.lab.name,
        distanceKm: Math.round(match.distanceKm * 100) / 100,
        tests: [test],
      });
    }
  }

  const assignments = Array.from(assignmentMap.values()).sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );

  return {
    assignments,
    unroutable,
    totalLabCount: assignments.length,
  };
}
