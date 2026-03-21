import { describe, it, expect } from 'vitest';
import { haversineDistance, routeTests, type RoutableLab, type RequestedTest } from './lab-routing';

describe('haversineDistance', () => {
  it('returns 0 for the same point', () => {
    const point = { lat: -26.2041, lng: 28.0473 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('calculates distance between Johannesburg and Cape Town (~1260 km)', () => {
    const jhb = { lat: -26.2041, lng: 28.0473 };
    const cpt = { lat: -33.9249, lng: 18.4241 };
    const distance = haversineDistance(jhb, cpt);
    expect(distance).toBeGreaterThan(1200);
    expect(distance).toBeLessThan(1350);
  });

  it('calculates distance between Johannesburg and Durban (~500 km)', () => {
    const jhb = { lat: -26.2041, lng: 28.0473 };
    const dbn = { lat: -29.8587, lng: 31.0218 };
    const distance = haversineDistance(jhb, dbn);
    expect(distance).toBeGreaterThan(450);
    expect(distance).toBeLessThan(600);
  });
});

describe('routeTests', () => {
  const labs: RoutableLab[] = [
    {
      id: 'lab-jhb',
      name: 'Johannesburg Lab',
      location: { lat: -26.2041, lng: 28.0473 },
      testCatalogueIds: ['test-ph', 'test-tds'],
    },
    {
      id: 'lab-cpt',
      name: 'Cape Town Lab',
      location: { lat: -33.9249, lng: 18.4241 },
      testCatalogueIds: ['test-ph', 'test-metals'],
    },
    {
      id: 'lab-dbn',
      name: 'Durban Lab',
      location: { lat: -29.8587, lng: 31.0218 },
      testCatalogueIds: ['test-metals', 'test-voc'],
    },
  ];

  const collectionJhb = { lat: -26.2041, lng: 28.0473 };

  it('routes a single test to the closest capable lab', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-ph', sampleCount: 5, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs);

    expect(plan.assignments).toHaveLength(1);
    expect(plan.assignments[0].labId).toBe('lab-jhb');
    expect(plan.assignments[0].tests).toHaveLength(1);
    expect(plan.unroutable).toHaveLength(0);
  });

  it('splits tests across multiple labs when no single lab covers all', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-tds', sampleCount: 3, accreditationRequired: false },
      { testCatalogueId: 'test-voc', sampleCount: 2, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs);

    expect(plan.assignments).toHaveLength(2);
    expect(plan.totalLabCount).toBe(2);

    const jhbAssignment = plan.assignments.find((a) => a.labId === 'lab-jhb');
    const dbnAssignment = plan.assignments.find((a) => a.labId === 'lab-dbn');
    expect(jhbAssignment?.tests.map((t) => t.testCatalogueId)).toEqual(['test-tds']);
    expect(dbnAssignment?.tests.map((t) => t.testCatalogueId)).toEqual(['test-voc']);
  });

  it('marks tests as unroutable when no lab can perform them', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-unknown', sampleCount: 1, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs);

    expect(plan.assignments).toHaveLength(0);
    expect(plan.unroutable).toHaveLength(1);
    expect(plan.unroutable[0].testCatalogueId).toBe('test-unknown');
  });

  it('respects preferred lab for tests it can handle', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-ph', sampleCount: 5, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs, 'lab-cpt');

    expect(plan.assignments).toHaveLength(1);
    expect(plan.assignments[0].labId).toBe('lab-cpt');
  });

  it('falls back to auto-route for tests preferred lab cannot handle', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-ph', sampleCount: 5, accreditationRequired: false },
      { testCatalogueId: 'test-voc', sampleCount: 2, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs, 'lab-jhb');

    expect(plan.assignments).toHaveLength(2);
    const jhbAssignment = plan.assignments.find((a) => a.labId === 'lab-jhb');
    const dbnAssignment = plan.assignments.find((a) => a.labId === 'lab-dbn');
    expect(jhbAssignment?.tests.map((t) => t.testCatalogueId)).toEqual(['test-ph']);
    expect(dbnAssignment?.tests.map((t) => t.testCatalogueId)).toEqual(['test-voc']);
  });

  it('returns assignments sorted by distance', () => {
    const tests: RequestedTest[] = [
      { testCatalogueId: 'test-tds', sampleCount: 1, accreditationRequired: false },
      { testCatalogueId: 'test-voc', sampleCount: 1, accreditationRequired: false },
    ];

    const plan = routeTests(tests, collectionJhb, labs);

    expect(plan.assignments[0].distanceKm).toBeLessThanOrEqual(plan.assignments[1].distanceKm);
  });
});
