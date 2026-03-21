import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AcceptSampleButton } from './accept-sample-button';

export const dynamic = 'force-dynamic';

interface IncomingSample {
  id: string;
  subReference: string;
  customerName: string;
  testNames: string;
  totalSamples: number;
  deliveryDate: Date | null;
}

async function getIncomingSamples(): Promise<IncomingSample[]> {
  const rows = await prisma.subRequest.findMany({
    where: { status: 'DELIVERED_TO_LAB' },
    include: {
      request: {
        include: {
          organization: { select: { name: true } },
        },
      },
      tests: {
        include: {
          testCatalogue: { select: { name: true } },
        },
      },
      waybill: { select: { estimatedDelivery: true, deliveredAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const items: IncomingSample[] = [];
  for (const sample of rows) {
    items.push({
      id: sample.id,
      subReference: sample.subReference,
      customerName: sample.request.organization.name,
      testNames: sample.tests
        .map((t: { testCatalogue: { name: string } }) => t.testCatalogue.name)
        .join(', '),
      totalSamples: sample.tests.reduce(
        (sum: number, t: { sampleCount: number }) => sum + t.sampleCount,
        0,
      ),
      deliveryDate: sample.waybill?.deliveredAt ?? sample.waybill?.estimatedDelivery ?? null,
    });
  }
  return items;
}

export default async function IncomingSamplesPage() {
  const samples = await getIncomingSamples();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incoming Samples</h1>
        <Badge variant="secondary">{samples.length} awaiting</Badge>
      </div>

      {samples.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No samples awaiting acceptance.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {samples.map((sample: IncomingSample) => (
            <Card key={sample.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{sample.subReference}</CardTitle>
                  <Badge>
                    {sample.totalSamples} sample{sample.totalSamples !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{sample.customerName}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Tests</p>
                  <p className="text-sm">{sample.testNames}</p>
                </div>
                {sample.deliveryDate && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Delivery Date</p>
                    <p className="text-sm">
                      {new Date(sample.deliveryDate).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                <div className="mt-auto pt-3">
                  <AcceptSampleButton subRequestId={sample.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
