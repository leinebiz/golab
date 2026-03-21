import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CertificateUploadForm } from './certificate-upload-form';

export const dynamic = 'force-dynamic';

async function getUploadableSubRequests() {
  return prisma.subRequest.findMany({
    where: {
      status: {
        in: ['TESTING_IN_PROGRESS', 'TESTING_COMPLETED', 'TESTING_DELAYED', 'RETURNED_TO_LAB'],
      },
    },
    select: {
      id: true,
      subReference: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

interface RecentCertificate {
  id: string;
  version: number;
  fileName: string;
  createdAt: Date;
  subReference: string;
}

async function getRecentCertificates(): Promise<RecentCertificate[]> {
  const rows = await prisma.certificate.findMany({
    take: 10,
    include: {
      subRequest: {
        select: { subReference: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const items: RecentCertificate[] = [];
  for (const cert of rows) {
    items.push({
      id: cert.id,
      version: cert.version,
      fileName: cert.fileName,
      createdAt: cert.createdAt,
      subReference: cert.subRequest.subReference,
    });
  }
  return items;
}

export default async function UploadResultsPage() {
  const [subRequests, recentCertificates] = await Promise.all([
    getUploadableSubRequests(),
    getRecentCertificates(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Upload Certificate</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upload New Certificate</h2>
          <CertificateUploadForm subRequests={subRequests} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Uploads</h2>
          {recentCertificates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No certificates uploaded yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentCertificates.map((cert: RecentCertificate) => (
                <Card key={cert.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{cert.subReference}</CardTitle>
                      <span className="text-xs text-gray-400">v{cert.version}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0">
                    <p className="text-sm text-gray-600">{cert.fileName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(cert.createdAt).toLocaleString('en-ZA')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
