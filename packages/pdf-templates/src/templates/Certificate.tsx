import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { GoLabHeader } from '../components/GoLabHeader';
import { GoLabFooter } from '../components/GoLabFooter';
import { commonStyles } from '../styles';

const certStyles = StyleSheet.create({
  accreditationBadge: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accreditedText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#166534',
  },
  accreditedDetail: {
    fontSize: 8,
    color: '#15803D',
  },
  notAccredited: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
  },
  notAccreditedText: {
    color: '#854D0E',
  },
  resultStatus: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  pass: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  fail: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#9CA3AF',
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6B7280',
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
});

export interface CertificateTestResult {
  testName: string;
  method: string;
  result: string;
  unit: string;
  tolerance?: string;
  status: 'pass' | 'fail';
}

export interface CertificateData {
  certificateNumber: string;
  date: string;
  requestNumber: string;
  customer: {
    name: string;
    contactPerson: string;
  };
  lab: {
    name: string;
    accreditationNumber?: string;
    isAccredited: boolean;
  };
  sampleInfo: {
    description: string;
    receivedDate: string;
    testedDate: string;
    sampleId: string;
  };
  results: CertificateTestResult[];
  reviewedBy?: string;
  approvedBy?: string;
}

export function Certificate({ data }: { data: CertificateData }) {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        <GoLabHeader
          documentType="Test Certificate"
          documentNumber={data.certificateNumber}
          date={data.date}
        />

        {/* Accreditation Status */}
        <View
          style={
            data.lab.isAccredited
              ? certStyles.accreditationBadge
              : [certStyles.accreditationBadge, certStyles.notAccredited]
          }
        >
          <View>
            <Text
              style={
                data.lab.isAccredited
                  ? certStyles.accreditedText
                  : [certStyles.accreditedText, certStyles.notAccreditedText]
              }
            >
              {data.lab.isAccredited ? 'SANAS Accredited' : 'Non-Accredited Testing'}
            </Text>
            <Text
              style={
                data.lab.isAccredited
                  ? certStyles.accreditedDetail
                  : [certStyles.accreditedDetail, certStyles.notAccreditedText]
              }
            >
              {data.lab.isAccredited
                ? `Accreditation No: ${data.lab.accreditationNumber ?? 'N/A'}`
                : 'Results are for informational purposes only'}
            </Text>
          </View>
        </View>

        {/* Customer & Sample Info */}
        <View style={[commonStyles.twoColumn, { marginTop: 16 }]}>
          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Customer</Text>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Company</Text>
              <Text style={commonStyles.value}>{data.customer.name}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Contact</Text>
              <Text style={commonStyles.value}>{data.customer.contactPerson}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Request No.</Text>
              <Text style={commonStyles.value}>{data.requestNumber}</Text>
            </View>
          </View>
          <View style={commonStyles.column}>
            <Text style={commonStyles.sectionTitle}>Sample Information</Text>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Sample ID</Text>
              <Text style={commonStyles.value}>{data.sampleInfo.sampleId}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Description</Text>
              <Text style={commonStyles.value}>{data.sampleInfo.description}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Received</Text>
              <Text style={commonStyles.value}>{data.sampleInfo.receivedDate}</Text>
            </View>
            <View style={commonStyles.row}>
              <Text style={commonStyles.label}>Tested</Text>
              <Text style={commonStyles.value}>{data.sampleInfo.testedDate}</Text>
            </View>
          </View>
        </View>

        {/* Lab Info */}
        <View style={{ marginTop: 12 }}>
          <Text style={commonStyles.sectionTitle}>Testing Laboratory</Text>
          <View style={commonStyles.row}>
            <Text style={commonStyles.label}>Lab Name</Text>
            <Text style={commonStyles.value}>{data.lab.name}</Text>
          </View>
        </View>

        {/* Test Results */}
        <View style={{ marginTop: 16 }}>
          <Text style={commonStyles.sectionTitle}>Test Results</Text>
          <View style={commonStyles.tableHeader}>
            <Text style={[commonStyles.tableHeaderCell, { flex: 2 }]}>Test</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1.5 }]}>Method</Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>
              Result
            </Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 0.5, textAlign: 'center' }]}>
              Unit
            </Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>
              Tolerance
            </Text>
            <Text style={[commonStyles.tableHeaderCell, { flex: 0.7, textAlign: 'center' }]}>
              Status
            </Text>
          </View>
          {data.results.map((result, i) => (
            <View key={i} style={commonStyles.tableRow}>
              <Text style={[commonStyles.tableCell, { flex: 2 }]}>{result.testName}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1.5 }]}>{result.method}</Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {result.result}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 0.5, textAlign: 'center' }]}>
                {result.unit}
              </Text>
              <Text style={[commonStyles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {result.tolerance ?? 'N/A'}
              </Text>
              <View style={{ flex: 0.7, alignItems: 'center' }}>
                <Text
                  style={[
                    certStyles.resultStatus,
                    result.status === 'pass' ? certStyles.pass : certStyles.fail,
                  ]}
                >
                  {result.status === 'pass' ? 'PASS' : 'FAIL'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Signatures */}
        <View style={certStyles.signatureSection}>
          {data.reviewedBy && (
            <View style={certStyles.signatureBlock}>
              <Text style={certStyles.signatureLabel}>Reviewed By</Text>
              <Text style={certStyles.signatureName}>{data.reviewedBy}</Text>
            </View>
          )}
          {data.approvedBy && (
            <View style={certStyles.signatureBlock}>
              <Text style={certStyles.signatureLabel}>Approved By</Text>
              <Text style={certStyles.signatureName}>{data.approvedBy}</Text>
            </View>
          )}
        </View>

        <GoLabFooter />
      </Page>
    </Document>
  );
}
