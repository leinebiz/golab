'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Shield,
  FlaskConical,
  Building2,
} from 'lucide-react';
import { CreateRequestSchema } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { routeTests, type RoutableLab, type RoutingPlan } from '@/lib/workflow/lab-routing';
import { calculateQuote, type QuoteLabGroup, type QuoteResult } from '@/lib/workflow/quote-engine';

/** Form input type — mirrors the schema but with optional defaults as optional */
interface RequestTestFormValue {
  testCatalogueId: string;
  sampleCount: number;
  accreditationRequired?: boolean;
  tolerance?: {
    minValue?: number;
    maxValue?: number;
    unit: string;
    notes?: string;
  };
}

interface CreateRequestFormValues {
  tests: RequestTestFormValue[];
  collectionAddressId: string;
  preferredLabId?: string;
  turnaroundType: 'STANDARD' | 'EXPEDITED';
  specialInstructions?: string;
}

// ---------------------------------------------------------------------------
// Mock data — in production these come from API calls
// ---------------------------------------------------------------------------

interface CatalogueTest {
  id: string;
  code: string;
  name: string;
  category: string;
  accreditation: 'ACCREDITED' | 'NON_ACCREDITED';
  basePrice: string;
  expediteSurcharge: string | null;
  toleranceApplicable: boolean;
  toleranceUnit: string | null;
}

const MOCK_TEST_CATALOGUE: CatalogueTest[] = [
  {
    id: 'cltest001',
    code: 'W-PH',
    name: 'Water pH Analysis',
    category: 'Water',
    accreditation: 'ACCREDITED',
    basePrice: '150.00',
    expediteSurcharge: '75.00',
    toleranceApplicable: true,
    toleranceUnit: 'pH',
  },
  {
    id: 'cltest002',
    code: 'W-TDS',
    name: 'Total Dissolved Solids',
    category: 'Water',
    accreditation: 'ACCREDITED',
    basePrice: '220.00',
    expediteSurcharge: '110.00',
    toleranceApplicable: true,
    toleranceUnit: 'mg/L',
  },
  {
    id: 'cltest003',
    code: 'S-HM',
    name: 'Soil Heavy Metals',
    category: 'Soil',
    accreditation: 'ACCREDITED',
    basePrice: '480.00',
    expediteSurcharge: '240.00',
    toleranceApplicable: true,
    toleranceUnit: 'mg/kg',
  },
  {
    id: 'cltest004',
    code: 'F-MB',
    name: 'Food Microbiology Panel',
    category: 'Food',
    accreditation: 'ACCREDITED',
    basePrice: '350.00',
    expediteSurcharge: '175.00',
    toleranceApplicable: false,
    toleranceUnit: null,
  },
  {
    id: 'cltest005',
    code: 'E-AQ',
    name: 'Air Quality Assessment',
    category: 'Environmental',
    accreditation: 'NON_ACCREDITED',
    basePrice: '600.00',
    expediteSurcharge: null,
    toleranceApplicable: false,
    toleranceUnit: null,
  },
  {
    id: 'cltest006',
    code: 'C-VOC',
    name: 'Volatile Organic Compounds',
    category: 'Chemical',
    accreditation: 'ACCREDITED',
    basePrice: '520.00',
    expediteSurcharge: '260.00',
    toleranceApplicable: true,
    toleranceUnit: 'ppb',
  },
];

const MOCK_LABS: RoutableLab[] = [
  {
    id: 'cllab001',
    name: 'Johannesburg Central Lab',
    location: { lat: -26.2041, lng: 28.0473 },
    testCatalogueIds: ['cltest001', 'cltest002', 'cltest003', 'cltest004', 'cltest006'],
  },
  {
    id: 'cllab002',
    name: 'Cape Town Lab',
    location: { lat: -33.9249, lng: 18.4241 },
    testCatalogueIds: ['cltest001', 'cltest002', 'cltest004', 'cltest005'],
  },
  {
    id: 'cllab003',
    name: 'Durban Lab',
    location: { lat: -29.8587, lng: 31.0218 },
    testCatalogueIds: ['cltest001', 'cltest003', 'cltest005', 'cltest006'],
  },
];

interface MockAddress {
  id: string;
  label: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  location: { lat: number; lng: number };
}

const MOCK_ADDRESSES: MockAddress[] = [
  {
    id: 'claddr001',
    label: 'Head Office',
    line1: '123 Main Road',
    city: 'Johannesburg',
    province: 'Gauteng',
    postalCode: '2001',
    location: { lat: -26.2041, lng: 28.0473 },
  },
  {
    id: 'claddr002',
    label: 'Warehouse',
    line1: '45 Industrial Drive',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '7441',
    location: { lat: -33.9249, lng: 18.4241 },
  },
];

const MOCK_DEFAULT_TOLERANCES: Record<
  string,
  { minValue?: number; maxValue?: number; unit: string }
> = {
  cltest001: { minValue: 6.5, maxValue: 8.5, unit: 'pH' },
  cltest002: { minValue: 0, maxValue: 500, unit: 'mg/L' },
};

// ---------------------------------------------------------------------------
// Wizard steps
// ---------------------------------------------------------------------------

const STEPS = [
  { number: 1, title: 'Select Tests', description: 'Choose tests and sample counts' },
  { number: 2, title: 'Tolerances', description: 'Set tolerance limits per test' },
  { number: 3, title: 'Lab Preference', description: 'Auto-route or choose a lab' },
  { number: 4, title: 'Turnaround', description: 'Standard or expedited' },
  { number: 5, title: 'Collection Address', description: 'Where to pick up samples' },
  { number: 6, title: 'Review & Submit', description: 'Confirm and submit' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewRequestPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [testSearch, setTestSearch] = useState('');
  const [labPreference, setLabPreference] = useState<'auto' | 'manual'>('auto');
  const [routingPlan, setRoutingPlan] = useState<RoutingPlan | null>(null);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);

  const form = useForm<CreateRequestFormValues>({
    resolver: zodResolver(CreateRequestSchema),
    defaultValues: {
      tests: [],
      turnaroundType: 'STANDARD',
      specialInstructions: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tests',
  });

  const watchedTests = form.watch('tests');
  const watchedTurnaround = form.watch('turnaroundType');
  const watchedAddress = form.watch('collectionAddressId');
  const watchedPreferredLab = form.watch('preferredLabId');

  // Filtered test catalogue based on search
  const filteredTests = useMemo(() => {
    if (!testSearch) return MOCK_TEST_CATALOGUE;
    const lower = testSearch.toLowerCase();
    return MOCK_TEST_CATALOGUE.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.code.toLowerCase().includes(lower) ||
        t.category.toLowerCase().includes(lower),
    );
  }, [testSearch]);

  // Already-selected test IDs
  const selectedTestIds = useMemo(
    () => new Set(watchedTests.map((t) => t.testCatalogueId)),
    [watchedTests],
  );

  // O(1) lookup for test catalogue entries
  const testCatalogueMap = useMemo(() => new Map(MOCK_TEST_CATALOGUE.map((t) => [t.id, t])), []);

  // Compute routing
  const computeRouting = useCallback(() => {
    const address = MOCK_ADDRESSES.find((a) => a.id === watchedAddress);
    if (!address || watchedTests.length === 0) return null;

    const requestedTests = watchedTests.map((t) => ({
      testCatalogueId: t.testCatalogueId,
      sampleCount: t.sampleCount,
      accreditationRequired: t.accreditationRequired ?? false,
    }));

    const plan = routeTests(
      requestedTests,
      address.location,
      MOCK_LABS,
      labPreference === 'manual' ? watchedPreferredLab : undefined,
    );
    setRoutingPlan(plan);
    return plan;
  }, [watchedAddress, watchedTests, labPreference, watchedPreferredLab]);

  // Step navigation
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return watchedTests.length > 0;
      case 2:
      case 3:
        return true;
      case 4:
        return !!watchedTurnaround;
      case 5:
        return !!watchedAddress;
      case 6:
        return true;
      default:
        return false;
    }
  }, [currentStep, watchedTests, watchedTurnaround, watchedAddress]);

  const goNext = useCallback(() => {
    if (currentStep === 5) {
      const plan = computeRouting();
      if (plan) {
        const labGroups: QuoteLabGroup[] = plan.assignments.map((a) => ({
          labId: a.labId,
          labName: a.labName,
          tests: a.tests.map((t) => {
            const entry = testCatalogueMap.get(t.testCatalogueId);
            return {
              testCatalogueId: t.testCatalogueId,
              testName: entry?.name ?? 'Unknown Test',
              sampleCount: t.sampleCount,
              basePrice: entry?.basePrice ?? '0.00',
              expediteSurcharge: entry?.expediteSurcharge ?? null,
            };
          }),
        }));
        setQuoteResult(calculateQuote(labGroups, watchedTurnaround, 'DEMO', 1));
      }
    }
    if (currentStep < 6) setCurrentStep((s) => s + 1);
  }, [currentStep, computeRouting, watchedTurnaround, testCatalogueMap]);

  const goBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const onSubmit = useCallback(
    (data: CreateRequestFormValues) => {
      console.log('Submitting request:', { data, routingPlan, quoteResult });
      alert(
        'Request submitted successfully! Reference: ' + (quoteResult?.referenceNumber ?? 'N/A'),
      );
    },
    [routingPlan, quoteResult],
  );

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderStepIndicator() {
    return (
      <nav aria-label="Wizard progress" className="mb-8">
        <ol className="flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.number === currentStep;
            const isComplete = step.number < currentStep;
            return (
              <li key={step.number} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isComplete
                      ? 'bg-green-600 text-white'
                      : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step.number}
                </div>
                <span
                  className={`hidden sm:inline text-sm ${
                    isActive ? 'font-medium text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300" />}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  function renderStep1TestSelection() {
    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="test-search">Search Tests</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="test-search"
              placeholder="Search by name, code, or category..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-3">
          {filteredTests.map((test) => {
            const isSelected = selectedTestIds.has(test.id);
            return (
              <Card
                key={test.id}
                className={isSelected ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">{test.name}</div>
                      <div className="text-sm text-gray-500">
                        {test.code} &middot; {test.category} &middot; R{test.basePrice}
                      </div>
                    </div>
                    {test.accreditation === 'ACCREDITED' && (
                      <Badge variant="success">
                        <Shield className="mr-1 h-3 w-3" />
                        Accredited
                      </Badge>
                    )}
                  </div>
                  {isSelected ? (
                    <Badge variant="default">Added</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        append({
                          testCatalogueId: test.id,
                          sampleCount: 1,
                          accreditationRequired: test.accreditation === 'ACCREDITED',
                        })
                      }
                    >
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {fields.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Selected Tests ({fields.length})</h3>
            {fields.map((field, index) => {
              const catalogueEntry = testCatalogueMap.get(field.testCatalogueId);
              return (
                <Card key={field.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <div className="font-medium">{catalogueEntry?.name}</div>
                      <div className="text-sm text-gray-500">{catalogueEntry?.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`sample-count-${index}`} className="text-sm">
                        Samples:
                      </Label>
                      <Input
                        id={`sample-count-${index}`}
                        type="number"
                        min={1}
                        max={1000}
                        className="w-20"
                        {...form.register(`tests.${index}.sampleCount`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {form.formState.errors.tests && (
          <p className="text-sm text-red-600">{form.formState.errors.tests.message}</p>
        )}
      </div>
    );
  }

  function renderStep2Tolerances() {
    const hasApplicableTests = watchedTests.some(
      (t) => testCatalogueMap.get(t.testCatalogueId)?.toleranceApplicable,
    );

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Set tolerance limits for applicable tests. Defaults from your organization profile are
          pre-filled where available.
        </p>
        {watchedTests.map((test, index) => {
          const catalogueEntry = testCatalogueMap.get(test.testCatalogueId);
          if (!catalogueEntry?.toleranceApplicable) return null;

          const defaultTol = MOCK_DEFAULT_TOLERANCES[test.testCatalogueId];
          const unit = catalogueEntry.toleranceUnit ?? '';

          return (
            <Card key={test.testCatalogueId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{catalogueEntry.name}</CardTitle>
                <CardDescription>Unit: {unit}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`tol-min-${index}`}>Min Value</Label>
                  <Input
                    id={`tol-min-${index}`}
                    type="number"
                    step="any"
                    placeholder={defaultTol?.minValue?.toString() ?? 'No default'}
                    defaultValue={defaultTol?.minValue}
                    {...form.register(`tests.${index}.tolerance.minValue`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor={`tol-max-${index}`}>Max Value</Label>
                  <Input
                    id={`tol-max-${index}`}
                    type="number"
                    step="any"
                    placeholder={defaultTol?.maxValue?.toString() ?? 'No default'}
                    defaultValue={defaultTol?.maxValue}
                    {...form.register(`tests.${index}.tolerance.maxValue`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="hidden"
                    value={unit}
                    {...form.register(`tests.${index}.tolerance.unit`)}
                  />
                  <Label htmlFor={`tol-notes-${index}`}>Notes (optional)</Label>
                  <Input
                    id={`tol-notes-${index}`}
                    placeholder="Special tolerance notes..."
                    {...form.register(`tests.${index}.tolerance.notes`)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!hasApplicableTests && (
          <p className="text-sm text-gray-500 italic">
            None of the selected tests have configurable tolerances.
          </p>
        )}
      </div>
    );
  }

  function renderStep3LabPreference() {
    return (
      <div className="space-y-6">
        <RadioGroup
          value={labPreference}
          onValueChange={(v) => {
            setLabPreference(v as 'auto' | 'manual');
            if (v === 'auto') {
              form.setValue('preferredLabId', undefined);
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="auto" id="lab-auto" />
            <Label htmlFor="lab-auto" className="cursor-pointer">
              <div>
                <div className="font-medium">Auto-route to closest lab</div>
                <div className="text-sm text-gray-500">
                  We will select the nearest lab(s) that can perform your tests
                </div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="lab-manual" />
            <Label htmlFor="lab-manual" className="cursor-pointer">
              <div>
                <div className="font-medium">Choose a preferred lab</div>
                <div className="text-sm text-gray-500">
                  Select a specific lab — tests it cannot perform will be auto-routed elsewhere
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {labPreference === 'manual' && (
          <div className="space-y-3">
            {MOCK_LABS.map((lab) => {
              const canHandle = watchedTests.filter((t) =>
                lab.testCatalogueIds.includes(t.testCatalogueId),
              );
              const coveragePercent =
                watchedTests.length > 0
                  ? Math.round((canHandle.length / watchedTests.length) * 100)
                  : 0;

              return (
                <Card
                  key={lab.id}
                  className={`cursor-pointer transition-colors ${watchedPreferredLab === lab.id ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'}`}
                  onClick={() => form.setValue('preferredLabId', lab.id)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{lab.name}</div>
                        <div className="text-sm text-gray-500">
                          Can perform {canHandle.length}/{watchedTests.length} selected tests (
                          {coveragePercent}%)
                        </div>
                      </div>
                    </div>
                    {coveragePercent === 100 ? (
                      <Badge variant="success">Full coverage</Badge>
                    ) : (
                      <Badge variant="warning">Partial</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderStep4Turnaround() {
    return (
      <div className="space-y-4">
        <Controller
          control={form.control}
          name="turnaroundType"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange}>
              <Card
                className={`cursor-pointer transition-colors ${field.value === 'STANDARD' ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'}`}
                onClick={() => field.onChange('STANDARD')}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <RadioGroupItem value="STANDARD" id="tat-standard" />
                  <Clock className="h-6 w-6 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium">Standard Turnaround</div>
                    <div className="text-sm text-gray-500">5-10 business days</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">Base pricing</div>
                    <div className="text-sm text-gray-500">No surcharge</div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${field.value === 'EXPEDITED' ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'}`}
                onClick={() => field.onChange('EXPEDITED')}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <RadioGroupItem value="EXPEDITED" id="tat-expedited" />
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <div className="flex-1">
                    <div className="font-medium">Expedited Turnaround</div>
                    <div className="text-sm text-gray-500">2-3 business days</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-yellow-600">+ Surcharge</div>
                    <div className="text-sm text-gray-500">Varies by test</div>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          )}
        />
      </div>
    );
  }

  function renderStep5Address() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Select a collection address from your organization or add a new one.
        </p>

        <Controller
          control={form.control}
          name="collectionAddressId"
          render={({ field }) => (
            <div className="space-y-3">
              {MOCK_ADDRESSES.map((addr) => (
                <Card
                  key={addr.id}
                  className={`cursor-pointer transition-colors ${field.value === addr.id ? 'border-blue-300 bg-blue-50' : 'hover:border-gray-300'}`}
                  onClick={() => field.onChange(addr.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <MapPin
                      className={`h-5 w-5 ${field.value === addr.id ? 'text-blue-600' : 'text-gray-400'}`}
                    />
                    <div>
                      <div className="font-medium">{addr.label}</div>
                      <div className="text-sm text-gray-500">
                        {addr.line1}, {addr.city}, {addr.province} {addr.postalCode}
                      </div>
                    </div>
                    {field.value === addr.id && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-blue-600" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        />

        {form.formState.errors.collectionAddressId && (
          <p className="text-sm text-red-600">Please select a collection address.</p>
        )}
      </div>
    );
  }

  function renderStep6Review() {
    const quote = quoteResult;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {watchedTests.map((test) => {
                const entry = testCatalogueMap.get(test.testCatalogueId);
                return (
                  <div key={test.testCatalogueId} className="flex justify-between text-sm">
                    <span>
                      {entry?.name}{' '}
                      {test.accreditationRequired && (
                        <Badge variant="success" className="ml-1 text-xs">
                          Accredited
                        </Badge>
                      )}
                    </span>
                    <span className="text-gray-500">{test.sampleCount} sample(s)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {routingPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Lab Routing</CardTitle>
              <CardDescription>{routingPlan.totalLabCount} lab(s) assigned</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routingPlan.assignments.map((a) => (
                  <div key={a.labId} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{a.labName}</span>
                      <span className="text-gray-500 ml-2">({a.distanceKm} km)</span>
                    </div>
                    <span className="text-gray-500">{a.tests.length} test(s)</span>
                  </div>
                ))}
                {routingPlan.unroutable.length > 0 && (
                  <p className="text-sm text-red-600">
                    {routingPlan.unroutable.length} test(s) could not be routed to any lab.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Turnaround</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {watchedTurnaround === 'EXPEDITED' ? (
                <>
                  <Zap className="h-4 w-4 text-yellow-500" /> Expedited (2-3 business days)
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-gray-400" /> Standard (5-10 business days)
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Address</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const addr = MOCK_ADDRESSES.find((a) => a.id === watchedAddress);
              return addr ? (
                <p className="text-sm">
                  {addr.label} — {addr.line1}, {addr.city}, {addr.province}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not selected</p>
              );
            })()}
          </CardContent>
        </Card>

        {quote && (
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
              <CardDescription>Reference: {quote.referenceNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {quote.lineItems.map((li, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {li.testName} ({li.sampleCount}x @ R{li.unitPrice})
                    </span>
                    <span>R{li.lineTotal}</span>
                  </div>
                ))}
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R{quote.subtotal}</span>
                </div>
                {quote.expediteSurchargeTotal !== '0.00' && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Expedite Surcharge</span>
                    <span>R{quote.expediteSurchargeTotal}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Logistics ({routingPlan?.totalLabCount ?? 1} lab(s))</span>
                  <span>R{quote.logisticsCost}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (15%)</span>
                  <span>R{quote.vatAmount}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>R{quote.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <Label htmlFor="special-instructions">Special Instructions (optional)</Label>
          <Textarea
            id="special-instructions"
            placeholder="Any special handling, timing, or delivery notes..."
            className="mt-1"
            {...form.register('specialInstructions')}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const stepContent: Record<number, () => React.ReactNode> = {
    1: renderStep1TestSelection,
    2: renderStep2Tolerances,
    3: renderStep3LabPreference,
    4: renderStep4Turnaround,
    5: renderStep5Address,
    6: renderStep6Review,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Test Request</h1>
        <p className="text-gray-500">Submit a new sample testing request</p>
      </div>

      {renderStepIndicator()}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>{stepContent[currentStep]()}</CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {currentStep < 6 ? (
            <Button type="button" onClick={goNext} disabled={!canProceed()}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit">Submit Request</Button>
          )}
        </div>
      </form>
    </div>
  );
}
